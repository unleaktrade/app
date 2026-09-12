import type { MintRewardTotals, PendingReward } from "@/app/lib/rewards";
import { RewardsTile } from "@/app/components/my-activity/RewardsTile";
import { StatTile } from "@/app/components/my-activity/StatTile";

export interface PinnedSummaryProps {
  pendingRewards: PendingReward[];
  pendingMintGroups: MintRewardTotals[];
  activeRFQs: number;
  activeQuotes: number;
  settled: number;
  claiming: boolean;
  onClaim: () => void;
}

export function PinnedSummary({
  pendingRewards,
  pendingMintGroups,
  activeRFQs,
  activeQuotes,
  settled,
  claiming,
  onClaim,
}: PinnedSummaryProps) {
  return (
    <div className="sticky top-(--nav-h) z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-surface-page/80 backdrop-blur-xl border-y border-white/10 py-3 sm:py-4 mb-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 items-stretch">
        <RewardsTile
          pending={pendingRewards}
          groups={pendingMintGroups}
          claiming={claiming}
          onClaim={onClaim}
        />
        <StatTile label="Active RFQs" value={activeRFQs} tone="cyan" />
        <StatTile label="Active quotes" value={activeQuotes} tone="blue" />
        <StatTile label="Settled" value={settled} tone="teal" />
      </div>
    </div>
  );
}
