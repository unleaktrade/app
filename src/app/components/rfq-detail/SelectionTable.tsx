import type { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/app/components/ui/button";
import { ProofInspector } from "@/app/components/ProofInspector";
import type { RfqAccount } from "@/chain/accounts/rfq";
import type { ProgramAccount } from "@/chain/accounts/lists";
import type { QuoteAccount } from "@/chain/accounts/quote";
import { useSettlementProgram } from "@/chain/program";
import { canSelectQuote } from "@/chain/state-machine";
import { buildSelectQuoteTx } from "@/chain/instructions/maker";
import { formatTokenAmount, truncateAddress } from "@/app/lib/format";
import { useSubmitRfqTx } from "@/app/hooks/useSubmitRfqTx";
import { Panel } from "@/app/components/rfq-detail/Panel";
import { InfoNote } from "@/app/components/rfq-detail/InfoNote";
import type { Relation } from "@/app/components/rfq-detail/types";
import { toast } from "sonner";
import { Trophy, ShieldCheck } from "lucide-react";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Selection table (Revealed) — sorted by quote_amount desc (best for the poster
// first). Per-row "Select" CTA gated by canSelectQuote; visible to the maker
// only. This IS the select_quote surface.
// ---------------------------------------------------------------------------

export function SelectionTable({
  account,
  relation,
  quoteRows,
  quoteSymbol,
  quoteDecimals,
  nowSecs,
  rfqPda,
}: {
  account: RfqAccount;
  relation: Relation;
  quoteRows: ProgramAccount<QuoteAccount>[];
  quoteSymbol: string;
  quoteDecimals: number;
  nowSecs: number;
  rfqPda: PublicKey;
}) {
  const program = useSettlementProgram();
  const wallet = useWallet();
  const submit = useSubmitRfqTx();
  // Per-row busy indicator: the mutation carries the quote PDA as its tag.
  const busyPda = submit.isPending ? (submit.variables?.tag ?? null) : null;
  const [inspecting, setInspecting] = useState<ProgramAccount<QuoteAccount> | null>(null);
  const connected = wallet.publicKey?.toBase58() ?? null;

  const revealed = quoteRows
    .filter((q) => q.account.revealedAt !== null && q.account.quoteAmount !== null)
    .sort((a, b) => Number((b.account.quoteAmount ?? 0n) - (a.account.quoteAmount ?? 0n)));

  async function select(quoteRow: ProgramAccount<QuoteAccount>) {
    if (!program || !wallet.publicKey) {
      toast.error("Connect a wallet to continue");
      return;
    }
    // Re-check the guard at click time — state can flip via the subscription.
    const legal = canSelectQuote(
      account,
      {
        revealedAt: quoteRow.account.revealedAt,
        bondsRefundedAt: quoteRow.account.bondsRefundedAt,
        selected: quoteRow.account.selected,
      },
      nowSecs,
    );
    if (!legal) {
      toast.error("This quote can no longer be selected");
      return;
    }
    try {
      await submit.mutateAsync({
        rfq: rfqPda,
        tag: quoteRow.publicKey.toBase58(),
        build: () =>
          buildSelectQuoteTx({
            program,
            maker: account.maker,
            rfq: rfqPda,
            quote: quoteRow.publicKey,
            baseMint: account.baseMint,
            quoteMint: account.quoteMint,
          }),
        pendingMessage: "Selecting quote…",
        successMessage: "Quote selected — settlement can now proceed",
      });
    } catch {
      // toast already surfaced
    }
  }

  return (
    <Panel
      icon={<Trophy className="h-6 w-6 text-purple-400" />}
      title={relation.isMaker ? "Select the winning quote" : "Revealed quotes"}
      subtitle={
        relation.isMaker
          ? "Sorted best-first (highest quote amount). Selecting escrows your base tokens."
          : "The poster is choosing a winner within the selection window."
      }
      tone="purple"
    >
      <div className="space-y-3 mt-6">
        {revealed.length === 0 && <InfoNote text="No revealed quotes yet." />}
        {revealed.map((row, idx) => {
          const amount = row.account.quoteAmount ?? 0n;
          const canSelect =
            relation.isMaker &&
            canSelectQuote(
              account,
              {
                revealedAt: row.account.revealedAt,
                bondsRefundedAt: row.account.bondsRefundedAt,
                selected: row.account.selected,
              },
              nowSecs,
            );
          return (
            <div
              key={row.publicKey.toBase58()}
              className={`bg-white/5 border rounded-lg p-4 transition-all ${
                idx === 0 ? "border-green-500/30 bg-green-500/5" : "border-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white font-bold ${
                      idx === 0
                        ? "bg-gradient-to-br from-green-500 to-emerald-500"
                        : "bg-gradient-to-br from-cyan-500 to-blue-500"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-mono text-white/70 truncate">
                      {truncateAddress(row.account.taker.toBase58())}
                    </div>
                    <div className="text-lg font-semibold text-white tabular-nums">
                      {formatTokenAmount(amount, quoteDecimals)} {quoteSymbol}
                    </div>
                    <div className="text-xs text-white/40 truncate">
                      {row.account.facilitator
                        ? `reward → ${truncateAddress(row.account.facilitator.toBase58())}`
                        : "no reward recipient"}
                    </div>
                    {idx === 0 && <div className="text-xs text-green-400">Best quote</div>}
                    {row.account.selected && <div className="text-xs text-green-400">Selected</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Inspect liquidity proof"
                    onClick={() => setInspecting(row)}
                    className="text-white/40 hover:text-white hover:bg-white/10"
                  >
                    <ShieldCheck className="h-4 w-4" />
                  </Button>
                  {relation.isMaker && (
                    <Button
                      size="sm"
                      disabled={!canSelect || busyPda !== null}
                      onClick={() => void select(row)}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-40"
                    >
                      {busyPda === row.publicKey.toBase58() ? "Selecting…" : "Select"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {inspecting && (
        <ProofInspector
          open
          onOpenChange={(o) => {
            if (!o) setInspecting(null);
          }}
          rfqPda={rfqPda.toBase58()}
          quote={{
            commitHash: inspecting.account.commitHash,
            liquidityProof: inspecting.account.liquidityProof,
          }}
          // The local reveal ticket only describes the connected wallet's own
          // commitment - inspecting someone else's quote stays tier-1 only.
          ticket={
            connected !== null && inspecting.account.taker.toBase58() === connected
              ? undefined
              : null
          }
        />
      )}
    </Panel>
  );
}
