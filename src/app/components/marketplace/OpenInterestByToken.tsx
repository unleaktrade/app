import { useState } from "react";
import { motion } from "motion/react";
import { PieChart, Pie, Cell } from "recharts";
import { PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import type { TokenBucket } from "@/app/lib/market-stats";
import { formatTokenAmount } from "@/app/lib/format";

// Cycled per quote mint — buckets arrive sorted by count desc from market-stats.
const BUCKET_COLORS = ["#06b6d4", "#10b981", "#3b82f6", "#f59e0b", "#a855f7", "#6b7280"];

function bucketColor(index: number): string {
  return BUCKET_COLORS[index % BUCKET_COLORS.length] ?? "#6b7280";
}

interface OpenInterestByTokenProps {
  /** Open RFQs bucketed per quote mint (from computeMarketStats). */
  buckets: TokenBucket[];
}

/**
 * Donut/bar breakdown of Open RFQs per quote mint. Slice value is the RFQ
 * count; each legend row shows the per-mint Σ minQuoteAmount — amounts are
 * never merged across mints.
 */
export function OpenInterestByToken({ buckets }: OpenInterestByTokenProps) {
  const [chartType, setChartType] = useState<"donut" | "bar">("donut");
  const totalOpen = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5">
      <h3 className="text-base font-semibold text-white mb-4">Open interest by token</h3>

      {buckets.length === 0 ? (
        <div className="py-10 text-center text-sm text-white/40">
          No open RFQs right now — new activity will show up here.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Chart Type Toggle */}
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
              <button
                onClick={() => setChartType("donut")}
                aria-label="Donut chart view"
                aria-pressed={chartType === "donut"}
                className={`p-1.5 rounded transition-all ${
                  chartType === "donut"
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                <PieChartIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setChartType("bar")}
                aria-label="Bar chart view"
                aria-pressed={chartType === "bar"}
                className={`p-1.5 rounded transition-all ${
                  chartType === "bar"
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Chart - Animated Switch */}
          <motion.div
            key={chartType}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {chartType === "donut" ? (
              <div className="flex justify-center">
                <div className="relative">
                  <PieChart width={160} height={160}>
                    <defs>
                      {buckets.map((bucket, index) => (
                        <linearGradient
                          key={`gradient-${bucket.mint}`}
                          id={`gradient-${bucket.mint}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor={bucketColor(index)} stopOpacity={1} />
                          <stop offset="100%" stopColor={bucketColor(index)} stopOpacity={0.6} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={buckets.map((bucket) => ({ name: bucket.symbol, value: bucket.count }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {buckets.map((bucket) => (
                        <Cell
                          key={`cell-${bucket.mint}`}
                          fill={`url(#gradient-${bucket.mint})`}
                          className="transition-all duration-300 hover:opacity-80"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <div className="text-2xl font-bold text-white">{buckets.length}</div>
                    <div className="text-xs text-white/50">
                      {buckets.length === 1 ? "token" : "tokens"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {buckets.map((bucket, index) => (
                  <motion.div
                    key={bucket.mint}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: bucketColor(index) }}
                        />
                        <span className="text-sm text-white font-medium">{bucket.symbol}</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{bucket.count}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(bucket.count / totalOpen) * 100}%` }}
                        transition={{ duration: 0.6, delay: index * 0.05, ease: "easeOut" }}
                        className="h-full rounded-full relative overflow-hidden"
                        style={{
                          background: `linear-gradient(90deg, ${bucketColor(index)} 0%, ${bucketColor(index)}99 100%)`,
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Legend: symbol · count · Σ minQuoteAmount per mint */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            {buckets.map((bucket, index) => (
              <div
                key={bucket.mint}
                className="flex items-center justify-between group hover:bg-white/5 rounded px-2 py-1 -mx-2 transition-all"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-110"
                    style={{ backgroundColor: bucketColor(index) }}
                  />
                  <span className="text-sm text-white">{bucket.symbol}</span>
                  <span className="text-xs text-white/40">
                    {bucket.count} RFQ{bucket.count !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-sm font-semibold text-white">
                  {formatTokenAmount(bucket.totalAmount, bucket.decimals)}{" "}
                  <span className="text-white/50 font-normal">{bucket.symbol}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
