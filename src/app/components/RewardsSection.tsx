// Content of the "Rewards" section in My Activity (Phase 5 #15). Pure
// presentation — the pending/claimed derivation lives in src/app/lib/rewards.ts
// and the claim submission in MyActivity. Amounts are always shown per mint as
// "{amount} {symbol}"; there is intentionally no cross-mint aggregate and no
// USD anywhere (see the project reward-denomination rule).

import { useMemo, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, Clock, HandCoins, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { formatTokenAmount, truncateAddress } from "@/app/lib/format";
import {
  cumulativeClaimSeries,
  groupByMint,
  totalsByTokenSeries,
  type ClaimedReward,
  type PendingReward,
} from "@/app/lib/rewards";

export interface RewardsBatchState {
  done: number;
  total: number;
}

export interface RewardsSectionProps {
  pending: PendingReward[];
  claimed: ClaimedReward[];
  /** RFQ key of the single claim currently in flight, if any. */
  claimingRfq: string | null;
  /** Non-null while "Claim all" is running. */
  batch: RewardsBatchState | null;
  onClaim: (reward: PendingReward) => void;
  onClaimAll: () => void;
  onView: (rfq: string) => void;
}

// Fixed categorical order — hues follow the token, never its rank in a
// filtered view. The theme ships five chart tokens; rewards realistically
// span far fewer quote mints than that.
const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
] as const;

const AXIS_TICK = { fill: "rgba(255,255,255,0.4)", fontSize: 11 } as const;
const GRID_STROKE = "rgba(255,255,255,0.06)";

function formatDisplayValue(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function formatDay(unixSecs: number): string {
  return new Date(unixSecs * 1000).toLocaleDateString();
}

export function RewardsSection({
  pending,
  claimed,
  claimingRfq,
  batch,
  onClaim,
  onClaimAll,
  onView,
}: RewardsSectionProps) {
  const groups = useMemo(() => groupByMint(pending, claimed), [pending, claimed]);
  const lineSeries = useMemo(() => cumulativeClaimSeries(claimed), [claimed]);
  const barSeries = useMemo(() => totalsByTokenSeries(pending, claimed), [pending, claimed]);
  const claimedSymbols = useMemo(
    () => groups.filter((g) => g.claimedTotal > 0n).map((g) => g.symbol),
    [groups],
  );
  const reducedMotion = useReducedMotion() ?? false;
  const animate = !reducedMotion;

  const colorFor = (symbol: string): string =>
    CHART_COLORS[claimedSymbols.indexOf(symbol) % CHART_COLORS.length] ?? CHART_COLORS[0];

  return (
    <div className="space-y-4">
      {/* 1 — per-mint totals, one tile per mint (never a cross-mint sum) */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {groups.map((g) => (
          <MintTile key={g.mint} {...g} />
        ))}
      </div>

      {/* 2 — batch claim */}
      {pending.length > 1 && (
        <Button
          onClick={onClaimAll}
          disabled={batch !== null || claimingRfq !== null}
          size="sm"
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/20 disabled:opacity-60"
        >
          {batch !== null ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Claiming {batch.done}/{batch.total}…
            </>
          ) : (
            <>
              <HandCoins className="mr-2 h-4 w-4" />
              Claim all ({pending.length})
            </>
          )}
        </Button>
      )}

      {/* 3 + 4 — tabbed rows */}
      <Tabs defaultValue={pending.length > 0 ? "pending" : "claimed"}>
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="claimed">Claimed ({claimed.length})</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <RewardRows
            pending={pending}
            claimed={[]}
            claimingRfq={claimingRfq}
            batchRunning={batch !== null}
            onClaim={onClaim}
            onView={onView}
          />
        </TabsContent>
        <TabsContent value="claimed">
          <RewardRows
            pending={[]}
            claimed={claimed}
            claimingRfq={claimingRfq}
            batchRunning={batch !== null}
            onClaim={onClaim}
            onView={onView}
          />
        </TabsContent>
        <TabsContent value="all">
          <RewardRows
            pending={pending}
            claimed={claimed}
            claimingRfq={claimingRfq}
            batchRunning={batch !== null}
            onClaim={onClaim}
            onView={onView}
          />
        </TabsContent>
      </Tabs>

      {/* 5 — earnings charts */}
      {claimed.length >= 2 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:p-4">
            <h4 className="text-xs uppercase tracking-wider text-white/50 mb-2">
              Cumulative claims
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineSeries} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis
                  dataKey="at"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={formatDay}
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={formatDisplayValue}
                />
                <Tooltip
                  content={<ChartTip labelFormatter={formatDay} valueSuffix="name" />}
                  cursor={{ stroke: "rgba(255,255,255,0.15)" }}
                />
                {claimedSymbols.length >= 2 && <Legend formatter={legendText} />}
                {claimedSymbols.map((symbol) => (
                  <Line
                    key={symbol}
                    type="monotone"
                    dataKey={symbol}
                    stroke={colorFor(symbol)}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={animate}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:p-4">
            <h4 className="text-xs uppercase tracking-wider text-white/50 mb-2">
              Pending vs claimed
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barSeries} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="symbol" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={formatDisplayValue}
                />
                <Tooltip
                  content={<ChartTip valueSuffix="label" />}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Legend formatter={legendText} />
                <Bar
                  dataKey="pending"
                  name="Pending"
                  fill="var(--color-chart-2)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={animate}
                />
                <Bar
                  dataKey="claimed"
                  name="Claimed"
                  fill="var(--color-chart-1)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={animate}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="text-xs text-white/40">Earnings chart appears after a couple of claims</p>
      )}
    </div>
  );
}

function legendText(value: unknown): ReactNode {
  return <span className="text-xs text-white/60">{String(value)}</span>;
}

function MintTile({
  symbol,
  decimals,
  pendingTotal,
  claimedTotal,
}: {
  symbol: string;
  decimals: number;
  pendingTotal: bigint;
  claimedTotal: bigint;
}) {
  const hasPending = pendingTotal > 0n;
  return (
    <div
      className={`flex-shrink-0 min-w-44 rounded-lg border px-3 py-2.5 sm:px-4 sm:py-3 ${
        hasPending
          ? "bg-gradient-to-br from-green-500/15 to-emerald-500/10 border-green-500/30"
          : "bg-white/5 border-white/10"
      }`}
    >
      <div
        className={`text-lg sm:text-xl font-bold ${hasPending ? "text-green-400" : "text-white/70"}`}
      >
        {formatTokenAmount(pendingTotal, decimals)} {symbol}
        <span className="ml-1.5 text-xs font-normal text-white/50">to claim</span>
      </div>
      <div className="text-xs text-white/50 mt-0.5">
        {formatTokenAmount(claimedTotal, decimals)} {symbol} claimed
      </div>
    </div>
  );
}

function RewardRows({
  pending,
  claimed,
  claimingRfq,
  batchRunning,
  onClaim,
  onView,
}: {
  pending: PendingReward[];
  claimed: ClaimedReward[];
  claimingRfq: string | null;
  batchRunning: boolean;
  onClaim: (reward: PendingReward) => void;
  onView: (rfq: string) => void;
}) {
  if (pending.length === 0 && claimed.length === 0) {
    return <p className="text-sm text-white/40 py-3">Nothing here.</p>;
  }
  return (
    <div className="space-y-3 pt-2">
      {pending.map((reward) => (
        <PendingRewardRow
          key={reward.rfq}
          reward={reward}
          claiming={claimingRfq === reward.rfq}
          disabled={batchRunning || claimingRfq !== null}
          onClaim={() => onClaim(reward)}
          onView={() => onView(reward.rfq)}
        />
      ))}
      {claimed.map((reward) => (
        <ClaimedRewardRow key={reward.tracker} reward={reward} onView={() => onView(reward.rfq)} />
      ))}
    </div>
  );
}

function PendingRewardRow({
  reward,
  claiming,
  disabled,
  onClaim,
  onView,
}: {
  reward: PendingReward;
  claiming: boolean;
  disabled: boolean;
  onClaim: () => void;
  onView: () => void;
}) {
  return (
    <div className="bg-white/5 border border-green-500/20 rounded-lg p-4 hover:border-green-500/40 transition-all flex items-center justify-between gap-3">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="p-3 rounded-lg bg-green-500/20">
          <HandCoins className="h-5 w-5 text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-sm">
            <span className="text-white/50">From</span>
            <button onClick={onView} className="text-cyan-400 hover:text-cyan-300 truncate">
              {reward.pair}
            </button>
          </div>
          {reward.settledAt !== null && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Clock className="h-3 w-3" />
              <span>Settled {formatDay(reward.settledAt)}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <div className="text-lg sm:text-xl font-bold text-green-400">
            {formatTokenAmount(reward.amount, reward.decimals)}
          </div>
          <div className="text-xs text-white/40">{reward.symbol}</div>
        </div>
        <Button
          onClick={onClaim}
          disabled={disabled}
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
      </div>
    </div>
  );
}

function ClaimedRewardRow({ reward, onView }: { reward: ClaimedReward; onView: () => void }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all flex items-center justify-between gap-3">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="p-3 rounded-lg bg-state-settled/20">
          <CheckCircle2 className="h-5 w-5 text-state-settled" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-sm">
            <span className="text-white/50">From</span>
            <button onClick={onView} className="text-cyan-400 hover:text-cyan-300 truncate">
              {reward.pair ?? truncateAddress(reward.rfq)}
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Clock className="h-3 w-3" />
            <span>Claimed {formatDay(reward.claimedAt)}</span>
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-lg sm:text-xl font-bold text-white/60">
          {formatTokenAmount(reward.amount, reward.decimals)}
        </div>
        <div className="text-xs text-white/40">{reward.symbol}</div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Compact dark tooltip. `valueSuffix` picks what follows each value:
// - "name": the series name (the mint symbol on the cumulative line chart)
// - "label": the x label (the mint symbol on the pending-vs-claimed bars)
// --------------------------------------------------------------------------

interface ChartTipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
}

function ChartTip({
  active,
  payload,
  label,
  labelFormatter,
  valueSuffix,
}: {
  active?: boolean;
  payload?: ReadonlyArray<ChartTipEntry>;
  label?: string | number;
  labelFormatter?: (label: number) => string;
  valueSuffix: "name" | "label";
}) {
  if (!active || !payload || payload.length === 0) return null;
  const heading =
    label === undefined ? null : labelFormatter ? labelFormatter(Number(label)) : String(label);
  return (
    <div className="rounded-lg border border-white/10 bg-[#12141d]/95 px-3 py-2 text-xs shadow-xl">
      {heading !== null && <div className="text-white/50 mb-1">{heading}</div>}
      <div className="space-y-0.5">
        {payload.map((entry, i) => {
          const suffix = valueSuffix === "name" ? String(entry.name ?? "") : String(label ?? "");
          const prefix = valueSuffix === "label" ? `${String(entry.name ?? "")} ` : "";
          return (
            <div key={i} className="flex items-center gap-1.5 text-white/90">
              <span
                className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                style={{ background: entry.color }}
              />
              <span>
                {prefix}
                {formatDisplayValue(Number(entry.value ?? 0))} {suffix}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
