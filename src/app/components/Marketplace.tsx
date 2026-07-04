import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { RFQ } from "@/types/rfq";
import { useRfqAccounts } from "@/chain/accounts/lists";
import { toRfqViewModel } from "@/app/lib/rfq-view-model";
import { computeMarketStats } from "@/app/lib/market-stats";
import {
  getCardGradient,
  getCardBorder,
  getStateSectionGradient,
  getStateTitleColor,
  getStateSubtitle,
  getOwnedHighlight,
} from "@/app/lib/rfq-visuals";
import { PageShell } from "@/app/components/PageShell";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { StatusBadge } from "@/app/components/StatusBadge";
import { SkeletonList } from "@/app/components/SkeletonList";
import { EmptyState } from "@/app/components/EmptyState";
import { RadarIllustration } from "@/app/components/illustrations";
import { ErrorRetry } from "@/app/components/ErrorRetry";
import { MarketStatsCards } from "@/app/components/marketplace/MarketStatsCards";
import { OpenInterestByToken } from "@/app/components/marketplace/OpenInterestByToken";
import { MarketOverview } from "@/app/components/marketplace/MarketOverview";
import {
  Search,
  Filter,
  Activity,
  Clock,
  Shield,
  Coins,
  ChevronDown,
  LayoutGrid,
  List,
  Eye,
  Columns3,
  Rows3,
  ChevronUp,
  MousePointerClick,
  BadgeCheck,
  Edit3,
} from "lucide-react";

interface MarketplaceProps {
  onQuoteRFQ: (rfq: RFQ) => void;
  onViewRFQ: (rfqId: string) => void;
  onEditRFQ?: (rfq: RFQ) => void;
}

export function Marketplace({ onQuoteRFQ, onViewRFQ, onEditRFQ }: MarketplaceProps) {
  const allStates = [
    "Draft",
    "Open",
    "Committed",
    "Revealed",
    "Selected",
    "Settled",
    "Expired",
    "Ignored",
    "Incomplete",
  ] as const;

  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<
    | "all"
    | "draft"
    | "open"
    | "committed"
    | "revealed"
    | "selected"
    | "settled"
    | "expired"
    | "ignored"
    | "incomplete"
  >("all");
  const [sortBy] = useState<"newest" | "expiring" | "volume">("newest");
  const [viewMode, setViewMode] = useState<"card" | "list" | "swimlane" | "horizontal">(
    "horizontal",
  );

  // Expansion state for horizontal view - Closed by default
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());

  // Toggle a single state
  const toggleStateExpansion = (state: string) => {
    setExpandedStates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(state)) {
        newSet.delete(state);
      } else {
        newSet.add(state);
      }
      return newSet;
    });
  };

  // Live on-chain RFQs → UI view-model. Lists refetch on focus (no websocket);
  // detail pages keep the per-account subscription.
  const { publicKey } = useWallet();
  const currentUser = publicKey?.toBase58() ?? null;
  const { data: rfqRows, isLoading, isError, refetch, isFetching } = useRfqAccounts();
  const nowSecs = Math.floor(Date.now() / 1000);
  const allRFQs: RFQ[] = (rfqRows ?? []).map((row) => toRfqViewModel(row, nowSecs));

  // Filter RFQs: Show ALL states including Draft
  // NOW SHOWING my own RFQs with visual distinction
  const availableRFQs = allRFQs.filter((rfq) => {
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

  // Group RFQs by state for swimlane and horizontal views
  // Sort each group: MY RFQs first, then others
  const sortByOwnership = (rfqs: RFQ[]) => {
    return rfqs.sort((a, b) => {
      const aIsMine = currentUser !== null && a.maker === currentUser;
      const bIsMine = currentUser !== null && b.maker === currentUser;

      // My RFQs come first
      if (aIsMine && !bIsMine) return -1;
      if (!aIsMine && bIsMine) return 1;

      // Within each group, sort by creation date
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  };

  const rfqsByState = {
    Draft: sortByOwnership(sortedRFQs.filter((r) => r.state === "Draft")),
    Open: sortByOwnership(sortedRFQs.filter((r) => r.state === "Open")),
    Committed: sortByOwnership(sortedRFQs.filter((r) => r.state === "Committed")),
    Revealed: sortByOwnership(sortedRFQs.filter((r) => r.state === "Revealed")),
    Selected: sortByOwnership(sortedRFQs.filter((r) => r.state === "Selected")),
    Settled: sortByOwnership(sortedRFQs.filter((r) => r.state === "Settled")),
    Expired: sortByOwnership(sortedRFQs.filter((r) => r.state === "Expired")),
    Ignored: sortByOwnership(sortedRFQs.filter((r) => r.state === "Ignored")),
    Incomplete: sortByOwnership(sortedRFQs.filter((r) => r.state === "Incomplete")),
  };

  // Analytics over the RAW decoded rows (bigint amounts) — never the display
  // view-models, so per-mint sums stay exact and mints are never merged.
  const stats = useMemo(() => computeMarketStats(rfqRows ?? []), [rfqRows]);

  return (
    <PageShell>
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">RFQ Marketplace</h1>
        <p className="text-base sm:text-lg text-white/60">{sortedRFQs.length} RFQs available</p>
      </motion.div>

      {/* Stats */}
      <MarketStatsCards stats={stats} />

      {/* Analytics Section */}
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 sm:gap-6 mb-6 sm:mb-8">
        <OpenInterestByToken buckets={stats.openByQuoteMint} />
        <MarketOverview stats={stats} now={nowSecs} />
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
          <div className="flex-shrink-0">
            <Select
              value={stateFilter}
              onValueChange={(v) => setStateFilter(v as typeof stateFilter)}
            >
              <SelectTrigger
                aria-label="Filter by state"
                className="w-full lg:w-auto data-[size=default]:h-12 bg-white/5 border-white/10 text-white rounded-xl px-4 text-sm cursor-pointer hover:bg-white/10 transition-colors font-semibold"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="committed">Committed</SelectItem>
                <SelectItem value="revealed">Revealed</SelectItem>
                <SelectItem value="selected">Selected</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="ignored">Ignored</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1 flex-shrink-0">
            <Button
              onClick={() => setViewMode("horizontal")}
              variant="ghost"
              size="sm"
              aria-label="Grouped rows view"
              aria-pressed={viewMode === "horizontal"}
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
              aria-label="Card grid view"
              aria-pressed={viewMode === "card"}
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
              aria-label="List view"
              aria-pressed={viewMode === "list"}
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
              aria-label="Board view"
              aria-pressed={viewMode === "swimlane"}
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
        {isLoading ? (
          <SkeletonList count={6} />
        ) : isError ? (
          <ErrorRetry
            message="Couldn't load RFQs from the chain."
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        ) : sortedRFQs.length > 0 ? (
          viewMode === "card" ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedRFQs.map((rfq, index) => (
                <RFQMarketplaceCard
                  key={rfq.publicKey}
                  index={index}
                  rfq={rfq}
                  currentUser={currentUser}
                  onQuote={() => onQuoteRFQ(rfq)}
                  onView={() => onViewRFQ(rfq.publicKey)}
                  onEdit={onEditRFQ ? () => onEditRFQ(rfq) : undefined}
                />
              ))}
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-3">
              {sortedRFQs.map((rfq, index) => (
                <RFQMarketplaceListItem
                  key={rfq.publicKey}
                  index={index}
                  rfq={rfq}
                  currentUser={currentUser}
                  onQuote={() => onQuoteRFQ(rfq)}
                  onView={() => onViewRFQ(rfq.publicKey)}
                  onEdit={onEditRFQ ? () => onEditRFQ(rfq) : undefined}
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
                    className={`bg-gradient-to-br ${getStateSectionGradient(state)} backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden`}
                  >
                    {/* Section Header - Clickable */}
                    <button
                      onClick={() => toggleStateExpansion(state)}
                      aria-expanded={expandedStates.has(state)}
                      className="w-full p-5 flex items-center justify-between transition-all group/header border-b border-white/5"
                    >
                      <div>
                        <h3
                          className={`text-lg font-semibold ${getStateTitleColor(state)} mb-1 text-left group-hover/header:text-opacity-80 transition-all`}
                        >
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
                                  currentUser={currentUser}
                                  onQuote={() => onQuoteRFQ(rfq)}
                                  onView={() => onViewRFQ(rfq.publicKey)}
                                  onEdit={onEditRFQ ? () => onEditRFQ(rfq) : undefined}
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
                      <div
                        className={`${getCardGradient(state)} border ${getCardBorder(state)} rounded-t-xl p-4 backdrop-blur-sm`}
                      >
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
                            currentUser={currentUser}
                            onQuote={() => onQuoteRFQ(rfq)}
                            onView={() => onViewRFQ(rfq.publicKey)}
                            onEdit={onEditRFQ ? () => onEditRFQ(rfq) : undefined}
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
          <EmptyState
            icon={Filter}
            illustration={<RadarIllustration />}
            title="No RFQs Found"
            hint="Try adjusting your filters or search query"
          />
        )}
      </div>
    </PageShell>
  );
}

// Helper Components

interface RFQMarketplaceCardProps {
  rfq: RFQ;
  currentUser: string | null;
  onQuote: () => void;
  onView: () => void;
  onEdit?: () => void;
  /** Position in the rendered list — drives the capped entrance stagger. */
  index?: number;
}

function RFQMarketplaceCard({
  rfq,
  currentUser,
  onQuote,
  onView,
  onEdit,
  index = 0,
}: RFQMarketplaceCardProps) {
  const [base, quote] = rfq.pair.split("/");
  const isCommitted = rfq.state === "Committed";
  const canQuote = rfq.state === "Open" || rfq.state === "Committed";

  // Check if this RFQ belongs to current user
  const isMyRFQ = currentUser !== null && rfq.maker === currentUser;

  // Get state-based styling
  const cardGradient = getCardGradient(rfq.state);
  const cardBorder = getCardBorder(rfq.state);

  // Get state color classes for MY RFQ badge and border
  const myRFQStyles = getOwnedHighlight(rfq.state);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: Math.min(index, 12) * 0.04 }}
      className={`group relative ${cardGradient} backdrop-blur-sm border ${
        isMyRFQ ? `${myRFQStyles.border} animate-pulse-glow` : cardBorder
      } rounded-lg sm:rounded-xl p-4 sm:p-5 transition-all`}
    >
      {/* MY RFQ Badge Ribbon with state color */}
      {isMyRFQ && (
        <div className="absolute -top-2 -left-2 z-10">
          <div className="relative">
            <div
              className={`${myRFQStyles.badge} text-[10px] font-bold px-3 py-1 rounded-md flex items-center gap-1.5`}
            >
              <BadgeCheck className="h-3 w-3 animate-pulse" />
              <span>MY RFQ</span>
            </div>
            {/* Triangle for ribbon effect */}
            <div
              className={`absolute -bottom-1 left-0 w-0 h-0 border-l-[6px] border-l-transparent border-t-[4px] ${myRFQStyles.triangle} border-r-[6px] border-r-transparent`}
            ></div>
          </div>
        </div>
      )}

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
        {isMyRFQ && rfq.state === "Draft" && onEdit && (
          <Button
            onClick={onEdit}
            size="sm"
            className="flex-1 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-semibold shadow-lg shadow-purple-500/20 text-xs sm:text-sm"
          >
            <Edit3 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Edit
          </Button>
        )}
        {canQuote && !isMyRFQ && (
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
  currentUser: string | null;
  onQuote: () => void;
  onView: () => void;
  onEdit?: () => void;
  /** Position in the rendered list — drives the capped entrance stagger. */
  index?: number;
}

function RFQMarketplaceListItem({
  rfq,
  currentUser,
  onQuote,
  onView,
  onEdit,
  index = 0,
}: RFQMarketplaceListItemProps) {
  const [base, quote] = rfq.pair.split("/");
  const isCommitted = rfq.state === "Committed";
  const canQuote = rfq.state === "Open" || rfq.state === "Committed";

  // Check if this RFQ belongs to current user
  const isMyRFQ = currentUser !== null && rfq.maker === currentUser;

  // Get state-based styling
  const cardGradient = getCardGradient(rfq.state);
  const cardBorder = getCardBorder(rfq.state);

  // Get state color classes for MY RFQ badge and border
  const myRFQStyles = getOwnedHighlight(rfq.state);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.005 }}
      transition={{ duration: 0.2, ease: "easeOut", delay: Math.min(index, 12) * 0.04 }}
      className={`relative ${cardGradient} backdrop-blur-sm border ${
        isMyRFQ ? `${myRFQStyles.border} animate-pulse-glow` : cardBorder
      } rounded-lg p-4 transition-all hover:border-opacity-60`}
    >
      {/* MY RFQ Badge Ribbon with state color */}
      {isMyRFQ && (
        <div className="absolute -top-2 -left-2 z-10">
          <div className="relative">
            <div
              className={`${myRFQStyles.badge} text-[10px] font-bold px-3 py-1 rounded-md flex items-center gap-1.5`}
            >
              <BadgeCheck className="h-3 w-3 animate-pulse" />
              <span>MY RFQ</span>
            </div>
            <div
              className={`absolute -bottom-1 left-0 w-0 h-0 border-l-[6px] border-l-transparent border-t-[4px] ${myRFQStyles.triangle} border-r-[6px] border-r-transparent`}
            ></div>
          </div>
        </div>
      )}

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
              <div className="text-sm font-semibold text-orange-400">{rfq.expiresIn}</div>
            </div>
          )}
          {isCommitted && (
            <div className="flex-1">
              <div className="text-xs text-blue-400 mb-1">Commitments</div>
              <div className="text-sm font-semibold text-blue-400">{rfq.committedCount}</div>
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
          {isMyRFQ && rfq.state === "Draft" && onEdit && (
            <Button
              onClick={onEdit}
              size="sm"
              className="flex-1 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-semibold shadow-lg shadow-purple-500/20 text-sm"
            >
              <Edit3 className="mr-1 h-3 w-3" />
              Edit
            </Button>
          )}
          {canQuote && !isMyRFQ && (
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
