import { motion } from "motion/react";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import type { RFQ } from "@/types/rfq";
import { Button } from "@/app/components/ui/button";
import { StatusBadge } from "@/app/components/StatusBadge";
import { SkeletonList } from "@/app/components/SkeletonList";
import { ErrorRetry } from "@/app/components/ErrorRetry";
import { RFQActionBar } from "@/app/components/RFQActionBar";
import { RFQStatePipeline } from "@/app/components/RFQStatePipeline";
import { AddressDisplay } from "@/app/components/AddressDisplay";
import { useRfqAccount, type RfqAccount } from "@/chain/accounts/rfq";
import { useQuoteAccountsForRfq, type ProgramAccount } from "@/chain/accounts/lists";
import type { QuoteAccount } from "@/chain/accounts/quote";
import { useConfigAccount } from "@/chain/accounts/config";
import { useSettlementProgram } from "@/chain/program";
import { canSelectQuote } from "@/chain/state-machine";
import { buildSelectQuoteTx } from "@/chain/instructions/maker";
import { submitRfqTx } from "@/chain/instructions/shared";
import { toRfqViewModel } from "@/app/lib/rfq-view-model";
import { resolveTokenMeta } from "@/app/lib/tokens";
import { formatTokenAmount, truncateAddress } from "@/app/lib/format";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  Shield,
  Coins,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";

interface AdaptiveRFQDetailProps {
  rfqId: string;
  onBack: () => void;
  onQuoteRFQ?: (rfq: RFQ) => void;
  onEditRFQ?: (rfq: RFQ) => void;
}

/** The connected wallet's relation to this RFQ. Role is internal — never copy. */
interface Relation {
  isMaker: boolean;
  isFacilitator: boolean;
  myQuote: ProgramAccount<QuoteAccount> | null;
}

export function AdaptiveRFQDetail({
  rfqId,
  onBack,
  onQuoteRFQ,
  onEditRFQ,
}: AdaptiveRFQDetailProps) {
  const pda = useMemo(() => {
    try {
      return new PublicKey(rfqId);
    } catch {
      return null;
    }
  }, [rfqId]);
  const rfqQuery = useRfqAccount(pda);
  const quotesQuery = useQuoteAccountsForRfq(pda);
  const configQuery = useConfigAccount();
  const { publicKey } = useWallet();
  const nowSecs = Math.floor(Date.now() / 1000);

  if (rfqQuery.isLoading) {
    return (
      <Shell>
        <SkeletonList count={3} />
      </Shell>
    );
  }

  if (rfqQuery.isError) {
    return (
      <Shell>
        <ErrorRetry
          message="Couldn't load this RFQ from the chain."
          onRetry={() => void rfqQuery.refetch()}
          retrying={rfqQuery.isFetching}
        />
      </Shell>
    );
  }

  if (pda === null || !rfqQuery.data) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pb-32 pt-16 flex items-center justify-center">
        <div className="text-white">RFQ not found</div>
      </div>
    );
  }

  const account = rfqQuery.data;
  const rfq = toRfqViewModel({ publicKey: pda, account }, nowSecs);
  const quoteRows = quotesQuery.data ?? [];
  const connected = publicKey?.toBase58() ?? null;

  const relation: Relation = {
    isMaker: connected !== null && connected === account.maker.toBase58(),
    isFacilitator: connected !== null && account.facilitator?.toBase58() === connected,
    myQuote:
      connected === null
        ? null
        : (quoteRows.find((q) => q.account.taker.toBase58() === connected) ?? null),
  };

  const [base = rfq.baseMint, quote = rfq.quoteMint] = rfq.pair.split("/");
  const quoteMeta = resolveTokenMeta(rfq.quoteMint);
  const usdcSymbol = "USDC";

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-32 pt-16">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6 text-white/60 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Header */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs text-white/40 font-mono mb-1">RFQ</div>
              <div className="mb-3">
                <AddressDisplay address={rfq.publicKey} />
              </div>
              <div className="flex items-center gap-3">
                <Coins className="h-5 w-5 text-cyan-400" />
                <span className="text-2xl font-bold text-white">{rfq.pair}</span>
              </div>
            </div>
            <StatusBadge status={rfq.state} />
          </div>

          <RFQStatePipeline state={rfq.state} className="mb-4" />

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10 sm:grid-cols-4">
            <Metric label="Base amount" value={rfq.baseAmount.toLocaleString()} unit={base} />
            <Metric label="Target quote" value={rfq.minQuoteAmount.toLocaleString()} unit={quote} />
            <Metric
              label="Bond per side"
              value={rfq.bondAmount.toLocaleString()}
              unit={usdcSymbol}
            />
            <Metric
              label={rfq.expiresIn ? "Expires in" : "Status"}
              value={rfq.expiresIn ?? rfq.state}
              unit={rfq.facilitator ? `fac ${truncateAddress(rfq.facilitator)}` : "no facilitator"}
            />
          </div>
        </div>

        {/* State-specific informational panel (role-neutral) */}
        <StatePanel
          rfq={rfq}
          account={account}
          relation={relation}
          quoteRows={quoteRows}
          quoteSymbol={quoteMeta.symbol}
          quoteDecimals={quoteMeta.decimals}
          nowSecs={nowSecs}
          rfqPda={pda}
        />

        {/* The single action bar — legal maker/facilitator CTAs for this state */}
        <div className="mt-6">
          <RFQActionBar
            rfqPda={pda}
            rfq={account}
            quotes={quoteRows}
            config={configQuery.data ?? null}
            onEdit={() => onEditRFQ?.(rfq)}
            onCommit={() => onQuoteRFQ?.(rfq)}
            onClosed={onBack}
          />
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-32 pt-16">
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">{children}</div>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <div className="text-xs text-white/50 mb-1">{label}</div>
      <div className="text-lg font-semibold text-white truncate">{value}</div>
      <div className="text-sm text-white/40 truncate">{unit}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// State panels — informational only; all CTAs live in RFQActionBar / the
// selection table. Copy is role-neutral (no maker/taker/facilitator strings).
// ---------------------------------------------------------------------------

function StatePanel({
  rfq,
  account,
  relation,
  quoteRows,
  quoteSymbol,
  quoteDecimals,
  nowSecs,
  rfqPda,
}: {
  rfq: RFQ;
  account: RfqAccount;
  relation: Relation;
  quoteRows: ProgramAccount<QuoteAccount>[];
  quoteSymbol: string;
  quoteDecimals: number;
  nowSecs: number;
  rfqPda: PublicKey;
}) {
  switch (rfq.state) {
    case "Draft":
      return (
        <Panel
          icon={<Shield className="h-6 w-6 text-purple-400" />}
          title="Draft"
          subtitle="Review the parameters, then open this RFQ to post the bond and start the clock."
          tone="purple"
        />
      );
    case "Open":
      return (
        <Panel
          icon={<Clock className="h-6 w-6 text-green-400" />}
          title="Open for quotes"
          subtitle={`Committing closes ${rfq.expiresIn ? `in ${rfq.expiresIn}` : "soon"}. ${account.committedCount} commitment${account.committedCount === 1 ? "" : "s"} so far. Use Commit quote below to bid.`}
          tone="green"
        />
      );
    case "Committed":
      return (
        <div className="space-y-6">
          <Panel
            icon={<Eye className="h-6 w-6 text-blue-400" />}
            title="Commitments received"
            subtitle={`${account.committedCount} committed; reveals open until the deadline${rfq.expiresIn ? ` (${rfq.expiresIn})` : ""}.`}
            tone="blue"
          />
          {relation.myQuote && relation.myQuote.account.revealedAt === null && (
            <InfoNote text="Your quote is committed. Reveal it in the reveal window from My Activity." />
          )}
        </div>
      );
    case "Revealed":
      return (
        <SelectionTable
          account={account}
          relation={relation}
          quoteRows={quoteRows}
          quoteSymbol={quoteSymbol}
          quoteDecimals={quoteDecimals}
          nowSecs={nowSecs}
          rfqPda={rfqPda}
        />
      );
    case "Selected":
      return (
        <Panel
          icon={<CheckCircle2 className="h-6 w-6 text-green-400" />}
          title="Quote selected"
          subtitle={
            relation.myQuote?.account.selected
              ? "Your quote won — complete the settlement from My Activity before the funding deadline."
              : "A winning quote was chosen. Settlement is pending the funding deadline."
          }
          tone="green"
        />
      );
    case "Settled":
      return <SettledPanel rfq={rfq} quoteSymbol={quoteSymbol} />;
    case "Expired":
      return (
        <Panel
          icon={<AlertTriangle className="h-6 w-6 text-orange-400" />}
          title="Expired"
          subtitle="No valid reveals before the deadline. Bonds are reclaimable by their owners."
          tone="orange"
        />
      );
    case "Ignored":
      return (
        <Panel
          icon={<AlertTriangle className="h-6 w-6 text-gray-400" />}
          title="Ignored"
          subtitle="The selection window lapsed with no winner. Revealed quotes can reclaim their bond."
          tone="gray"
        />
      );
    case "Incomplete":
      return (
        <Panel
          icon={<AlertTriangle className="h-6 w-6 text-red-400" />}
          title="Incomplete"
          subtitle="The selected counterparty never funded in time. Escrow and bonds have been resolved."
          tone="red"
        />
      );
    default:
      return null;
  }
}

const toneBg: Record<string, string> = {
  purple: "from-purple-500/10 to-pink-500/10 border-purple-500/20",
  green: "from-green-500/10 to-emerald-500/10 border-green-500/20",
  blue: "from-blue-500/10 to-purple-500/10 border-blue-500/20",
  orange: "from-orange-500/10 to-amber-500/10 border-orange-500/20",
  gray: "from-gray-500/10 to-gray-600/10 border-gray-500/20",
  red: "from-red-500/10 to-rose-500/10 border-red-500/20",
};

function Panel({
  icon,
  title,
  subtitle,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone: keyof typeof toneBg | string;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${toneBg[tone] ?? toneBg.gray} border rounded-xl p-6`}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-white/5">{icon}</div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-white mb-1">{title}</h2>
          <p className="text-white/60">{subtitle}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

function InfoNote({ text }: { text: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/70">
      {text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selection table (Revealed) — sorted by quote_amount desc (best for the poster
// first). Per-row "Select" CTA gated by canSelectQuote; visible to the maker
// only. This IS the select_quote surface.
// ---------------------------------------------------------------------------

function SelectionTable({
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
  const { connection } = useConnection();
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const [busyPda, setBusyPda] = useState<string | null>(null);

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
      Math.floor(Date.now() / 1000),
    );
    if (!legal) {
      toast.error("This quote can no longer be selected");
      return;
    }
    setBusyPda(quoteRow.publicKey.toBase58());
    try {
      await submitRfqTx({
        connection,
        wallet,
        queryClient,
        rfq: rfqPda,
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
    } finally {
      setBusyPda(null);
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
                    {idx === 0 && <div className="text-xs text-green-400">Best quote</div>}
                    {row.account.selected && <div className="text-xs text-green-400">Selected</div>}
                  </div>
                </div>
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
          );
        })}
      </div>
    </Panel>
  );
}

function SettledPanel({ rfq, quoteSymbol }: { rfq: RFQ; quoteSymbol: string }) {
  const settledAt =
    rfq.completedAt !== null ? new Date(rfq.completedAt * 1000).toLocaleString() : "—";
  const price = rfq.baseAmount > 0 ? (rfq.minQuoteAmount / rfq.baseAmount).toFixed(4) : "—";
  return (
    <Panel
      icon={<CheckCircle2 className="h-6 w-6 text-green-400" />}
      title="Settlement complete"
      subtitle="The trade executed and bonds were refunded."
      tone="green"
    >
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Metric label="Reference price" value={price} unit={`${quoteSymbol}/base`} />
        <Metric
          label="Quote volume"
          value={rfq.minQuoteAmount.toLocaleString()}
          unit={quoteSymbol}
        />
        <Metric label="Settled at" value={settledAt} unit="" />
      </div>
    </Panel>
  );
}
