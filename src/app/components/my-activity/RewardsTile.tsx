import { CheckCircle2, HandCoins, Loader2 } from "lucide-react";
import type { MintRewardTotals, PendingReward } from "@/app/lib/rewards";
import { formatTokenAmount } from "@/app/lib/format";
import { Button } from "@/app/components/ui/button";

export function RewardsTile({
  pending,
  groups,
  claiming,
  onClaim,
}: {
  pending: PendingReward[];
  groups: MintRewardTotals[];
  claiming: boolean;
  onClaim: () => void;
}) {
  const hasUnclaimed = pending.length > 0;
  // One mint pending → the exact amount; several mints → a count, with the
  // per-mint amounts in a title tooltip (never summed across mints).
  const singleMint = groups.length === 1 ? groups[0] : undefined;
  const perMintTooltip = groups
    .map((g) => `${formatTokenAmount(g.pendingTotal, g.decimals)} ${g.symbol}`)
    .join(", ");
  return (
    <div
      className={`col-span-2 sm:col-span-1 flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 sm:px-4 sm:py-3 ${
        hasUnclaimed
          ? "bg-gradient-to-br from-green-500/15 to-emerald-500/10 border-green-500/30"
          : "bg-white/5 border-white/10"
      }`}
    >
      <div className="min-w-0">
        <div className="text-[0.65rem] sm:text-xs uppercase tracking-wider text-white/50">
          Rewards
        </div>
        {hasUnclaimed && singleMint ? (
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-xl sm:text-2xl font-bold text-green-400 truncate">
              {formatTokenAmount(singleMint.pendingTotal, singleMint.decimals)}
            </span>
            <span className="text-xs sm:text-sm text-white/60 whitespace-nowrap">
              {singleMint.symbol} to claim
            </span>
          </div>
        ) : (
          <div
            className="flex items-baseline gap-1.5"
            title={hasUnclaimed ? perMintTooltip : undefined}
          >
            <span
              className={`text-xl sm:text-2xl font-bold ${hasUnclaimed ? "text-green-400" : "text-white/70"}`}
            >
              {pending.length}
            </span>
            <span className="text-xs sm:text-sm text-white/60">to claim</span>
          </div>
        )}
      </div>
      {hasUnclaimed ? (
        <Button
          onClick={onClaim}
          disabled={claiming}
          size="sm"
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/20 disabled:opacity-60"
        >
          {claiming ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <HandCoins className="mr-1.5 h-3.5 w-3.5" />
          )}
          Claim
        </Button>
      ) : (
        <CheckCircle2 className="h-5 w-5 text-white/30" />
      )}
    </div>
  );
}
