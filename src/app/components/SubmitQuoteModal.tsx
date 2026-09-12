// commit_quote flow. The taker seals a quote: sign the RFQ pubkey to derive the
// salt, ask the liquidity-guard to attest funds + sign the commit hash, verify
// that proof LOCALLY against the on-chain Config.liquidity_guard, back up the
// reveal inputs (localStorage + downloadable ticket), then submit commit_quote
// with the Ed25519 verify preinstruction. An invalid proof (or a commit-hash
// that doesn't match our own derivation) aborts BEFORE any transaction is built.

import { useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/app/components/ui/button";
import { ResponsiveModal } from "@/app/components/ResponsiveModal";
import { ProofInspector } from "@/app/components/ProofInspector";
import { TokenAmountInput } from "@/app/components/TokenAmountInput";
import { BondBreakdown } from "@/app/components/BondBreakdown";
import type { RFQ } from "@/types/rfq";
import { useRfqAccount } from "@/chain/accounts/rfq";
import { useConfigAccount } from "@/chain/accounts/config";
import { useSettlementProgram } from "@/chain/program";
import { useCluster } from "@/app/providers/ClusterProvider";
import { commitHash } from "@/chain/commitHash";
import { commitDeadline, revealDeadline } from "@/chain/state-machine";
import { totalToFund } from "@/chain/math";
import { formatDuration } from "@/app/lib/format";
import { useTokenBalanceState } from "@/app/hooks/useTokenBalanceState";
import { BetaTokenNotice } from "@/app/components/BetaTokenNotice";
import {
  deriveSalt,
  fetchAttestation,
  verifyAttestation,
  LiquidityGuardError,
} from "@/chain/liquidityGuard";
import { buildCommitQuoteTx } from "@/chain/instructions/taker";
import { useResolveTokenMeta } from "@/app/hooks/useResolveTokenMeta";
import { useNowSecs } from "@/app/hooks/useNowSecs";
import { bytesToHex, downloadTicket, saveTicket, type RevealTicket } from "@/app/lib/reveal-ticket";
import { toast } from "sonner";
import { AlertCircle, Download, Loader2, ShieldCheck } from "lucide-react";
import { useSubmitRfqTx } from "@/app/hooks/useSubmitRfqTx";

interface SubmitQuoteModalProps {
  rfq: RFQ;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Phase = "idle" | "attesting" | "submitting";

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

export function SubmitQuoteModal({ rfq, open, onOpenChange }: SubmitQuoteModalProps) {
  // The in-flight phase lives in the shell so closing can be blocked while a
  // commit is running; everything else is per-open state owned by the body,
  // which is keyed on `open` so closing/reopening starts from a clean slate
  // (no reset effect).
  const [phase, setPhase] = useState<Phase>("idle");
  const busy = phase !== "idle";
  const [base, quote] = rfq.pair.split("/");

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(o) => !busy && onOpenChange(o)}
      title={<span className="text-2xl font-bold">Commit a quote</span>}
      description={
        <>
          {rfq.pair} · you deliver {rfq.baseAmount.toLocaleString()} {base}, quote in {quote}
        </>
      }
      contentClassName="max-w-xl"
    >
      <SubmitQuoteBody
        key={open ? "open" : "closed"}
        rfq={rfq}
        phase={phase}
        setPhase={setPhase}
        onClose={() => onOpenChange(false)}
      />
    </ResponsiveModal>
  );
}

interface SubmitQuoteBodyProps {
  rfq: RFQ;
  phase: Phase;
  setPhase: (phase: Phase) => void;
  onClose: () => void;
}

function SubmitQuoteBody({ rfq, phase, setPhase, onClose }: SubmitQuoteBodyProps) {
  const program = useSettlementProgram();
  const wallet = useWallet();
  const { cluster } = useCluster();

  const pda = useMemo(() => {
    try {
      return new PublicKey(rfq.publicKey);
    } catch {
      return null;
    }
  }, [rfq.publicKey]);
  const accountQuery = useRfqAccount(pda);
  const account = accountQuery.data ?? null;
  const configQuery = useConfigAccount();
  const config = configQuery.data ?? null;
  const resolveToken = useResolveTokenMeta();
  const now = useNowSecs();
  const submit = useSubmitRfqTx();

  // The amount is the RFQ minimum until the user edits it; a "touched" draft
  // keeps an explicitly cleared field empty instead of snapping back.
  const [draft, setDraft] = useState<{ touched: boolean; value: bigint | null }>({
    touched: false,
    value: null,
  });
  const amount = draft.touched ? draft.value : (account?.minQuoteAmount ?? null);
  const [error, setError] = useState<string | null>(null);
  // Set when a commit attempt was aborted on the local bond-balance read (#67).
  const [bondGated, setBondGated] = useState(false);
  // Raw liquidity-guard rejection that pattern-matched a funds shortfall — the
  // guidance notice fronts it; the raw string stays behind a "details" line.
  const [guardShortfall, setGuardShortfall] = useState<string | null>(null);
  const [ticket, setTicket] = useState<RevealTicket | null>(null);

  // Local pre-signing reads (#67): the bond is posted in the RFQ's USDC mint
  // (the beta token); the guard additionally checks the quote mint. Gating on
  // the bond BEFORE deriveSalt/attestation saves a signMessage prompt + a
  // guard round-trip when the wallet obviously can't fund it.
  const bondState = useTokenBalanceState(account?.usdcMint ?? null, account?.bondAmount);
  const requiredQuote = account
    ? totalToFund(amount ?? account.minQuoteAmount, account.takerFeeBps)
    : undefined;
  const quoteState = useTokenBalanceState(account?.quoteMint ?? null, requiredQuote);
  const bondBlocked =
    bondState.status === "no-ata" ||
    bondState.status === "zero" ||
    bondState.status === "insufficient";
  const [attestation, setAttestation] = useState<{
    commitHash: Uint8Array;
    liquidityProof: Uint8Array;
  } | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const quoteMeta = account ? resolveToken(account.quoteMint.toBase58()) : null;
  const usdcMeta = account ? resolveToken(account.usdcMint.toBase58()) : null;
  const busy = phase !== "idle";

  async function handleCommit() {
    if (!program || !wallet.publicKey || !account || !pda || !config) {
      toast.error("Wallet or chain data not ready");
      return;
    }
    const taker = wallet.publicKey;
    if (amount === null || amount < account.minQuoteAmount) {
      setError(`Quote must be at least the RFQ minimum (${account.minQuoteAmount.toString()})`);
      return;
    }
    setError(null);
    setGuardShortfall(null);

    // Pre-signing gate (#67): abort before deriveSalt (a signMessage prompt)
    // and the guard round-trip when the bond obviously can't be posted.
    // Loading/error reads never block — the guard remains authoritative.
    if (bondBlocked) {
      setBondGated(true);
      return;
    }
    setBondGated(false);
    setPhase("attesting");
    try {
      // 1. salt = signMessage(rfq pubkey) — deterministic per (wallet, rfq).
      const salt = await deriveSalt(wallet, pda);

      // 2. Attestation (funds check + ed25519 signature over the commit hash).
      const att = await fetchAttestation(cluster, {
        rfq: pda,
        taker,
        salt,
        quoteMint: account.quoteMint,
        quoteAmount: amount,
        bondAmount: account.bondAmount,
        takerFeeBps: account.takerFeeBps,
      });

      // 3. Local preflight: our commit hash MUST equal the service's.
      const local = await commitHash({
        salt,
        rfq: pda,
        taker,
        quoteMint: account.quoteMint,
        quoteAmount: amount,
        bondAmount: account.bondAmount,
        takerFeeBps: account.takerFeeBps,
      });
      if (!bytesEqual(local.hash, att.commitHash)) {
        throw new Error("Commit hash mismatch — refusing to submit (client/service disagree).");
      }

      // 4. Verify the proof locally against on-chain Config.liquidity_guard.
      if (!verifyAttestation(att.commitHash, att.liquidityProof, config.liquidityGuard)) {
        throw new Error("Liquidity proof failed verification — not submitting.");
      }

      // 5. Back up the reveal inputs (both stores) BEFORE the tx.
      const t: RevealTicket = {
        version: 1,
        rfq: pda.toBase58(),
        taker: taker.toBase58(),
        quoteMint: account.quoteMint.toBase58(),
        salt: bytesToHex(salt),
        quoteAmount: amount.toString(),
        bondAmount: account.bondAmount.toString(),
        takerFeeBps: account.takerFeeBps,
      };
      saveTicket(t);
      setTicket(t);
      setAttestation({ commitHash: att.commitHash, liquidityProof: att.liquidityProof });

      // 6. Submit commit_quote (Ed25519 verify preinstruction + the ix).
      setPhase("submitting");
      await submit.mutateAsync({
        rfq: pda,
        build: () =>
          buildCommitQuoteTx({
            program,
            taker,
            rfq: pda,
            usdcMint: account.usdcMint,
            commitHash: att.commitHash,
            liquidityProof: att.liquidityProof,
            liquidityGuardPubkey: config.liquidityGuard,
            facilitator: null,
          }),
        pendingMessage: "Committing quote…",
        successMessage: "Quote committed — keep your reveal ticket safe",
      });
      toast.success("Save your reveal ticket", {
        description: "You need it to reveal. It's stored locally — download a copy as backup.",
      });
      // Leave the modal open so the taker can grab the download; they close it.
      setPhase("idle");
    } catch (err) {
      setPhase("idle");
      // A guard rejection that reads like a funds shortfall gets the beta
      // token guidance (quote-mint context) instead of the raw string — the
      // raw message stays available behind the collapsed details line.
      if (
        err instanceof LiquidityGuardError &&
        err.status !== 429 &&
        /insufficient|balance|funds/i.test(err.message)
      ) {
        setGuardShortfall(err.message);
        return;
      }
      const message =
        err instanceof LiquidityGuardError
          ? err.status === 429
            ? "Liquidity-guard is rate-limited — wait a moment and retry."
            : `Liquidity-guard rejected the quote: ${err.message}`
          : err instanceof Error
            ? err.message
            : "Failed to commit quote";
      setError(message);
    }
  }

  const quote = rfq.pair.split("/")[1];

  return (
    <>
      {!account ? (
        <div className="py-8 text-center text-white/50">Loading RFQ…</div>
      ) : (
        <div className="mt-4 space-y-6">
          <div className="space-y-2">
            <label className="text-sm text-white/80">Your quote amount ({quote})</label>
            <TokenAmountInput
              mint={account.quoteMint.toBase58()}
              value={amount}
              onChange={(v) => setDraft({ touched: true, value: v })}
            />
            <p className="text-xs text-white/40">
              Minimum {account.minQuoteAmount.toString()} base units. Higher is more competitive.
            </p>
          </div>

          {quoteMeta && usdcMeta && (
            <BondBreakdown
              bondAmount={account.bondAmount}
              bondSymbol={usdcMeta.symbol}
              bondDecimals={usdcMeta.decimals}
              quoteAmount={amount ?? account.minQuoteAmount}
              quoteSymbol={quoteMeta.symbol}
              quoteDecimals={quoteMeta.decimals}
              takerFeeBps={account.takerFeeBps}
              facilitatorFeeBps={config?.facilitatorFeeBps ?? 0}
            />
          )}

          <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-white/80">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
            <span>
              Committing signs a message, runs a funds check, and posts your bond. You'll reveal the
              amount later — keep the reveal ticket.
              {(() => {
                const commitBy = commitDeadline(account);
                const revealBy = revealDeadline(account);
                if (commitBy === null || revealBy === null) return null;
                return (
                  <>
                    {" "}
                    Commits close in {formatDuration(Math.max(0, commitBy - now))}; once committed,
                    you'll need to reveal within {formatDuration(revealBy - commitBy)} after that.
                  </>
                );
              })()}
            </span>
          </div>

          {bondGated && bondBlocked && usdcMeta && (
            <BetaTokenNotice
              state={bondState}
              cluster={cluster}
              symbol={usdcMeta.symbol}
              decimals={usdcMeta.decimals}
              required={account.bondAmount}
              variant="inline"
            />
          )}

          {guardShortfall !== null && quoteMeta && (
            <div className="space-y-2">
              <BetaTokenNotice
                state={quoteState}
                cluster={cluster}
                symbol={quoteMeta.symbol}
                decimals={quoteMeta.decimals}
                required={requiredQuote}
                variant="inline"
              />
              <details className="text-xs text-white/40">
                <summary className="cursor-pointer select-none text-white/50">Details</summary>
                <p className="mt-1 font-mono">{guardShortfall}</p>
              </details>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {ticket && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => downloadTicket(ticket)}
                className="flex-1 border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <Download className="mr-2 h-4 w-4" />
                Download reveal ticket
              </Button>
              <Button
                variant="outline"
                onClick={() => setInspectorOpen(true)}
                className="flex-1 border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Inspect proof
              </Button>
            </div>
          )}
          {ticket && (
            <ProofInspector
              open={inspectorOpen}
              onOpenChange={setInspectorOpen}
              rfqPda={ticket.rfq}
              quote={attestation}
              ticket={ticket}
            />
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={busy}
              className="flex-1 border-white/30 bg-white/10 text-white/90 hover:bg-white/15"
            >
              {ticket ? "Close" : "Cancel"}
            </Button>
            <Button
              onClick={() => void handleCommit()}
              disabled={busy || ticket !== null}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 disabled:opacity-60"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {phase === "attesting"
                ? "Attesting…"
                : phase === "submitting"
                  ? "Committing…"
                  : ticket
                    ? "Committed"
                    : "Commit quote"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
