import { motion } from "motion/react";
import { lazy, Suspense, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { RFQ } from "@/types/rfq";
import { useRfqAccounts } from "@/chain/accounts/lists";
import { toRfqViewModel } from "@/app/lib/rfq-view-model";
import { computeMarketStats } from "@/app/lib/market-stats";
import { useResolveTokenMeta } from "@/app/hooks/useResolveTokenMeta";
import { useNowSecs } from "@/app/hooks/useNowSecs";
import { useMarketplaceFilters } from "@/app/hooks/useMarketplaceFilters";
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
import { SkeletonList } from "@/app/components/SkeletonList";
import { EmptyState } from "@/app/components/EmptyState";
import { RadarIllustration } from "@/app/components/illustrations";
import { ErrorRetry } from "@/app/components/ErrorRetry";
import { MarketStatsCards } from "@/app/components/marketplace/MarketStatsCards";
import { MarketOverview } from "@/app/components/marketplace/MarketOverview";
import { CardGridView } from "@/app/components/marketplace/CardGridView";
import { ListView } from "@/app/components/marketplace/ListView";
import { SwimlaneView } from "@/app/components/marketplace/SwimlaneView";
import { HorizontalGroupsView } from "@/app/components/marketplace/HorizontalGroupsView";
import { Search, Filter, LayoutGrid, List, Columns3, Rows3 } from "lucide-react";

// Lazy so recharts (its only other importer, RewardsSection, is on the lazy
// My-Activity route) stays out of the entry chunk — see routes.tsx / A2.
const OpenInterestByToken = lazy(() =>
  import("@/app/components/marketplace/OpenInterestByToken").then((m) => ({
    default: m.OpenInterestByToken,
  })),
);

interface MarketplaceProps {
  onQuoteRFQ: (rfq: RFQ) => void;
  onViewRFQ: (rfqId: string) => void;
  onEditRFQ?: (rfq: RFQ) => void;
}

export function Marketplace({ onQuoteRFQ, onViewRFQ, onEditRFQ }: MarketplaceProps) {
  // Live on-chain RFQs → UI view-model. Lists refetch on focus (no websocket);
  // detail pages keep the per-account subscription.
  const { publicKey } = useWallet();
  const currentUser = publicKey?.toBase58() ?? null;
  const { data: rfqRows, isLoading, isError, refetch, isFetching } = useRfqAccounts();
  const nowSecs = useNowSecs(60_000);
  const resolveToken = useResolveTokenMeta();

  // Decode → view-model when the rows, the mint registry, or the once-a-minute
  // clock change — never on every keystroke.
  const allRFQs = useMemo<RFQ[]>(
    () => (rfqRows ?? []).map((row) => toRfqViewModel(row, nowSecs, resolveToken)),
    [rfqRows, nowSecs, resolveToken],
  );

  const {
    searchQuery,
    setSearchQuery,
    stateFilter,
    setStateFilter,
    viewMode,
    setViewMode,
    expandedStates,
    toggleStateExpansion,
    sortedRFQs,
    rfqsByState,
  } = useMarketplaceFilters(allRFQs, currentUser);

  // Analytics over the RAW decoded rows (bigint amounts) — never the display
  // view-models, so per-mint sums stay exact and mints are never merged.
  // Null until the first fetch lands so the header renders placeholders, not
  // a flash of "0 RFQs / 0 Open" on a cold load.
  const stats = useMemo(
    () => (rfqRows ? computeMarketStats(rfqRows, resolveToken) : null),
    [rfqRows, resolveToken],
  );

  const viewProps = { currentUser, onQuoteRFQ, onViewRFQ, onEditRFQ };

  return (
    <PageShell>
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">RFQ Marketplace</h1>
        <p className="text-base sm:text-lg text-white/60">
          {isLoading ? "Loading RFQs…" : `${sortedRFQs.length} RFQs available`}
        </p>
      </motion.div>

      {/* Stats */}
      <MarketStatsCards stats={stats} />

      {/* Analytics Section */}
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Suspense
          fallback={<div className="skeleton-shimmer h-[220px] rounded-2xl" aria-hidden="true" />}
        >
          {stats === null ? (
            <div className="skeleton-shimmer h-[220px] rounded-2xl" aria-hidden="true" />
          ) : (
            <OpenInterestByToken buckets={stats.openByQuoteMint} />
          )}
        </Suspense>
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
            <CardGridView rfqs={sortedRFQs} {...viewProps} />
          ) : viewMode === "list" ? (
            <ListView rfqs={sortedRFQs} {...viewProps} />
          ) : viewMode === "horizontal" ? (
            <HorizontalGroupsView
              rfqsByState={rfqsByState}
              expandedStates={expandedStates}
              onToggleState={toggleStateExpansion}
              {...viewProps}
            />
          ) : (
            <SwimlaneView rfqsByState={rfqsByState} {...viewProps} />
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
