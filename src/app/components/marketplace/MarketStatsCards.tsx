import { Activity, BadgeCheck, Clock, Shield } from "lucide-react";
import type { MarketStats } from "@/app/lib/market-stats";
import { formatTokenAmount } from "@/app/lib/format";

// Bond amounts are always denominated in USDC (6 decimals) — see math.ts.
const USDC_DECIMALS = 6;

interface MarketStatsCardsProps {
  stats: MarketStats;
}

/** The 4-up headline stat band above the analytics section, fed by live chain data. */
export function MarketStatsCards({ stats }: MarketStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      <StatCard
        label="Open"
        value={stats.openCount.toString()}
        subtext="Ready to quote"
        icon={Activity}
        gradient="from-green-500 to-emerald-500"
      />
      <StatCard
        label="Committed"
        value={stats.committedCount.toString()}
        subtext="Awaiting reveals"
        icon={Clock}
        gradient="from-blue-500 to-cyan-500"
      />
      <StatCard
        label="Settled"
        value={stats.settledCount.toString()}
        subtext="All time"
        icon={BadgeCheck}
        gradient="from-cyan-500 to-blue-500"
      />
      <StatCard
        label="Avg bond"
        value={
          stats.avgBondUsdc === null ? "—" : formatTokenAmount(stats.avgBondUsdc, USDC_DECIMALS)
        }
        subtext="USDC"
        icon={Shield}
        gradient="from-purple-500 to-indigo-500"
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}

function StatCard({ label, value, subtext, icon: Icon, gradient }: StatCardProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-5 group hover:border-white/20 transition-all">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity`}
      />
      <div className="relative">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} w-fit mb-2 sm:mb-3`}>
          <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-white mb-1">{value}</div>
        <div className="text-xs text-white/50 mb-0.5 sm:mb-1">{label}</div>
        <div className="text-xs text-white/40">{subtext}</div>
      </div>
    </div>
  );
}
