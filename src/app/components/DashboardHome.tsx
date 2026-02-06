import { motion, AnimatePresence } from "motion/react";
import { RFQ, UserRole } from "@/app/App";
import { StatusBadge } from "@/app/components/StatusBadge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Activity, Coins, DollarSign, Users, Search, Eye, Plus, ArrowRight, Grid3x3, List, Clock, Shield, TrendingUp } from "lucide-react";
import { useState } from "react";
import { mockRFQs, getCardGradient, getCardBorder, getCardGlow } from "@/app/data/mockRFQs";

interface DashboardHomeProps {
  onCreateRFQ: () => void;
  onBrowseRFQs: () => void;
  onViewRFQ: (rfqId: string) => void;
  onQuoteRFQ: (rfq: RFQ) => void;
}

export function DashboardHome({ onCreateRFQ, onBrowseRFQs, onViewRFQ, onQuoteRFQ }: DashboardHomeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [showMyRFQs, setShowMyRFQs] = useState(false);

  // Liquidity data for the donut chart
  const liquidityData = [
    { token: "USDC", value: 35, color: "#2775ca" },
    { token: "wSOL", value: 28, color: "#14f195" },
    { token: "USDT", value: 18, color: "#26a17b" },
    { token: "JUP", value: 12, color: "#c7f284" },
    { token: "Others", value: 7, color: "#667085" },
  ];
  const totalLiquidityValue = liquidityData.reduce((sum, item) => sum + item.value, 0);

  // Stats
  const stats = [
    { label: "Active RFQs", value: "12", subtext: "8 filling soon", icon: Activity, gradient: "from-cyan-500 to-blue-500" },
    { label: "24h Volume", value: "$2.4M", subtext: "+18.2% vs yesterday", icon: Coins, gradient: "from-cyan-500 to-blue-500" },
    { label: "Your Quotes", value: "3", subtext: "2 pending selection", icon: Users, gradient: "from-green-500 to-emerald-500" },
    { label: "Completed", value: "47", subtext: "Since launch", icon: DollarSign, gradient: "from-orange-500 to-red-500" },
  ];

  // Filter RFQs
  const filteredRFQs = mockRFQs
    .filter(rfq => {
      if (statusFilter !== "all" && rfq.state.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (searchQuery && !rfq.pair.toLowerCase().includes(searchQuery.toLowerCase()) && !rfq.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-32">
      {/* Gradient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Stats Grid - Beautiful cards with gradients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5 group hover:border-white/20 transition-all"
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-xs text-white/50 mb-1">{stat.label}</div>
                  <div className="text-xs text-white/40">{stat.subtext}</div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6 mb-8">
          {/* Liquidity Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all"
          >
            <h3 className="text-lg font-semibold text-white mb-6">Liquidity by Token</h3>
            
            {/* Donut Chart */}
            <div className="relative w-48 h-48 mx-auto mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="35" fill="none" stroke="#1a1a2e" strokeWidth="14" />
                {liquidityData.reduce((acc, item, index) => {
                  const totalBefore = liquidityData.slice(0, index).reduce((sum, i) => sum + i.value, 0);
                  const percentage = item.value / totalLiquidityValue;
                  const offset = (totalBefore / totalLiquidityValue) * 220;
                  const strokeDasharray = `${percentage * 220} 220`;
                  
                  return [
                    ...acc,
                    <circle
                      key={item.token}
                      cx="50"
                      cy="50"
                      r="35"
                      fill="none"
                      stroke={item.color}
                      strokeWidth="14"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={-offset}
                      strokeLinecap="round"
                      className="transition-all hover:stroke-width-16"
                    />
                  ];
                }, [] as JSX.Element[])}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">100%</div>
                  <div className="text-xs text-white/50">Total</div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2">
              {liquidityData.map((item) => (
                <div key={item.token} className="flex items-center justify-between text-sm group/item hover:bg-white/5 rounded px-2 py-1 -mx-2 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full transition-transform group-hover/item:scale-110" style={{ backgroundColor: item.color }} />
                    <span className="text-white/80">{item.token}</span>
                  </div>
                  <span className="text-white font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Market Overview</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onBrowseRFQs}
                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
              >
                Browse All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <div className="text-xs text-white/50">Open RFQs</div>
                    <div className="text-2xl font-bold text-white">{mockRFQs.filter(r => r.status === "Open").length}</div>
                  </div>
                </div>
                <div className="text-xs text-green-400">+3 in last hour</div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Clock className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-xs text-white/50">Avg. Fill Time</div>
                    <div className="text-2xl font-bold text-white">12m</div>
                  </div>
                </div>
                <div className="text-xs text-blue-400">-2m vs yesterday</div>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Shield className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-xs text-white/50">Total Bonded</div>
                    <div className="text-2xl font-bold text-white">$4.2M</div>
                  </div>
                </div>
                <div className="text-xs text-cyan-400">In bonds & escrow</div>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <Users className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <div className="text-xs text-white/50">Active Traders</div>
                    <div className="text-2xl font-bold text-white">87</div>
                  </div>
                </div>
                <div className="text-xs text-orange-400">+12 this week</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Activity className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-xs text-white/50">Settlement Rate</div>
                    <div className="text-2xl font-bold text-white">94.2%</div>
                  </div>
                </div>
                <div className="text-xs text-purple-400">Last 7 days</div>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-yellow-500/20">
                    <Coins className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-xs text-white/50">Avg. Spread</div>
                    <div className="text-2xl font-bold text-white">0.18%</div>
                  </div>
                </div>
                <div className="text-xs text-yellow-400">vs 0.32% CEX avg</div>
              </div>
            </div>

            {/* Top Pairs & Recent Activity */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Top Pairs */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-cyan-400" />
                  Top Pairs (24h)
                </h4>
                <div className="space-y-2.5">
                  {[
                    { pair: "wSOL/USDC", volume: "$842K", change: "+12.4%", color: "text-green-400" },
                    { pair: "USDC/USDT", volume: "$624K", change: "+8.1%", color: "text-green-400" },
                    { pair: "JUP/USDC", volume: "$418K", change: "-2.3%", color: "text-red-400" },
                  ].map((item) => (
                    <div key={item.pair} className="flex items-center justify-between text-sm hover:bg-white/5 rounded px-2 py-1.5 -mx-2 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Coins className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="text-white font-medium">{item.pair}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white/60">{item.volume}</span>
                        <span className={`${item.color} font-medium text-xs`}>{item.change}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  Recent Activity
                </h4>
                <div className="space-y-2.5">
                  {[
                    { action: "RFQ Settled", pair: "wSOL/USDC", time: "2m ago", color: "text-green-400" },
                    { action: "Quote Submitted", pair: "USDC/USDT", time: "5m ago", color: "text-blue-400" },
                    { action: "RFQ Created", pair: "JUP/wSOL", time: "8m ago", color: "text-purple-400" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm hover:bg-white/5 rounded px-2 py-1.5 -mx-2 transition-colors">
                      <div>
                        <div className={`${item.color} font-medium text-xs mb-0.5`}>{item.action}</div>
                        <div className="text-white/60 text-xs">{item.pair}</div>
                      </div>
                      <span className="text-white/40 text-xs">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* RFQ List / Marketplace */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">RFQ Marketplace</h3>
              <p className="text-sm text-white/50">{filteredRFQs.length} RFQs available</p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={viewMode === "cards" ? "default" : "ghost"}
                onClick={() => setViewMode("cards")}
                className={viewMode === "cards" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "table" ? "default" : "ghost"}
                onClick={() => setViewMode("table")}
                className={viewMode === "table" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search by ID, pair, or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            
            <Button
              variant={showMyRFQs ? "default" : "outline"}
              onClick={() => setShowMyRFQs(!showMyRFQs)}
              className={showMyRFQs ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white" : "bg-white/10 border-white/30 text-white/90 hover:bg-white/[0.15] hover:border-white/40 hover:text-white"}
            >
              My RFQs
            </Button>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="committed">Committed</SelectItem>
                <SelectItem value="revealed">Revealed</SelectItem>
                <SelectItem value="selected">Selected</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
                <SelectItem value="ignored">Ignored</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cards or Table View */}
          <AnimatePresence mode="wait">
            {viewMode === "cards" ? (
              <motion.div
                key="cards"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filteredRFQs.slice(0, 12).map((rfq, index) => {
                  const [base, quote] = rfq.pair.split('/');
                  
                  return (
                    <motion.div
                      key={rfq.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={`relative overflow-hidden ${getCardGradient(rfq.state)} backdrop-blur-sm border ${getCardBorder(rfq.state)} rounded-xl p-5 transition-all group`}
                    >
                      {/* Glossy gradient overlay on hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${getCardGlow(rfq.state)} transition-all duration-300`} />
                      
                      <div className="relative z-10">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="text-xs font-mono text-white/40 mb-1">RFQ ID</div>
                            <div className="text-sm font-mono text-white">{rfq.id}</div>
                          </div>
                          <StatusBadge status={rfq.state} />
                        </div>

                        {/* Pair */}
                        <div className="mb-4">
                          <div className="text-xs text-white/50 mb-1">Pair</div>
                          <div className="flex items-center gap-1 text-lg font-semibold text-white">
                            <Coins className="h-4 w-4 text-cyan-400" />
                            {rfq.pair}
                          </div>
                        </div>

                        {/* Amounts */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div>
                            <div className="text-xs text-white/50 mb-1">Base Amount</div>
                            <div className="text-sm font-semibold text-white">{rfq.baseAmount.toLocaleString()}</div>
                            <div className="text-xs text-white/40">{base}</div>
                          </div>
                          <div>
                            <div className="text-xs text-white/50 mb-1">Quote Amount</div>
                            <div className="text-sm font-semibold text-white">{rfq.quoteAmount.toLocaleString()}</div>
                            <div className="text-xs text-white/40">{quote}</div>
                          </div>
                        </div>

                        {/* Exchange Rate */}
                        <div className="mb-4 pb-4 border-b border-white/10">
                          <div className="text-xs text-white/50 mb-1">Exchange Rate</div>
                          <div className="text-sm text-white">1 {base} = {rfq.price.toFixed(4)} {quote}</div>
                        </div>

                        {/* Expires */}
                        {rfq.expires && (
                          <div className="mb-4 text-xs">
                            <span className="text-white/50">Expires in </span>
                            <span className="text-cyan-400 font-medium">{rfq.expires}</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewRFQ(rfq.id)}
                            className="flex-1 bg-white/10 border-white/30 text-white/90 hover:bg-white/[0.15] hover:border-white/40 hover:text-white"
                          >
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            View
                          </Button>
                          {rfq.state === "Open" && (
                            <Button
                              size="sm"
                              onClick={() => onQuoteRFQ(rfq)}
                              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                            >
                              Quote on this RFQ
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="table"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="overflow-x-auto -mx-6 px-6"
              >
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-xs text-white/50 font-medium pb-3 pr-4">ID</th>
                      <th className="text-left text-xs text-white/50 font-medium pb-3 pr-4">Pair</th>
                      <th className="text-right text-xs text-white/50 font-medium pb-3 pr-4">Base Amount</th>
                      <th className="text-right text-xs text-white/50 font-medium pb-3 pr-4">Quote Amount</th>
                      <th className="text-left text-xs text-white/50 font-medium pb-3 pr-4">Status</th>
                      <th className="text-right text-xs text-white/50 font-medium pb-3 pr-4">Expires</th>
                      <th className="text-right text-xs text-white/50 font-medium pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRFQs.map((rfq) => {
                      return (
                        <tr key={rfq.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 pr-4">
                            <span className="text-xs font-mono text-white/60">{rfq.id}</span>
                          </td>
                          <td className="py-4 pr-4">
                            <span className="text-sm font-medium text-white">{rfq.pair}</span>
                          </td>
                          <td className="py-4 pr-4 text-right">
                            <div className="text-sm text-white">{rfq.baseAmount.toLocaleString()}</div>
                            <div className="text-xs text-white/40">{rfq.pair.split('/')[0]}</div>
                          </td>
                          <td className="py-4 pr-4 text-right">
                            <div className="text-sm text-white">{rfq.quoteAmount.toLocaleString()}</div>
                            <div className="text-xs text-white/40">{rfq.pair.split('/')[1]}</div>
                          </td>
                          <td className="py-4 pr-4">
                            <StatusBadge status={rfq.state} showIcon={false} />
                          </td>
                          <td className="py-4 pr-4 text-right">
                            <span className="text-sm text-white/60">{rfq.expires || "—"}</span>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onViewRFQ(rfq.id)}
                                className="text-white/60 hover:text-white hover:bg-white/10 h-8 px-3"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {rfq.status === "Open" && (
                                <Button
                                  size="sm"
                                  onClick={() => onQuoteRFQ(rfq)}
                                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white h-8 px-3"
                                >
                                  Quote
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}