import { motion } from "motion/react";
import { useState } from "react";
import { RFQ, mockRFQs, CURRENT_USER_FULL } from "@/app/data/enhancedMockData";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { StatusBadge } from "@/app/components/StatusBadge";
import { getCardGradient, getCardBorder } from "@/app/data/mockRFQs";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from "recharts";
import {
  Search, Filter, TrendingUp, Activity, Clock, Shield,
  Coins, ChevronDown, LayoutGrid, List, Eye,
  Users, Target, Zap, Percent, ArrowRight, PieChart as PieChartIcon, BarChart3,
  Columns3, Rows3, ChevronUp, MousePointerClick
} from "lucide-react";

interface MarketplaceProps {
  onQuoteRFQ: (rfq: RFQ) => void;
  onViewRFQ: (rfqId: string) => void;
}

export function Marketplace({ onQuoteRFQ, onViewRFQ }: MarketplaceProps) {
  const allStates = ["Draft", "Open", "Committed", "Revealed", "Selected", "Settled", "Expired", "Ignored", "Incomplete"] as const;

  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | "draft" | "open" | "committed" | "revealed" | "selected" | "settled" | "expired" | "ignored" | "incomplete">("all");
  const [sortBy, setSortBy] = useState<"newest" | "expiring" | "volume">("newest");
  const [viewMode, setViewMode] = useState<"card" | "list" | "swimlane" | "horizontal">("horizontal");
  
  // Expansion state for horizontal view - Closed by default
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());

  // Toggle a single state
  const toggleStateExpansion = (state: string) => {
    setExpandedStates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(state)) {
        newSet.delete(state);
      } else {
        newSet.add(state);
      }
      return newSet;
    });
  };
  
  // Filter RFQs: Show ALL states including Draft
  // Exclude my own RFQs
  const availableRFQs = mockRFQs.filter(rfq => {
    // Don't show my own RFQs
    if (rfq.maker === CURRENT_USER_FULL) return false;
    
    // Apply state filter
    if (stateFilter === "draft" && rfq.state !== "Draft") return false;
    if (stateFilter === "open" && rfq.state !== "Open") return false;
    if (stateFilter === "committed" && rfq.state !== "Committed") return false;
    if (stateFilter === "revealed" && rfq.state !== "Revealed") return false;
    if (stateFilter === "selected" && rfq.state !== "Selected") return false;
    if (stateFilter === "settled" && rfq.state !== "Settled") return false;
    if (stateFilter === "expired" && rfq.state !== "Expired") return false;
    if (stateFilter === "ignored" && rfq.state !== "Ignored") return false;
    if (stateFilter === "incomplete" && rfq.state !== "Incomplete") return false;
    
    // Apply search filter
    if (searchQuery && !rfq.pair.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Sort RFQs
  const sortedRFQs = [...availableRFQs].sort((a, b) => {
    if (sortBy === "newest") {
      return (b.createdAt || 0) - (a.createdAt || 0);
    }
    return 0;
  });

  // Group RFQs by state for swimlane view
  const rfqsByState = {
    Draft: sortedRFQs.filter(r => r.state === "Draft"),
    Open: sortedRFQs.filter(r => r.state === "Open"),
    Committed: sortedRFQs.filter(r => r.state === "Committed"),
    Revealed: sortedRFQs.filter(r => r.state === "Revealed"),
    Selected: sortedRFQs.filter(r => r.state === "Selected"),
    Settled: sortedRFQs.filter(r => r.state === "Settled"),
    Expired: sortedRFQs.filter(r => r.state === "Expired"),
    Ignored: sortedRFQs.filter(r => r.state === "Ignored"),
    Incomplete: sortedRFQs.filter(r => r.state === "Incomplete"),
  };

  // State background gradients
  const getStateBgGradient = (state: string) => {
    switch (state) {
      case "Draft": return "from-slate-500/10 to-slate-600/5";
      case "Open": return "from-cyan-500/10 to-cyan-600/5";
      case "Committed": return "from-purple-500/10 to-purple-600/5";
      case "Revealed": return "from-indigo-500/10 to-indigo-600/5";
      case "Selected": return "from-blue-500/10 to-blue-600/5";
      case "Settled": return "from-teal-500/10 to-teal-600/5";
      case "Expired": return "from-orange-500/10 to-orange-600/5";
      case "Ignored": return "from-gray-500/10 to-gray-600/5";
      case "Incomplete": return "from-red-500/10 to-red-600/5";
      default: return "from-white/5 to-white/2";
    }
  };

  const getStateTitleColor = (state: string) => {
    switch (state) {
      case "Draft": return "text-slate-400";
      case "Open": return "text-cyan-400";
      case "Committed": return "text-purple-400";
      case "Revealed": return "text-indigo-400";
      case "Selected": return "text-blue-400";
      case "Settled": return "text-teal-400";
      case "Expired": return "text-orange-400";
      case "Ignored": return "text-gray-400";
      case "Incomplete": return "text-red-400";
      default: return "text-white";
    }
  };

  const getStateSubtitle = (state: string) => {
    switch (state) {
      case "Draft": return "Complete and open these RFQs";
      case "Open": return "Ready to quote";
      case "Committed": return "Awaiting reveals";
      case "Revealed": return "Review quotes";
      case "Selected": return "Waiting for settlement";
      case "Settled": return "Completed trades";
      case "Expired": return "Time expired";
      case "Ignored": return "Not pursued";
      case "Incomplete": return "Missing information";
      default: return "";
    }
  };

  // Stats
  const openCount = mockRFQs.filter(r => r.state === "Open" && r.maker !== CURRENT_USER_FULL).length;
  const committedCount = mockRFQs.filter(r => r.state === "Committed" && r.maker !== CURRENT_USER_FULL).length;
  const totalVolume = mockRFQs
    .filter(r => r.state === "Settled")
    .reduce((sum, rfq) => sum + rfq.baseAmount, 0);

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20 lg:pt-24 pb-16 sm:pb-32">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute top-60 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            RFQ Marketplace
          </h1>
          <p className="text-base sm:text-lg text-white/60">
            {sortedRFQs.length} RFQs available
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard
            label="Open RFQs"
            value={openCount.toString()}
            subtext="Ready to quote"
            icon={Activity}
            gradient="from-green-500 to-emerald-500"
          />
          <StatCard
            label="Committed"
            value={committedCount.toString()}
            subtext="Awaiting reveals"
            icon={Clock}
            gradient="from-blue-500 to-cyan-500"
          />
          <StatCard
            label="24h Volume"
            value={`${(totalVolume / 1000000).toFixed(1)}M`}
            subtext="Total traded"
            icon={TrendingUp}
            gradient="from-cyan-500 to-blue-500"
          />
          <StatCard
            label="Avg Bond"
            value="4.2K"
            subtext="USDC required"
            icon={Shield}
            gradient="from-purple-500 to-indigo-500"
          />
        </div>

        {/* Analytics Section */}
        <div className="grid lg:grid-cols-[320px_1fr] gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Liquidity by Token - Compact */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5">
            <h3 className="text-base font-semibold text-white mb-4">Liquidity by Token</h3>
            <LiquidityChart />
          </div>

          {/* Market Overview - Wider */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Market Overview</h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-cyan-400 hover:text-cyan-300 hover:bg-white/5 text-xs font-semibold"
              >
                Browse All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
            <MarketOverview />
          </div>
        </div>

        {/* Main RFQ Container - Everything in ONE CARD */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6">
          {/* Search Bar + All States Dropdown + Grid/List Toggle */}
          <div className="flex flex-col lg:flex-row gap-3 mb-6 items-stretch">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
              <Input
                placeholder="Search by ID, pair, or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/40 text-base rounded-xl"
              />
            </div>

            {/* All States Dropdown */}
            <div className="relative flex-shrink-0">
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value as any)}
                className="w-full lg:w-auto h-12 appearance-none bg-white/5 border border-white/10 text-white rounded-xl px-4 pr-10 text-sm cursor-pointer hover:bg-white/10 transition-colors font-semibold"
              >
                <option value="all">All States</option>
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="committed">Committed</option>
                <option value="revealed">Revealed</option>
                <option value="selected">Selected</option>
                <option value="settled">Settled</option>
                <option value="expired">Expired</option>
                <option value="ignored">Ignored</option>
                <option value="incomplete">Incomplete</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1 flex-shrink-0">
              <Button
                onClick={() => setViewMode("horizontal")}
                variant="ghost"
                size="sm"
                className={`p-2.5 ${
                  viewMode === "horizontal"
                    ? "bg-white/20 text-white"
                    : "text-white/40 hover:text-white hover:bg-white/10"
                }`}
              >
                <Rows3 className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setViewMode("card")}
                variant="ghost"
                size="sm"
                className={`p-2.5 ${
                  viewMode === "card"
                    ? "bg-white/20 text-white"
                    : "text-white/40 hover:text-white hover:bg-white/10"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setViewMode("list")}
                variant="ghost"
                size="sm"
                className={`p-2.5 ${
                  viewMode === "list"
                    ? "bg-white/20 text-white"
                    : "text-white/40 hover:text-white hover:bg-white/10"
                }`}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setViewMode("swimlane")}
                variant="ghost"
                size="sm"
                className={`p-2.5 ${
                  viewMode === "swimlane"
                    ? "bg-white/20 text-white"
                    : "text-white/40 hover:text-white hover:bg-white/10"
                }`}
              >
                <Columns3 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-4">
            <p className="text-sm text-white/50">
              Showing {sortedRFQs.length} RFQ{sortedRFQs.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* RFQ Grid */}
          {sortedRFQs.length > 0 ? (
            viewMode === "card" ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedRFQs.map((rfq) => (
                  <RFQMarketplaceCard
                    key={rfq.publicKey}
                    rfq={rfq}
                    onQuote={() => onQuoteRFQ(rfq)}
                    onView={() => onViewRFQ(rfq.publicKey)}
                  />
                ))}
              </div>
            ) : viewMode === "list" ? (
              <div className="space-y-3">
                {sortedRFQs.map((rfq) => (
                  <RFQMarketplaceListItem
                    key={rfq.publicKey}
                    rfq={rfq}
                    onQuote={() => onQuoteRFQ(rfq)}
                    onView={() => onViewRFQ(rfq.publicKey)}
                  />
                ))}
              </div>
            ) : viewMode === "horizontal" ? (
              <div className="space-y-6">
                {allStates.map((state) => {
                  const stateRFQs = rfqsByState[state];
                  const stateCount = stateRFQs.length;
                  
                  // Skip empty states in horizontal view
                  if (stateCount === 0) return null;

                  return (
                    <motion.div
                      key={state}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-gradient-to-br ${getStateBgGradient(state)} backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden`}
                    >
                      {/* Section Header - Clickable */}
                      <button
                        onClick={() => toggleStateExpansion(state)}
                        className="w-full p-5 flex items-center justify-between transition-all group/header border-b border-white/5"
                      >
                        <div>
                          <h3 className={`text-lg font-semibold ${getStateTitleColor(state)} mb-1 text-left group-hover/header:text-opacity-80 transition-all`}>
                            {state} ({stateCount})
                          </h3>
                          <p className="text-sm text-white/50 text-left">{getStateSubtitle(state)}</p>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                          {expandedStates.has(state) ? (
                            <ChevronUp className="h-5 w-5 text-white/60 group-hover/header:text-white/80 transition-colors" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-white/60 group-hover/header:text-white/80 transition-colors" />
                          )}
                        </div>
                      </button>

                      {/* Horizontal scrolling cards - Collapsible */}
                      {expandedStates.has(state) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="overflow-x-auto px-5 pb-5 pt-4">
                            <div className="flex gap-3 pb-2">
                              {stateRFQs.map((rfq) => (
                                <div key={rfq.publicKey} className="flex-shrink-0 w-80">
                                  <RFQMarketplaceCard
                                    rfq={rfq}
                                    onQuote={() => onQuoteRFQ(rfq)}
                                    onView={() => onViewRFQ(rfq.publicKey)}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                <div className="flex gap-4 pb-4 min-w-max">
                  {allStates.map((state) => {
                    const stateRFQs = rfqsByState[state];
                    const stateCount = stateRFQs.length;
                    
                    // Skip empty states in swimlane view
                    if (stateCount === 0) return null;

                    return (
                      <motion.div
                        key={state}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex-shrink-0 w-80"
                      >
                        {/* Column Header */}
                        <div className={`${getCardGradient(state)} border ${getCardBorder(state)} rounded-t-xl p-4 backdrop-blur-sm`}>
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-white">{state}</h3>
                            <span className="text-sm text-white/60">{stateCount}</span>
                          </div>
                          <StatusBadge status={state} />
                        </div>

                        {/* Column Content */}
                        <div className="bg-white/5 border-x border-b border-white/10 rounded-b-xl p-3 space-y-3 max-h-[600px] overflow-y-auto">
                          {stateRFQs.map((rfq) => (
                            <RFQMarketplaceCard
                              key={rfq.publicKey}
                              rfq={rfq}
                              onQuote={() => onQuoteRFQ(rfq)}
                              onView={() => onViewRFQ(rfq.publicKey)}
                            />
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
              <Filter className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No RFQs Found</h3>
              <p className="text-sm text-white/50">
                Try adjusting your filters or search query
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components

interface StatCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: any;
  gradient: string;
}

function StatCard({ label, value, subtext, icon: Icon, gradient }: StatCardProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-5 group hover:border-white/20 transition-all">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
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

interface RFQMarketplaceCardProps {
  rfq: RFQ;
  onQuote: () => void;
  onView: () => void;
}

function RFQMarketplaceCard({ rfq, onQuote, onView }: RFQMarketplaceCardProps) {
  const [base, quote] = rfq.pair.split('/');
  const isCommitted = rfq.state === "Committed";
  const canQuote = rfq.state === "Open" || rfq.state === "Committed";
  
  // Get state-based styling
  const cardGradient = getCardGradient(rfq.state);
  const cardBorder = getCardBorder(rfq.state);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group ${cardGradient} backdrop-blur-sm border ${cardBorder} rounded-lg sm:rounded-xl p-4 sm:p-5 transition-all`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
          <span className="font-semibold text-base sm:text-lg text-white">{rfq.pair}</span>
        </div>
        <StatusBadge status={rfq.state} />
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="bg-white/5 rounded-lg p-2 sm:p-3">
          <div className="text-xs text-white/50 mb-1">Base Amount</div>
          <div className="text-xs sm:text-sm font-bold text-white truncate">
            {rfq.baseAmount.toLocaleString()}
          </div>
          <div className="text-xs text-white/40">{base}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 sm:p-3">
          <div className="text-xs text-white/50 mb-1">Min Quote</div>
          <div className="text-xs sm:text-sm font-bold text-white truncate">
            {rfq.minQuoteAmount.toLocaleString()}
          </div>
          <div className="text-xs text-white/40">{quote}</div>
        </div>
      </div>

      {/* Bond & Expiry */}
      <div className="space-y-2 mb-3 sm:mb-4">
        <div className="flex items-center justify-between text-xs bg-white/5 rounded p-2">
          <div className="flex items-center gap-2 text-white/50">
            <Shield className="h-3 w-3 text-cyan-400" />
            <span>Bond Required</span>
          </div>
          <span className="font-semibold text-white">{rfq.bondAmount.toLocaleString()} USDC</span>
        </div>

        {rfq.expiresIn && (
          <div className="flex items-center justify-between text-xs bg-orange-500/10 border border-orange-500/20 rounded p-2">
            <div className="flex items-center gap-2 text-orange-400">
              <Clock className="h-3 w-3" />
              <span>Expires in</span>
            </div>
            <span className="font-semibold text-orange-400">{rfq.expiresIn}</span>
          </div>
        )}

        {isCommitted && (
          <div className="flex items-center justify-between text-xs bg-blue-500/10 border border-blue-500/20 rounded p-2">
            <div className="flex items-center gap-2 text-blue-400">
              <Activity className="h-3 w-3" />
              <span>Commitments</span>
            </div>
            <span className="font-semibold text-blue-400">{rfq.committedCount}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={onView}
          variant="outline"
          size="sm"
          className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 text-xs sm:text-sm"
        >
          View
        </Button>
        {canQuote && (
          <Button
            onClick={onQuote}
            size="sm"
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/20 text-xs sm:text-sm"
          >
            <MousePointerClick className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Quote
          </Button>
        )}
      </div>
    </motion.div>
  );
}

interface RFQMarketplaceListItemProps {
  rfq: RFQ;
  onQuote: () => void;
  onView: () => void;
}

function RFQMarketplaceListItem({ rfq, onQuote, onView }: RFQMarketplaceListItemProps) {
  const [base, quote] = rfq.pair.split('/');
  const isCommitted = rfq.state === "Committed";
  const canQuote = rfq.state === "Open" || rfq.state === "Committed";
  
  // Get state-based styling
  const cardGradient = getCardGradient(rfq.state);
  const cardBorder = getCardBorder(rfq.state);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${cardGradient} backdrop-blur-sm border ${cardBorder} rounded-lg p-4 transition-all hover:border-opacity-60`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Left: Pair + Status */}
        <div className="flex items-center gap-3 lg:w-48">
          <Coins className="h-5 w-5 text-cyan-400 flex-shrink-0" />
          <div>
            <div className="font-semibold text-base text-white">{rfq.pair}</div>
            <StatusBadge status={rfq.state} />
          </div>
        </div>

        {/* Amounts */}
        <div className="flex gap-4 lg:flex-1">
          <div className="flex-1">
            <div className="text-xs text-white/50 mb-1">Base Amount</div>
            <div className="text-sm font-semibold text-white">
              {rfq.baseAmount.toLocaleString()} {base}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs text-white/50 mb-1">Min Quote</div>
            <div className="text-sm font-semibold text-white">
              {rfq.minQuoteAmount.toLocaleString()} {quote}
            </div>
          </div>
        </div>

        {/* Bond & Expiry */}
        <div className="flex gap-4 lg:w-80">
          <div className="flex-1">
            <div className="text-xs text-white/50 mb-1">Bond Required</div>
            <div className="text-sm font-semibold text-white">
              {rfq.bondAmount.toLocaleString()} USDC
            </div>
          </div>
          {rfq.expiresIn && (
            <div className="flex-1">
              <div className="text-xs text-orange-400 mb-1">Expires In</div>
              <div className="text-sm font-semibold text-orange-400">
                {rfq.expiresIn}
              </div>
            </div>
          )}
          {isCommitted && (
            <div className="flex-1">
              <div className="text-xs text-blue-400 mb-1">Commitments</div>
              <div className="text-sm font-semibold text-blue-400">
                {rfq.committedCount}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 lg:w-48">
          <Button
            onClick={onView}
            variant="outline"
            size="sm"
            className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 text-sm"
          >
            <Eye className="mr-1 h-3 w-3" />
            View
          </Button>
          {canQuote && (
            <Button
              onClick={onQuote}
              size="sm"
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/20 text-sm"
            >
              <MousePointerClick className="mr-1 h-3 w-3" />
              Quote
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface RFQMarketplaceSwimlaneCardProps {
  rfq: RFQ;
  onQuote: () => void;
  onView: () => void;
}

function RFQMarketplaceSwimlaneCard({ rfq, onQuote, onView }: RFQMarketplaceSwimlaneCardProps) {
  const [base, quote] = rfq.pair.split('/');
  const isCommitted = rfq.state === "Committed";
  const canQuote = rfq.state === "Open" || rfq.state === "Committed";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 transition-all cursor-pointer group"
      onClick={onView}
    >
      {/* Pair */}
      <div className="flex items-center gap-2 mb-3">
        <Coins className="h-4 w-4 text-cyan-400 flex-shrink-0" />
        <span className="font-semibold text-sm text-white">{rfq.pair}</span>
      </div>

      {/* Amounts */}
      <div className="space-y-2 mb-3">
        <div className="text-xs">
          <div className="text-white/50 mb-0.5">Base Amount</div>
          <div className="font-semibold text-white">
            {rfq.baseAmount.toLocaleString()} {base}
          </div>
        </div>
        <div className="text-xs">
          <div className="text-white/50 mb-0.5">Min Quote</div>
          <div className="font-semibold text-white">
            {rfq.minQuoteAmount.toLocaleString()} {quote}
          </div>
        </div>
      </div>

      {/* Bond */}
      <div className="bg-white/5 rounded p-2 mb-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-white/50">
            <Shield className="h-3 w-3 text-cyan-400" />
            <span>Bond</span>
          </div>
          <span className="font-semibold text-white">{rfq.bondAmount.toLocaleString()}</span>
        </div>
      </div>

      {/* Expiry or Commitments */}
      {rfq.expiresIn && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded p-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-orange-400">
              <Clock className="h-3 w-3" />
              <span>Expires</span>
            </div>
            <span className="font-semibold text-orange-400">{rfq.expiresIn}</span>
          </div>
        </div>
      )}

      {isCommitted && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-blue-400">
              <Activity className="h-3 w-3" />
              <span>Commits</span>
            </div>
            <span className="font-semibold text-blue-400">{rfq.committedCount}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <Button
          onClick={onView}
          variant="outline"
          size="sm"
          className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 text-xs"
        >
          <Eye className="h-3 w-3" />
        </Button>
        {canQuote && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onQuote();
            }}
            size="sm"
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/20 text-xs"
          >
            <MousePointerClick className="h-3 w-3" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

interface RFQMarketplaceHorizontalCardProps {
  rfq: RFQ;
  onQuote: () => void;
  onView: () => void;
}

function RFQMarketplaceHorizontalCard({ rfq, onQuote, onView }: RFQMarketplaceHorizontalCardProps) {
  const [base, quote] = rfq.pair.split('/');
  const isCommitted = rfq.state === "Committed";
  const canQuote = rfq.state === "Open" || rfq.state === "Committed";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-shrink-0 w-72 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 transition-all cursor-pointer group"
      onClick={onView}
    >
      {/* Pair */}
      <div className="flex items-center gap-2 mb-3">
        <Coins className="h-4 w-4 text-cyan-400 flex-shrink-0" />
        <span className="font-semibold text-sm text-white">{rfq.pair}</span>
      </div>

      {/* Amounts */}
      <div className="space-y-2 mb-3">
        <div className="text-xs">
          <div className="text-white/50 mb-0.5">Base Amount</div>
          <div className="font-semibold text-white">
            {rfq.baseAmount.toLocaleString()} {base}
          </div>
        </div>
        <div className="text-xs">
          <div className="text-white/50 mb-0.5">Min Quote</div>
          <div className="font-semibold text-white">
            {rfq.minQuoteAmount.toLocaleString()} {quote}
          </div>
        </div>
      </div>

      {/* Bond */}
      <div className="bg-white/5 rounded p-2 mb-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-white/50">
            <Shield className="h-3 w-3 text-cyan-400" />
            <span>Bond</span>
          </div>
          <span className="font-semibold text-white">{rfq.bondAmount.toLocaleString()}</span>
        </div>
      </div>

      {/* Expiry or Commitments */}
      {rfq.expiresIn && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded p-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-orange-400">
              <Clock className="h-3 w-3" />
              <span>Expires</span>
            </div>
            <span className="font-semibold text-orange-400">{rfq.expiresIn}</span>
          </div>
        </div>
      )}

      {isCommitted && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-blue-400">
              <Activity className="h-3 w-3" />
              <span>Commits</span>
            </div>
            <span className="font-semibold text-blue-400">{rfq.committedCount}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <Button
          onClick={onView}
          variant="outline"
          size="sm"
          className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 text-xs"
        >
          <Eye className="h-3 w-3" />
        </Button>
        {canQuote && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onQuote();
            }}
            size="sm"
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/20 text-xs"
          >
            <MousePointerClick className="h-3 w-3" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// Mock Analytics Components

function LiquidityChart() {
  const [chartType, setChartType] = useState<"donut" | "bar">("donut");
  
  const data = [
    { name: "USDC", value: 35, amount: 1475000, color: "#06b6d4" },
    { name: "wSOL", value: 28, amount: 1180000, color: "#10b981" },
    { name: "USDT", value: 18, amount: 759000, color: "#3b82f6" },
    { name: "JUP", value: 12, amount: 506000, color: "#f59e0b" },
    { name: "Others", value: 7, amount: 295000, color: "#6b7280" },
  ];

  const totalLiquidity = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-4">
      {/* Header with Chart Type Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/60">
          ${(totalLiquidity / 1000000).toFixed(1)}M Available
        </div>
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
          <button
            onClick={() => setChartType("donut")}
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
                  {data.map((entry, index) => (
                    <linearGradient key={`gradient-${index}`} id={`gradient-${entry.name}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                      <stop offset="100%" stopColor={entry.color} stopOpacity={0.6} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#gradient-${entry.name})`}
                      className="transition-all duration-300 hover:opacity-80"
                    />
                  ))}
                </Pie>
              </PieChart>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="text-2xl font-bold text-white">{data.length}</div>
                <div className="text-xs text-white/50">Tokens</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-white font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{item.value}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: 0.6, delay: index * 0.05, ease: "easeOut" }}
                    className="h-full rounded-full relative overflow-hidden"
                    style={{
                      background: `linear-gradient(90deg, ${item.color} 0%, ${item.color}99 100%)`
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

      {/* Legend - Only show for donut */}
      {chartType === "donut" && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between group hover:bg-white/5 rounded px-2 py-1 -mx-2 transition-all">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-110"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-white">{item.name}</span>
              </div>
              <span className="text-sm font-semibold text-white">{item.value}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MarketOverview() {
  return (
    <div className="space-y-3">
      {/* 6 Mini Cards - 3 columns on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {/* Open RFQs */}
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="p-1 rounded bg-green-500/20">
              <TrendingUp className="h-2.5 w-2.5 text-green-400" />
            </div>
            <span className="text-xs text-white/60">Open RFQs</span>
          </div>
          <div className="text-xl font-bold text-white mb-0.5">3</div>
          <div className="text-xs text-green-400">+3 in last hour</div>
        </div>

        {/* Avg Fill Time */}
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="p-1 rounded bg-blue-500/20">
              <Clock className="h-2.5 w-2.5 text-blue-400" />
            </div>
            <span className="text-xs text-white/60">Avg. Fill Time</span>
          </div>
          <div className="text-xl font-bold text-white mb-0.5">12m</div>
          <div className="text-xs text-blue-400">-2m vs yesterday</div>
        </div>

        {/* Total Bonded */}
        <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="p-1 rounded bg-cyan-500/20">
              <Shield className="h-2.5 w-2.5 text-cyan-400" />
            </div>
            <span className="text-xs text-white/60">Total Bonded</span>
          </div>
          <div className="text-xl font-bold text-white mb-0.5">$4.2M</div>
          <div className="text-xs text-cyan-400">In bonds & escrow</div>
        </div>

        {/* Active Traders */}
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="p-1 rounded bg-orange-500/20">
              <Users className="h-2.5 w-2.5 text-orange-400" />
            </div>
            <span className="text-xs text-white/60">Active Traders</span>
          </div>
          <div className="text-xl font-bold text-white mb-0.5">87</div>
          <div className="text-xs text-orange-400">+12 this week</div>
        </div>

        {/* Settlement Rate */}
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="p-1 rounded bg-purple-500/20">
              <Target className="h-2.5 w-2.5 text-purple-400" />
            </div>
            <span className="text-xs text-white/60">Settlement Rate</span>
          </div>
          <div className="text-xl font-bold text-white mb-0.5">94.2%</div>
          <div className="text-xs text-purple-400">Last 7 days</div>
        </div>

        {/* Avg Spread */}
        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="p-1 rounded bg-yellow-500/20">
              <Percent className="h-2.5 w-2.5 text-yellow-400" />
            </div>
            <span className="text-xs text-white/60">Avg. Spread</span>
          </div>
          <div className="text-xl font-bold text-white mb-0.5">0.18%</div>
          <div className="text-xs text-yellow-400">vs 0.32% CEX avg</div>
        </div>
      </div>

      {/* Top Pairs and Recent Activity - Side by Side */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* Top Pairs */}
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-white mb-3">
            <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
            Top Pairs (24h)
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Coins className="h-3 w-3 text-cyan-400" />
                <span className="text-white">wSOL/USDC</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-white">$842K</div>
                <div className="text-green-400 text-xs">+12.4%</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Coins className="h-3 w-3 text-cyan-400" />
                <span className="text-white">USDC/USDT</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-white">$624K</div>
                <div className="text-green-400 text-xs">+8.1%</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Coins className="h-3 w-3 text-cyan-400" />
                <span className="text-white">JUP/USDC</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-white">$418K</div>
                <div className="text-red-400 text-xs">-2.3%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-white mb-3">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            Recent Activity
          </div>
          <div className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-white/60">RFQ Settled</span>
                </div>
                <span className="text-white/40">2m ago</span>
              </div>
              <div className="text-xs text-white/80 pl-3.5">wSOL/USDC</div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="text-white/60">Quote Submitted</span>
                </div>
                <span className="text-white/40">5m ago</span>
              </div>
              <div className="text-xs text-white/80 pl-3.5">USDC/USDT</div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span className="text-white/60">RFQ Created</span>
                </div>
                <span className="text-white/40">8m ago</span>
              </div>
              <div className="text-xs text-white/80 pl-3.5">JUP/wSOL</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}