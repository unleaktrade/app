import { Activity, Clock, Coins, Eye, Target, TrendingUp, Users } from "lucide-react";
import type { MarketStats, RecentEvent } from "@/app/lib/market-stats";
import { formatDuration, formatTokenAmount } from "@/app/lib/format";

const EVENT_LABELS: Record<RecentEvent["kind"], string> = {
  settled: "RFQ Settled",
  opened: "RFQ Opened",
  created: "RFQ Created",
};

const EVENT_DOT_CLASSES: Record<RecentEvent["kind"], string> = {
  settled: "bg-green-400",
  opened: "bg-cyan-400",
  created: "bg-purple-400",
};

interface MarketOverviewProps {
  stats: MarketStats;
  /** Current unix seconds — drives the relative "ago" labels. */
  now: number;
}

/** Live market snapshot: lifecycle counts, top pairs and recent activity. */
export function MarketOverview({ stats, now }: MarketOverviewProps) {
  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5">
      <h3 className="text-base font-semibold text-white mb-4">Market Overview</h3>

      <div className="space-y-3">
        {/* Mini cards — settlement rate & fill time drop out until data exists */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          <MiniCard
            label="Open"
            value={stats.openCount.toString()}
            subtext="Accepting quotes"
            icon={TrendingUp}
            tone="green"
          />
          <MiniCard
            label="Awaiting reveal"
            value={stats.committedCount.toString()}
            subtext="Committed quotes"
            icon={Clock}
            tone="blue"
          />
          <MiniCard
            label="Awaiting selection"
            value={stats.revealedCount.toString()}
            subtext="Revealed quotes"
            icon={Eye}
            tone="cyan"
          />
          {stats.settlementRatePct !== null && (
            <MiniCard
              label="Settlement rate"
              value={`${stats.settlementRatePct}%`}
              subtext="All time"
              icon={Target}
              tone="purple"
            />
          )}
          <MiniCard
            label="Participants"
            value={stats.distinctMakers.toString()}
            subtext="Unique wallets"
            icon={Users}
            tone="orange"
          />
          {stats.avgFillSecs !== null && (
            <MiniCard
              label="Avg fill time"
              value={formatDuration(stats.avgFillSecs)}
              subtext="Open to settled"
              icon={Activity}
              tone="yellow"
            />
          )}
        </div>

        {/* Top Pairs and Recent Activity - Side by Side */}
        <div className="grid md:grid-cols-2 gap-3">
          {/* Top Pairs */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-white mb-3">
              <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
              Top Pairs
            </div>
            {stats.topPairs.length === 0 ? (
              <div className="text-xs text-white/40">No settled RFQs yet.</div>
            ) : (
              <div className="space-y-2">
                {stats.topPairs.map((pair) => (
                  <div
                    key={`${pair.pair}-${pair.baseSymbol}`}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Coins className="h-3 w-3 text-cyan-400" />
                      <span className="text-white">{pair.pair}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-white">
                        {formatTokenAmount(pair.baseTotal, pair.baseDecimals)} {pair.baseSymbol}
                      </div>
                      <div className="text-white/40 text-xs">{pair.settledCount} settled</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-white mb-3">
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
              Recent Activity
            </div>
            {stats.recent.length === 0 ? (
              <div className="text-xs text-white/40">No activity yet.</div>
            ) : (
              <div className="space-y-2.5">
                {stats.recent.map((event) => (
                  <div key={`${event.kind}-${event.pair}-${event.at}`}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${EVENT_DOT_CLASSES[event.kind]}`}
                        />
                        <span className="text-white/60">{EVENT_LABELS[event.kind]}</span>
                      </div>
                      <span className="text-white/40">
                        {now > event.at ? `${formatDuration(now - event.at)} ago` : "just now"}
                      </span>
                    </div>
                    <div className="text-xs text-white/80 pl-3.5">{event.pair}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type MiniCardTone = "green" | "blue" | "cyan" | "orange" | "purple" | "yellow";

const TONE_CLASSES: Record<
  MiniCardTone,
  { card: string; iconWrap: string; icon: string; subtext: string }
> = {
  green: {
    card: "from-green-500/20 to-green-600/10 border-green-500/30",
    iconWrap: "bg-green-500/20",
    icon: "text-green-400",
    subtext: "text-green-400",
  },
  blue: {
    card: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    iconWrap: "bg-blue-500/20",
    icon: "text-blue-400",
    subtext: "text-blue-400",
  },
  cyan: {
    card: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
    iconWrap: "bg-cyan-500/20",
    icon: "text-cyan-400",
    subtext: "text-cyan-400",
  },
  orange: {
    card: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
    iconWrap: "bg-orange-500/20",
    icon: "text-orange-400",
    subtext: "text-orange-400",
  },
  purple: {
    card: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
    iconWrap: "bg-purple-500/20",
    icon: "text-purple-400",
    subtext: "text-purple-400",
  },
  yellow: {
    card: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30",
    iconWrap: "bg-yellow-500/20",
    icon: "text-yellow-400",
    subtext: "text-yellow-400",
  },
};

interface MiniCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: MiniCardTone;
}

function MiniCard({ label, value, subtext, icon: Icon, tone }: MiniCardProps) {
  const classes = TONE_CLASSES[tone];
  return (
    <div className={`bg-gradient-to-br ${classes.card} border rounded-lg p-2.5`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`p-1 rounded ${classes.iconWrap}`}>
          <Icon className={`h-2.5 w-2.5 ${classes.icon}`} />
        </div>
        <span className="text-xs text-white/60">{label}</span>
      </div>
      <div className="text-xl font-bold text-white mb-0.5">{value}</div>
      <div className={`text-xs ${classes.subtext}`}>{subtext}</div>
    </div>
  );
}
