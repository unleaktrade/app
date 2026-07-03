import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { computeFacilitatorShare, computeTotalFee } from "@/chain/math";
import {
  cumulativeClaimSeries,
  derivePendingRewards,
  groupByMint,
  toClaimedRewards,
  totalsByTokenSeries,
  type ClaimedReward,
  type PendingReward,
  type ResolveToken,
  type RewardQuoteView,
  type RewardRfqView,
  type RewardRow,
  type RewardSettlementView,
  type RewardTrackerView,
} from "@/app/lib/rewards";

// Deterministic distinct pubkeys (any 32 bytes are a valid ed25519-agnostic
// PublicKey for derivation-free use).
function pk(seed: number): PublicKey {
  const bytes = new Uint8Array(32);
  bytes[0] = seed;
  bytes[31] = seed;
  return new PublicKey(bytes);
}

const ME = pk(1);
const OTHER = pk(2);
const RFQ = pk(10);
const SETTLEMENT = pk(11);
const QUOTE = pk(12);
const BASE_MINT = pk(20);
const QUOTE_MINT = pk(21);
const QUOTE_MINT_2 = pk(22);
const TRACKER = pk(30);

const meStr = ME.toBase58();

// Stable symbols/decimals for fixture mints (the real resolver would fall back
// to truncated addresses with 0 decimals for unknown mints).
const resolve: ResolveToken = (mint: string) => {
  if (mint === BASE_MINT.toBase58()) return { symbol: "sBASE", decimals: 9 };
  if (mint === QUOTE_MINT.toBase58()) return { symbol: "sUSDC", decimals: 6 };
  if (mint === QUOTE_MINT_2.toBase58()) return { symbol: "sALT", decimals: 9 };
  return { symbol: mint.slice(0, 4), decimals: 0 };
};

function makeRfq(overrides: Partial<RewardRfqView> = {}): RewardRow<RewardRfqView> {
  return {
    publicKey: RFQ,
    account: {
      state: "Settled",
      facilitator: ME,
      settlement: SETTLEMENT,
      selectedQuote: QUOTE,
      baseMint: BASE_MINT,
      quoteMint: QUOTE_MINT,
      facilitatorFeeBps: 2000,
      ...overrides,
    },
  };
}

function makeSettlement(overrides: Partial<RewardSettlementView> = {}): RewardSettlementView {
  return { quoteAmount: 1_000_000n, takerFeeBps: 50, completedAt: 1_700_000_000, ...overrides };
}

function makeQuote(overrides: Partial<RewardQuoteView> = {}): RewardQuoteView {
  return { facilitator: ME, ...overrides };
}

function makeTracker(overrides: Partial<RewardTrackerView> = {}): RewardRow<RewardTrackerView> {
  return {
    publicKey: TRACKER,
    account: {
      rfq: RFQ,
      facilitator: ME,
      quoteMint: QUOTE_MINT,
      amount: 1_000n,
      claimedAt: 1_700_100_000,
      ...overrides,
    },
  };
}

interface DeriveOverrides {
  rfqRows?: RewardRow<RewardRfqView>[];
  settlements?: Map<string, RewardSettlementView>;
  quotes?: Map<string, RewardQuoteView>;
  trackers?: RewardRow<RewardTrackerView>[];
  me?: string;
}

function derive(overrides: DeriveOverrides = {}): PendingReward[] {
  return derivePendingRewards({
    rfqRows: overrides.rfqRows ?? [makeRfq()],
    settlements: overrides.settlements ?? new Map([[SETTLEMENT.toBase58(), makeSettlement()]]),
    quotes: overrides.quotes ?? new Map([[QUOTE.toBase58(), makeQuote()]]),
    trackers: overrides.trackers ?? [],
    me: overrides.me ?? meStr,
    resolve,
  });
}

describe("derivePendingRewards eligibility", () => {
  it("emits a reward for the happy path with the exact facilitator share", () => {
    const pending = derive();
    expect(pending).toHaveLength(1);
    const reward = pending[0]!;
    // Fee math parity: 1_000_000 * 50bps = 5_000 total fee; 20% share = 1_000.
    expect(computeTotalFee(1_000_000n, 50)).toBe(5_000n);
    expect(computeFacilitatorShare(5_000n, 2000)).toBe(1_000n);
    expect(reward.amount).toBe(1_000n);
    expect(reward.rfq).toBe(RFQ.toBase58());
    expect(reward.quote).toBe(QUOTE.toBase58());
    expect(reward.quoteMint).toBe(QUOTE_MINT.toBase58());
    expect(reward.symbol).toBe("sUSDC");
    expect(reward.decimals).toBe(6);
    expect(reward.settledAt).toBe(1_700_000_000);
    expect(reward.pair).toBe("sBASE/sUSDC");
  });

  it("skips RFQs that are not Settled", () => {
    expect(derive({ rfqRows: [makeRfq({ state: "Selected" })] })).toHaveLength(0);
  });

  it("skips when the RFQ facilitator is someone else (or unset)", () => {
    expect(derive({ rfqRows: [makeRfq({ facilitator: OTHER })] })).toHaveLength(0);
    expect(derive({ rfqRows: [makeRfq({ facilitator: null })] })).toHaveLength(0);
  });

  it("skips when the winning quote's facilitator does not match", () => {
    expect(
      derive({ quotes: new Map([[QUOTE.toBase58(), makeQuote({ facilitator: OTHER })]]) }),
    ).toHaveLength(0);
    expect(
      derive({ quotes: new Map([[QUOTE.toBase58(), makeQuote({ facilitator: null })]]) }),
    ).toHaveLength(0);
  });

  it("skips when a tracker already exists for (rfq, me)", () => {
    expect(derive({ trackers: [makeTracker()] })).toHaveLength(0);
  });

  it("still emits when the tracker belongs to a different facilitator", () => {
    expect(derive({ trackers: [makeTracker({ facilitator: OTHER })] })).toHaveLength(1);
  });

  it("skips zero shares (facilitatorFeeBps = 0)", () => {
    expect(derive({ rfqRows: [makeRfq({ facilitatorFeeBps: 0 })] })).toHaveLength(0);
  });

  it("skips zero shares (takerFeeBps = 0 → no fee to split)", () => {
    expect(
      derive({
        settlements: new Map([[SETTLEMENT.toBase58(), makeSettlement({ takerFeeBps: 0 })]]),
      }),
    ).toHaveLength(0);
  });

  it("skips when the settlement is missing from the map", () => {
    expect(derive({ settlements: new Map() })).toHaveLength(0);
  });

  it("skips when the settlement has not completed", () => {
    expect(
      derive({
        settlements: new Map([[SETTLEMENT.toBase58(), makeSettlement({ completedAt: null })]]),
      }),
    ).toHaveLength(0);
  });

  it("skips when the winning quote is missing from the map", () => {
    expect(derive({ quotes: new Map() })).toHaveLength(0);
  });

  it("skips RFQs without settlement / selectedQuote pointers", () => {
    expect(derive({ rfqRows: [makeRfq({ settlement: null })] })).toHaveLength(0);
    expect(derive({ rfqRows: [makeRfq({ selectedQuote: null })] })).toHaveLength(0);
  });
});

describe("toClaimedRewards", () => {
  it("maps trackers with symbol/decimals and the pair from the RFQ row", () => {
    const claimed = toClaimedRewards([makeTracker()], [makeRfq()], resolve);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]).toMatchObject({
      tracker: TRACKER.toBase58(),
      rfq: RFQ.toBase58(),
      quoteMint: QUOTE_MINT.toBase58(),
      symbol: "sUSDC",
      decimals: 6,
      amount: 1_000n,
      claimedAt: 1_700_100_000,
      pair: "sBASE/sUSDC",
    });
  });

  it("leaves pair null when no matching RFQ row is available", () => {
    const claimed = toClaimedRewards([makeTracker()], undefined, resolve);
    expect(claimed[0]!.pair).toBeNull();
  });

  it("sorts newest claim first", () => {
    const claimed = toClaimedRewards(
      [
        makeTracker({ claimedAt: 100 }),
        makeTracker({ rfq: pk(13), claimedAt: 300 }),
        makeTracker({ rfq: pk(14), claimedAt: 200 }),
      ],
      undefined,
      resolve,
    );
    expect(claimed.map((c) => c.claimedAt)).toEqual([300, 200, 100]);
  });
});

// Fixture builders for the grouping/series helpers.
function pendingFixture(overrides: Partial<PendingReward> = {}): PendingReward {
  return {
    rfq: RFQ.toBase58(),
    quote: QUOTE.toBase58(),
    quoteMint: QUOTE_MINT.toBase58(),
    symbol: "sUSDC",
    decimals: 6,
    amount: 1_000_000n,
    settledAt: 1_700_000_000,
    pair: "sBASE/sUSDC",
    ...overrides,
  };
}

function claimedFixture(overrides: Partial<ClaimedReward> = {}): ClaimedReward {
  return {
    tracker: TRACKER.toBase58(),
    rfq: RFQ.toBase58(),
    quoteMint: QUOTE_MINT.toBase58(),
    symbol: "sUSDC",
    decimals: 6,
    amount: 2_000_000n,
    claimedAt: 1_700_100_000,
    pair: "sBASE/sUSDC",
    ...overrides,
  };
}

describe("groupByMint", () => {
  it("keeps different mints in separate rows — no cross-mint grand total", () => {
    const groups = groupByMint(
      [
        pendingFixture({ amount: 1_000_000n }),
        pendingFixture({
          quoteMint: QUOTE_MINT_2.toBase58(),
          symbol: "sALT",
          decimals: 9,
          amount: 5n,
        }),
      ],
      [claimedFixture({ amount: 3_000_000n })],
    );
    expect(groups).toHaveLength(2);
    const alt = groups.find((g) => g.symbol === "sALT")!;
    const usdc = groups.find((g) => g.symbol === "sUSDC")!;
    expect(alt).toMatchObject({ pendingTotal: 5n, claimedTotal: 0n, decimals: 9 });
    expect(usdc).toMatchObject({ pendingTotal: 1_000_000n, claimedTotal: 3_000_000n, decimals: 6 });
  });

  it("sums multiple rewards of the same mint", () => {
    const groups = groupByMint(
      [pendingFixture({ amount: 1n }), pendingFixture({ rfq: pk(15).toBase58(), amount: 2n })],
      [],
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.pendingTotal).toBe(3n);
  });
});

describe("cumulativeClaimSeries", () => {
  it("builds per-symbol cumulative display values sorted by claimedAt", () => {
    const series = cumulativeClaimSeries([
      claimedFixture({ claimedAt: 300, amount: 1_500_000n }), // sUSDC 1.5 (6 dp)
      claimedFixture({
        claimedAt: 100,
        amount: 2_000_000_000n, // sALT 2 (9 dp)
        quoteMint: QUOTE_MINT_2.toBase58(),
        symbol: "sALT",
        decimals: 9,
      }),
      claimedFixture({ claimedAt: 200, amount: 500_000n }), // sUSDC 0.5
    ]);
    expect(series.map((p) => p.at)).toEqual([100, 200, 300]);
    // Each symbol accumulates independently — never a combined line.
    expect(series[0]).toMatchObject({ sALT: 2, sUSDC: 0 });
    expect(series[1]).toMatchObject({ sALT: 2, sUSDC: 0.5 });
    expect(series[2]).toMatchObject({ sALT: 2, sUSDC: 2 });
  });

  it("returns an empty series for no claims", () => {
    expect(cumulativeClaimSeries([])).toEqual([]);
  });
});

describe("totalsByTokenSeries", () => {
  it("emits one pending/claimed row per symbol, display-scaled", () => {
    const rows = totalsByTokenSeries(
      [
        pendingFixture({ amount: 1_000_000n }), // 1 sUSDC
        pendingFixture({
          quoteMint: QUOTE_MINT_2.toBase58(),
          symbol: "sALT",
          decimals: 9,
          amount: 500_000_000n, // 0.5 sALT
        }),
      ],
      [claimedFixture({ amount: 2_500_000n })], // 2.5 sUSDC
    );
    expect(rows).toEqual([
      { symbol: "sALT", pending: 0.5, claimed: 0 },
      { symbol: "sUSDC", pending: 1, claimed: 2.5 },
    ]);
  });
});
