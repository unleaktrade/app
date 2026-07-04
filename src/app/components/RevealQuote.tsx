// Reveal cockpit. The taker discloses (salt, quote_amount); the program
// re-derives the commit hash and checks it against what was committed. We
// re-derive the SAME hash locally first and show a visual diff against the
// on-chain hash, so the taker sees a green match before signing — a red
// mismatch means wrong salt/amount and the reveal would fail on-chain.
//
// Salt recovery: auto-loaded from the localStorage reveal ticket; else import
// the downloaded ticket JSON, or re-sign to re-derive it (the salt is a
// deterministic signature over the public RFQ pubkey, so signing again yields
// the same 64 bytes — but the amount still has to be supplied).

import { useEffect, useMemo, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import type { PublicKey } from "@solana/web3.js";
import type { RfqAccount } from "@/chain/accounts/rfq";
import type { QuoteAccount } from "@/chain/accounts/quote";
import { useSettlementProgram } from "@/chain/program";
import { canRevealQuote, revealDeadline } from "@/chain/state-machine";
import { commitHash } from "@/chain/commitHash";
import { deriveSalt } from "@/chain/liquidityGuard";
import { buildRevealQuoteTx } from "@/chain/instructions/taker";
import { submitRfqTx } from "@/chain/instructions/shared";
import { resolveTokenMeta } from "@/app/lib/tokens";
import { hexToBytes, bytesToHex, loadTicket, parseTicket } from "@/app/lib/reveal-ticket";
import { ProofInspector } from "@/app/components/ProofInspector";
import { PageShell } from "@/app/components/PageShell";
import { TokenAmountInput } from "@/app/components/TokenAmountInput";
import { DeadlineRing } from "@/app/components/DeadlineRing";
import { AddressDisplay } from "@/app/components/AddressDisplay";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Upload,
  XCircle,
  PenLine,
  ShieldCheck,
} from "lucide-react";

interface RevealQuoteProps {
  quotePda: PublicKey;
  quote: QuoteAccount;
  rfqPda: PublicKey;
  rfq: RfqAccount;
  onDone: () => void;
  onBack: () => void;
}

export function RevealQuote({ quote, rfqPda, rfq, onDone, onBack }: RevealQuoteProps) {
  const program = useSettlementProgram();
  const { connection } = useConnection();
  const wallet = useWallet();
  const queryClient = useQueryClient();

  const connected = wallet.publicKey?.toBase58() ?? null;
  const isOwner = connected !== null && connected === quote.taker.toBase58();

  const [salt, setSalt] = useState<Uint8Array | null>(null);
  const [amount, setAmount] = useState<bigint | null>(null);
  const [localHashHex, setLocalHashHex] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onchainHashHex = useMemo(() => bytesToHex(quote.commitHash), [quote.commitHash]);
  const quoteMeta = resolveTokenMeta(rfq.quoteMint.toBase58());

  // Prefill from the localStorage ticket on mount.
  useEffect(() => {
    const t = loadTicket(rfqPda.toBase58());
    if (t) {
      try {
        setSalt(hexToBytes(t.salt));
        setAmount(BigInt(t.quoteAmount));
      } catch {
        /* corrupt ticket — user can import / re-sign */
      }
    }
  }, [rfqPda]);

  // Re-derive the commit hash whenever salt/amount change so the diff is live.
  useEffect(() => {
    let cancelled = false;
    if (!salt || amount === null) {
      setLocalHashHex(null);
      return;
    }
    void commitHash({
      salt,
      rfq: rfqPda,
      taker: quote.taker,
      quoteMint: rfq.quoteMint,
      quoteAmount: amount,
      bondAmount: rfq.bondAmount,
      takerFeeBps: rfq.takerFeeBps,
    }).then((r) => {
      if (!cancelled) setLocalHashHex(bytesToHex(r.hash));
    });
    return () => {
      cancelled = true;
    };
  }, [salt, amount, rfqPda, quote.taker, rfq.quoteMint, rfq.bondAmount, rfq.takerFeeBps]);

  const matches = localHashHex !== null && localHashHex === onchainHashHex;
  const now = Math.floor(Date.now() / 1000);
  const inWindow = canRevealQuote(
    rfq,
    {
      revealedAt: quote.revealedAt,
      bondsRefundedAt: quote.bondsRefundedAt,
      selected: quote.selected,
    },
    now,
  );

  async function importTicket(file: File) {
    try {
      const t = parseTicket(JSON.parse(await file.text()));
      if (t.rfq !== rfqPda.toBase58()) {
        toast.error("This ticket is for a different RFQ");
        return;
      }
      setSalt(hexToBytes(t.salt));
      setAmount(BigInt(t.quoteAmount));
      toast.success("Reveal ticket imported");
    } catch {
      toast.error("Couldn't read that reveal ticket");
    }
  }

  async function resign() {
    if (!wallet.publicKey) return;
    try {
      setSalt(await deriveSalt(wallet, rfqPda));
      toast.success("Salt re-derived — enter your quote amount if not set");
    } catch {
      toast.error("Signing was rejected");
    }
  }

  async function reveal() {
    if (!program || !wallet.publicKey || salt === null || amount === null) return;
    if (!matches) {
      toast.error("Commit hash doesn't match — check your salt and amount");
      return;
    }
    setBusy(true);
    try {
      await submitRfqTx({
        connection,
        wallet,
        queryClient,
        rfq: rfqPda,
        build: () =>
          buildRevealQuoteTx({
            program,
            taker: wallet.publicKey!,
            rfq: rfqPda,
            salt,
            quoteAmount: amount,
          }),
        pendingMessage: "Revealing quote…",
        successMessage: "Quote revealed",
      });
      onDone();
    } catch {
      // toast already surfaced
    } finally {
      setBusy(false);
    }
  }

  const revealBy = revealDeadline(rfq);

  return (
    <PageShell variant="detail" orbs={false} containerClassName="max-w-3xl py-6 sm:py-8">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-6 text-white/60 hover:bg-white/5 hover:text-white"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Reveal your quote</h1>
            <p className="text-white/60">
              You committed a sealed {quoteMeta.symbol} quote on{" "}
              <AddressDisplay address={rfqPda.toBase58()} /> — disclose the amount before the reveal
              deadline or it can't be considered and your bond is forfeited.
            </p>
          </div>
          {revealBy !== null && (
            <DeadlineRing deadlineSec={revealBy} totalSec={rfq.revealTtlSecs} />
          )}
        </div>

        {!isOwner ? (
          <Note tone="red">This quote belongs to another wallet — you can't reveal it.</Note>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-white/80">Quote amount ({quoteMeta.symbol})</label>
              <TokenAmountInput
                mint={rfq.quoteMint.toBase58()}
                value={amount}
                onChange={setAmount}
              />
            </div>

            {/* Recovery controls */}
            <div className="flex flex-wrap gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importTicket(f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import reveal ticket
              </Button>
              <Button
                variant="outline"
                onClick={() => void resign()}
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <PenLine className="mr-2 h-4 w-4" />
                Re-derive salt
              </Button>
            </div>

            {/* Commit-hash diff */}
            <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-wider text-white/40">Commit hash</div>
              <HashRow label="On-chain" hex={onchainHashHex} />
              <HashRow label="Derived" hex={localHashHex ?? "—"} />
              {localHashHex !== null &&
                (matches ? (
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CheckCircle2 className="h-4 w-4" /> Match — safe to reveal
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-red-400">
                    <XCircle className="h-4 w-4" /> Mismatch — wrong salt or amount
                  </div>
                ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setInspectorOpen(true)}
                className="mt-1 text-white/50 hover:text-white hover:bg-white/10"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Inspect proof
              </Button>
            </div>
            <ProofInspector
              open={inspectorOpen}
              onOpenChange={setInspectorOpen}
              rfqPda={rfqPda.toBase58()}
              quote={{ commitHash: quote.commitHash, liquidityProof: quote.liquidityProof }}
            />

            {!inWindow && (
              <Note tone="amber">
                The reveal window isn't open right now (it opens after commits close and ends at the
                reveal deadline). If the deadline has already passed, this quote can no longer be
                revealed and its bond is forfeited.
              </Note>
            )}

            <Button
              onClick={() => void reveal()}
              disabled={busy || !matches || !inWindow || salt === null || amount === null}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reveal quote
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function HashRow({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs text-white/50">{label}</span>
      <span className="truncate font-mono text-xs text-white/80">{hex}</span>
    </div>
  );
}

function Note({ tone, children }: { tone: "red" | "amber"; children: React.ReactNode }) {
  const cls =
    tone === "red"
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return <div className={`rounded-lg border p-3 text-sm ${cls}`}>{children}</div>;
}
