import { Shield } from "lucide-react";
import { computeFacilitatorShare, computeTotalFee, totalToFund } from "@/chain/math";
import { formatTokenAmount } from "@/app/lib/format";
import { cn } from "@/app/components/ui/utils";

interface BondBreakdownProps {
  /** USDC bond posted per side (base units). */
  bondAmount: bigint;
  bondSymbol?: string;
  bondDecimals?: number;
  /** Quote-side amount (base units of the quote mint). */
  quoteAmount: bigint;
  quoteSymbol: string;
  quoteDecimals: number;
  takerFeeBps: number;
  facilitatorFeeBps: number;
  className?: string;
}

function Row({
  label,
  value,
  emphasis,
  muted,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={cn("text-xs", muted ? "text-white/40" : "text-white/60")}>{label}</span>
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          emphasis ? "font-semibold text-white" : muted ? "text-white/50" : "text-white/80",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Economic breakdown of a trade. Amounts are denominated per-token — never
 * aggregated into USD (project rule). The protocol fee is paid on top of the
 * quote amount; the side posting the RFQ receives the quote amount in full.
 */
export function BondBreakdown({
  bondAmount,
  bondSymbol = "USDC",
  bondDecimals = 6,
  quoteAmount,
  quoteSymbol,
  quoteDecimals,
  takerFeeBps,
  facilitatorFeeBps,
  className,
}: BondBreakdownProps) {
  const totalFee = computeTotalFee(quoteAmount, takerFeeBps);
  const facilitationShare = computeFacilitatorShare(totalFee, facilitatorFeeBps);
  const treasuryShare = totalFee - facilitationShare;
  const fundingTotal = totalToFund(quoteAmount, takerFeeBps);
  const bond = `${formatTokenAmount(bondAmount, bondDecimals)} ${bondSymbol}`;

  return (
    <div
      className={cn("space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4", className)}
    >
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-white/70">
        <Shield className="h-3.5 w-3.5 text-cyan-400" />
        Bonds &amp; fees
      </div>
      <Row label="Bond — request side" value={bond} />
      <Row label="Bond — quote side" value={bond} />
      <div className="my-2 border-t border-white/10" />
      <Row
        label="Quote amount"
        value={`${formatTokenAmount(quoteAmount, quoteDecimals)} ${quoteSymbol}`}
      />
      <Row
        label={`Protocol fee (${takerFeeBps} bps, paid on top)`}
        value={`${formatTokenAmount(totalFee, quoteDecimals)} ${quoteSymbol}`}
      />
      <Row
        label="— facilitation share"
        value={`${formatTokenAmount(facilitationShare, quoteDecimals)} ${quoteSymbol}`}
        muted
      />
      <Row
        label="— treasury share"
        value={`${formatTokenAmount(treasuryShare, quoteDecimals)} ${quoteSymbol}`}
        muted
      />
      <div className="my-2 border-t border-white/10" />
      <Row
        label="Total to fund (quote + fee)"
        value={`${formatTokenAmount(fundingTotal, quoteDecimals)} ${quoteSymbol}`}
        emphasis
      />
    </div>
  );
}
