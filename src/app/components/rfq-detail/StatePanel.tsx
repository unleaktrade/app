import type { PublicKey } from "@solana/web3.js";
import type { RFQ } from "@/types/rfq";
import { AddressDisplay } from "@/app/components/AddressDisplay";
import type { RfqAccount } from "@/chain/accounts/rfq";
import type { ProgramAccount } from "@/chain/accounts/lists";
import type { QuoteAccount } from "@/chain/accounts/quote";
import { findQuoteByPda } from "@/app/lib/quote-lookup";
import { formatTokenAmount } from "@/app/lib/format";
import { Metric } from "@/app/components/rfq-detail/Metric";
import { Panel } from "@/app/components/rfq-detail/Panel";
import { InfoNote } from "@/app/components/rfq-detail/InfoNote";
import { WinnerSummary } from "@/app/components/rfq-detail/WinnerSummary";
import { SelectionTable } from "@/app/components/rfq-detail/SelectionTable";
import type { Relation } from "@/app/components/rfq-detail/types";
import { Clock, Shield, Eye, CheckCircle2, AlertTriangle } from "lucide-react";

// ---------------------------------------------------------------------------
// State panels — informational only; all CTAs live in RFQActionBar / the
// selection table. Copy is role-neutral (no maker/taker/facilitator strings).
// ---------------------------------------------------------------------------

export function StatePanel({
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
          subtitle={`Not publicly listed yet. Parameters are still editable. Opening will post the bond shown above and start a ${Math.round(rfq.commitTtlSecs / 3600)}h commit window.`}
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
            subtitle={`${account.committedCount} committed, ${account.revealedCount} revealed so far; reveals open until the deadline${rfq.expiresIn ? ` (${rfq.expiresIn})` : ""}.`}
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
    case "Selected": {
      const winningQuote = findQuoteByPda(quoteRows, rfq.selectedQuote);
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
        >
          <WinnerSummary
            quoteRow={winningQuote}
            quoteSymbol={quoteSymbol}
            quoteDecimals={quoteDecimals}
          />
        </Panel>
      );
    }
    case "Settled":
      return (
        <SettledPanel
          rfq={rfq}
          quoteSymbol={quoteSymbol}
          quoteDecimals={quoteDecimals}
          quoteRows={quoteRows}
        />
      );
    case "Expired":
      return (
        <Panel
          icon={<AlertTriangle className="h-6 w-6 text-orange-400" />}
          title="Expired"
          subtitle={`No valid reveals before the deadline (${account.revealedCount} of ${account.committedCount} committed quotes revealed). Bonds are reclaimable by their owners.`}
          tone="orange"
        />
      );
    case "Ignored":
      return (
        <Panel
          icon={<AlertTriangle className="h-6 w-6 text-gray-400" />}
          title="Ignored"
          subtitle={`The selection window lapsed with no winner (${account.revealedCount} revealed quote${account.revealedCount === 1 ? "" : "s"}, none selected). Revealed quotes can reclaim their bond.`}
          tone="gray"
        />
      );
    case "Incomplete": {
      const winningQuote = findQuoteByPda(quoteRows, rfq.selectedQuote);
      return (
        <Panel
          icon={<AlertTriangle className="h-6 w-6 text-red-400" />}
          title="Incomplete"
          subtitle="The selected counterparty never funded in time. Escrow and bonds have been resolved."
          tone="red"
        >
          <WinnerSummary
            quoteRow={winningQuote}
            quoteSymbol={quoteSymbol}
            quoteDecimals={quoteDecimals}
          />
        </Panel>
      );
    }
    default:
      return null;
  }
}

function SettledPanel({
  rfq,
  quoteSymbol,
  quoteDecimals,
  quoteRows,
}: {
  rfq: RFQ;
  quoteSymbol: string;
  quoteDecimals: number;
  quoteRows: ProgramAccount<QuoteAccount>[];
}) {
  const settledAt =
    rfq.completedAt !== null ? new Date(rfq.completedAt * 1000).toLocaleString() : "—";
  // The actual traded amount is the winning quote's own quoteAmount, not
  // rfq.minQuoteAmount (the poster's ask floor) — a trade that cleared above
  // the minimum would otherwise show a misleadingly low price/volume here.
  const winningQuote = findQuoteByPda(quoteRows, rfq.selectedQuote);
  const winningAmountRaw = winningQuote?.account.quoteAmount ?? null;
  const winningAmountScaled =
    winningAmountRaw !== null ? Number(winningAmountRaw) / 10 ** quoteDecimals : null;
  const volume =
    winningAmountRaw !== null ? formatTokenAmount(winningAmountRaw, quoteDecimals) : "—";
  const price =
    winningAmountScaled !== null && rfq.baseAmount > 0
      ? (winningAmountScaled / rfq.baseAmount).toFixed(4)
      : "—";
  return (
    <Panel
      icon={<CheckCircle2 className="h-6 w-6 text-green-400" />}
      title="Settlement complete"
      subtitle="The trade executed and bonds were refunded."
      tone="green"
    >
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Metric label="Reference price" value={price} unit={`${quoteSymbol}/base`} />
        <Metric label="Quote volume" value={volume} unit={quoteSymbol} />
        <Metric label="Settled at" value={settledAt} unit="" />
      </div>
      {winningQuote && (
        <div className="mt-4 flex items-center gap-1.5 text-sm text-white/60">
          <span>Settled with</span>
          <AddressDisplay address={winningQuote.account.taker.toBase58()} />
        </div>
      )}
    </Panel>
  );
}
