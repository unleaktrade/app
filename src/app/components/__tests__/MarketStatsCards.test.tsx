// The headline stat band must not print zeros while the RFQ list is still
// loading — a cold load used to flash "0 Open / 0 Settled" for a second.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketStatsCards } from "../marketplace/MarketStatsCards";
import type { MarketStats } from "@/app/lib/market-stats";

const STATS: MarketStats = {
  countsByState: {
    Draft: 0,
    Open: 15,
    Committed: 4,
    Revealed: 2,
    Selected: 0,
    Settled: 8,
    Expired: 0,
    Ignored: 0,
    Incomplete: 0,
  },
  openCount: 15,
  committedCount: 4,
  revealedCount: 2,
  settledCount: 8,
  avgBondUsdc: 3_342_105n,
  settlementRatePct: 67,
  distinctMakers: 2,
  avgFillSecs: 198,
  openByQuoteMint: [],
  topPairs: [],
  recent: [],
};

describe("MarketStatsCards", () => {
  it("renders placeholders and marks the band busy while stats are loading", () => {
    render(<MarketStatsCards stats={null} />);
    expect(screen.getByLabelText("Market statistics")).toHaveAttribute("aria-busy", "true");
    expect(screen.getAllByText("—")).toHaveLength(4);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("renders the live numbers once stats exist", () => {
    render(<MarketStatsCards stats={STATS} />);
    expect(screen.getByLabelText("Market statistics")).toHaveAttribute("aria-busy", "false");
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("3.342105")).toBeInTheDocument();
  });
});
