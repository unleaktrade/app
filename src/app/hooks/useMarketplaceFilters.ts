import { useMemo, useState } from "react";
import type { RFQ } from "@/types/rfq";

// The 9 RFQ lifecycle states, in display order (mirrors the Rust discriminants).
export const ALL_STATES = [
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

export type MarketplaceState = (typeof ALL_STATES)[number];

export type StateFilter =
  | "all"
  | "draft"
  | "open"
  | "committed"
  | "revealed"
  | "selected"
  | "settled"
  | "expired"
  | "ignored"
  | "incomplete";

export type ViewMode = "card" | "list" | "swimlane" | "horizontal";

// Sort a group so the connected wallet's own RFQs come first, then by recency.
function sortByOwnership(rfqs: RFQ[], currentUser: string | null): RFQ[] {
  return [...rfqs].sort((a, b) => {
    const aIsMine = currentUser !== null && a.maker === currentUser;
    const bIsMine = currentUser !== null && b.maker === currentUser;
    if (aIsMine && !bIsMine) return -1;
    if (!aIsMine && bIsMine) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

/**
 * Marketplace toolbar state (search, state filter, view mode, expanded
 * horizontal groups) plus the filter → sort → group derivation over the
 * decoded RFQ view-models.
 */
export function useMarketplaceFilters(allRFQs: RFQ[], currentUser: string | null) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("horizontal");

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

  // Filter → sort → group in one memo so typing in the search box no longer
  // re-runs the full view-model map + 9× filter/sort on every render.
  const { sortedRFQs, rfqsByState } = useMemo(() => {
    const available = allRFQs.filter((rfq) => {
      if (stateFilter === "draft" && rfq.state !== "Draft") return false;
      if (stateFilter === "open" && rfq.state !== "Open") return false;
      if (stateFilter === "committed" && rfq.state !== "Committed") return false;
      if (stateFilter === "revealed" && rfq.state !== "Revealed") return false;
      if (stateFilter === "selected" && rfq.state !== "Selected") return false;
      if (stateFilter === "settled" && rfq.state !== "Settled") return false;
      if (stateFilter === "expired" && rfq.state !== "Expired") return false;
      if (stateFilter === "ignored" && rfq.state !== "Ignored") return false;
      if (stateFilter === "incomplete" && rfq.state !== "Incomplete") return false;
      if (searchQuery && !rfq.pair.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });

    const sorted = [...available].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const byState = Object.fromEntries(
      ALL_STATES.map((state) => [
        state,
        sortByOwnership(
          sorted.filter((r) => r.state === state),
          currentUser,
        ),
      ]),
    ) as Record<MarketplaceState, RFQ[]>;

    return { sortedRFQs: sorted, rfqsByState: byState };
  }, [allRFQs, searchQuery, stateFilter, currentUser]);

  return {
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
  };
}
