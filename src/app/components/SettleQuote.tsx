// Settlement cockpit. The selected taker funds the trade: they must hold
// quote_amount + protocol fee in the quote mint. We show the snapshot, a
// best-effort balance check against that requirement, then run
// complete_settlement (bonds refund, base delivers, fee routes) and show a
// shareable receipt with the Solscan link.

import { useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import type { RfqAccount } from "@/chain/accounts/rfq";
import type { QuoteAccount } from "@/chain/accounts/quote";
import { useSettlementProgram } from "@/chain/program";
import { useCluster } from "@/app/providers/ClusterProvider";
import { canCompleteSettlement, fundingDeadline } from "@/chain/state-machine";
import { totalToFund } from "@/chain/math";
import { buildCompleteSettlementTx } from "@/chain/instructions/taker";
import { submitRfqTx } from "@/chain/instructions/shared";
import { resolveTokenMeta } from "@/app/lib/tokens";
import { formatTokenAmount } from "@/app/lib/format";
import { BondBreakdown } from "@/app/components/BondBreakdown";
import { DeadlineRing } from "@/app/components/DeadlineRing";
import { AddressDisplay } from "@/app/components/AddressDisplay";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import type { Cluster } from "@/chain/env";

interface SettleQuoteProps {
  quote: QuoteAccount;
  rfqPda: PublicKey;
  rfq: RfqAccount;
  facilitatorFeeBps: number;
  onDone: () => void;
  onBack: () => void;
}

function solscanTx(sig: string, cluster: Cluster): string {
  const suffix =
    cluster === "devnet" ? "?cluster=devnet" : cluster === "localnet" ? "?cluster=custom" : "";
  return `https://solscan.io/tx/${sig}${suffix}`;
}

export function SettleQuote({
  quote,
  rfqPda,
  rfq,
  facilitatorFeeBps,
  onDone,
  onBack,
}: SettleQuoteProps) {
  const program = useSettlementProgram();
  const { connection } = useConnection();
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const { cluster } = useCluster();

  const connected = wallet.publicKey?.toBase58() ?? null;
  const isOwner = connected !== null && connected === quote.taker.toBase58();

  const quoteMeta = resolveTokenMeta(rfq.quoteMint.toBase58());
  const baseMeta = resolveTokenMeta(rfq.baseMint.toBase58());
  const usdcMeta = resolveTokenMeta(rfq.usdcMint.toBase58());

  const quoteAmount = quote.quoteAmount ?? 0n;
  const required = useMemo(
    () => totalToFund(quoteAmount, rfq.takerFeeBps),
    [quoteAmount, rfq.takerFeeBps],
  );

  const [balance, setBalance] = useState<bigint | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);

  // Best-effort balance check on the taker's quote-mint ATA.
  useEffect(() => {
    if (!wallet.publicKey) return;
    let cancelled = false;
    const ata = getAssociatedTokenAddressSync(rfq.quoteMint, wallet.publicKey);
    connection
      .getTokenAccountBalance(ata)
      .then((r) => {
        if (!cancelled) setBalance(BigInt(r.value.amount));
      })
      .catch(() => {
        if (!cancelled) setBalance(0n);
      });
    return () => {
      cancelled = true;
    };
  }, [connection, wallet.publicKey, rfq.quoteMint]);

  const now = Math.floor(Date.now() / 1000);
  const canSettle = canCompleteSettlement(
    rfq,
    {
      revealedAt: quote.revealedAt,
      bondsRefundedAt: quote.bondsRefundedAt,
      selected: quote.selected,
    },
    now,
  );
  const underfunded = balance !== null && balance < required;

  async function settle() {
    if (!program || !wallet.publicKey) return;
    setBusy(true);
    try {
      const sig = await submitRfqTx({
        connection,
        wallet,
        queryClient,
        rfq: rfqPda,
        build: () => buildCompleteSettlementTx({ program, taker: wallet.publicKey!, rfqPda, rfq }),
        pendingMessage: "Settling…",
        successMessage: "Settlement complete",
      });
      setReceipt(sig);
    } catch {
      // toast already surfaced
    } finally {
      setBusy(false);
    }
  }

  const fundDeadline = fundingDeadline(rfq);

  if (receipt) {
    return (
      <Shell onBack={onBack}>
        <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-400" />
          <h1 className="text-2xl font-bold text-white">Settlement complete</h1>
          <p className="mt-1 text-white/60">
            You received {formatTokenAmount(rfq.baseAmount, baseMeta.decimals)} {baseMeta.symbol};
            bonds refunded.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a href={solscanTx(receipt, cluster)} target="_blank" rel="noreferrer">
              <Button className="bg-white/5 text-white hover:bg-white/10">
                <ExternalLink className="mr-2 h-4 w-4" />
                View on Solscan
              </Button>
            </a>
            <Button
              onClick={onDone}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
            >
              Done
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onBack={onBack}>
      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Complete settlement</h1>
            <p className="text-white/60">
              Your quote won on <AddressDisplay address={rfqPda.toBase58()} /> — fund it before the
              deadline or the trade lapses to Incomplete and your bond is forfeited.
            </p>
          </div>
          {fundDeadline > 0 && (
            <DeadlineRing deadlineSec={fundDeadline} totalSec={rfq.fundTtlSecs} />
          )}
        </div>

        {!isOwner ? (
          <Note tone="red">This settlement belongs to another wallet.</Note>
        ) : (
          <div className="space-y-6">
            <BondBreakdown
              bondAmount={rfq.bondAmount}
              bondSymbol={usdcMeta.symbol}
              bondDecimals={usdcMeta.decimals}
              quoteAmount={quoteAmount}
              quoteSymbol={quoteMeta.symbol}
              quoteDecimals={quoteMeta.decimals}
              takerFeeBps={rfq.takerFeeBps}
              facilitatorFeeBps={facilitatorFeeBps}
            />

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-4">
              <div>
                <div className="text-xs text-white/50">You must fund</div>
                <div className="font-mono text-lg text-white">
                  {formatTokenAmount(required, quoteMeta.decimals)} {quoteMeta.symbol}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/50">Your balance</div>
                <div
                  className={`font-mono text-lg ${underfunded ? "text-red-400" : "text-green-400"}`}
                >
                  {balance === null
                    ? "…"
                    : `${formatTokenAmount(balance, quoteMeta.decimals)} ${quoteMeta.symbol}`}
                </div>
              </div>
            </div>

            {underfunded && (
              <Note tone="amber">
                <span className="inline-flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Your {quoteMeta.symbol} balance is below the funding requirement — top up before
                  settling or the transaction will fail.
                </span>
              </Note>
            )}

            {!canSettle && (
              <Note tone="amber">
                This quote can't be settled right now (it must be the selected quote, before the
                funding deadline). If the funding deadline has already passed, the trade is marked
                Incomplete and this bond is forfeited.
              </Note>
            )}

            <Button
              onClick={() => void settle()}
              disabled={busy || !canSettle}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 disabled:opacity-50"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Settle now
            </Button>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-surface-page pb-32 pt-16">
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6 text-white/60 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {children}
      </div>
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
