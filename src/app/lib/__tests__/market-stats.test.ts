import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import type { RFQState } from "@/types/rfq";
import type { RfqAccount } from "@/chain/accounts/rfq";
import type { ProgramAccount } from "@/chain/accounts/lists";
import type { ResolveToken } from "@/app/lib/rfq-view-model";
import { ALL_RFQ_STATES, computeMarketStats } from "@/app/lib/market-stats";

// Deterministic distinct pubkeys — constructor accepts any 32 bytes.
function key(seed: number): PublicKey {
  return new PublicKey(new Uint8Array(32).fill(seed + 1));
}

const MAKER_A = key(1);
const MAKER_B = key(2);
const MINT_SOL = key(10);
const MINT_USDC = key(11);
const MINT_JUP = key(12);

const SYMBOLS: Record<string, { symbol: string; decimals: number }> = {
  [MINT_SOL.toBase58()]: { symbol: "wSOL", decimals: 9 },
  [MINT_USDC.toBase58()]: { symbol: "USDC", decimals: 6 },
  [MINT_JUP.toBase58()]: { symbol: "JUP", decimals: 6 },
};

const resolve: ResolveToken = (mint) => SYMBOLS[mint] ?? { symbol: mint.slice(0, 4), decimals: 0 };

// Only the fields computeMarketStats reads are populated with real values;
// the rest satisfy the structural type via the cast below.
interface RfqFixture {
  state: RFQState;
  maker?: PublicKey;
  baseMint?: PublicKey;
  quoteMint?: PublicKey;
  bondAmount?: bigint;
  baseAmount?: bigint;
  minQuoteAmount?: bigint;
  createdAt?: number;
  openedAt?: number | null;
  completedAt?: number | null;
}

function row(fixture: RfqFixture): ProgramAccount<RfqAccount> {
  const account = {
    state: fixture.state,
    maker: fixture.maker ?? MAKER_A,
    baseMint: fixture.baseMint ?? MINT_SOL,
    quoteMint: fixture.quoteMint ?? MINT_USDC,
    bondAmount: fixture.bondAmount ?? 0n,
    baseAmount: fixture.baseAmount ?? 0n,
    minQuoteAmount: fixture.minQuoteAmount ?? 0n,
    createdAt: fixture.createdAt ?? 0,
    openedAt: fixture.openedAt ?? null,
    completedAt: fixture.completedAt ?? null,
  };
  return { publicKey: key(99), account } as unknown as ProgramAccount<RfqAccount>;
}

describe("computeMarketStats — counts", () => {
  it("returns all-zero counts and null aggregates for an empty list", () => {
    const stats = computeMarketStats([], resolve);
    for (const state of ALL_RFQ_STATES) {
      expect(stats.countsByState[state]).toBe(0);
    }
    expect(stats.openCount).toBe(0);
    expect(stats.distinctMakers).toBe(0);
    expect(stats.avgBondUsdc).toBeNull();
    expect(stats.settlementRatePct).toBeNull();
    expect(stats.avgFillSecs).toBeNull();
    expect(stats.openByQuoteMint).toEqual([]);
    expect(stats.topPairs).toEqual([]);
    expect(stats.recent).toEqual([]);
  });

  it("counts every state and surfaces the headline counts", () => {
    const rows = [
      row({ state: "Draft" }),
      row({ state: "Open" }),
      row({ state: "Open" }),
      row({ state: "Committed" }),
      row({ state: "Revealed" }),
      row({ state: "Settled" }),
      row({ state: "Expired" }),
    ];
    const stats = computeMarketStats(rows, resolve);
    expect(stats.countsByState.Open).toBe(2);
    expect(stats.countsByState.Ignored).toBe(0);
    expect(stats.openCount).toBe(2);
    expect(stats.committedCount).toBe(1);
    expect(stats.revealedCount).toBe(1);
    expect(stats.settledCount).toBe(1);
  });

  it("counts distinct posters, not rows", () => {
    const rows = [
      row({ state: "Open", maker: MAKER_A }),
      row({ state: "Open", maker: MAKER_A }),
      row({ state: "Settled", maker: MAKER_B }),
    ];
    expect(computeMarketStats(rows, resolve).distinctMakers).toBe(2);
  });
});

describe("computeMarketStats — avgBondUsdc", () => {
  it("averages bondAmount over non-Draft rows only (bigint floor)", () => {
    const rows = [
      row({ state: "Draft", bondAmount: 999_000_000n }), // excluded
      row({ state: "Open", bondAmount: 1_000_000n }),
      row({ state: "Settled", bondAmount: 2_000_001n }),
    ];
    expect(computeMarketStats(rows, resolve).avgBondUsdc).toBe(1_500_000n);
  });

  it("is null when every row is a Draft", () => {
    const rows = [row({ state: "Draft", bondAmount: 5n })];
    expect(computeMarketStats(rows, resolve).avgBondUsdc).toBeNull();
  });
});

describe("computeMarketStats — settlement rate & fill time", () => {
  it("computes settled / closed to one decimal", () => {
    const rows = [
      row({ state: "Settled" }),
      row({ state: "Settled" }),
      row({ state: "Expired" }),
      row({ state: "Open" }), // not part of the denominator
    ];
    expect(computeMarketStats(rows, resolve).settlementRatePct).toBeCloseTo(66.7);
  });

  it("is null when nothing has closed yet", () => {
    const rows = [row({ state: "Open" }), row({ state: "Committed" })];
    expect(computeMarketStats(rows, resolve).settlementRatePct).toBeNull();
  });

  it("averages completedAt − openedAt over Settled rows with both timestamps", () => {
    const rows = [
      row({ state: "Settled", openedAt: 1000, completedAt: 1100 }),
      row({ state: "Settled", openedAt: 2000, completedAt: 2300 }),
      row({ state: "Settled", openedAt: null, completedAt: 3000 }), // skipped
    ];
    expect(computeMarketStats(rows, resolve).avgFillSecs).toBe(200);
  });

  it("is null when no Settled row carries both timestamps", () => {
    const rows = [row({ state: "Settled", openedAt: null, completedAt: null })];
    expect(computeMarketStats(rows, resolve).avgFillSecs).toBeNull();
  });
});

describe("computeMarketStats — openByQuoteMint", () => {
  it("buckets Open RFQs per quote mint and never merges mints", () => {
    const rows = [
      row({ state: "Open", quoteMint: MINT_USDC, minQuoteAmount: 100n }),
      row({ state: "Open", quoteMint: MINT_USDC, minQuoteAmount: 250n }),
      row({ state: "Open", quoteMint: MINT_JUP, minQuoteAmount: 999n }),
      row({ state: "Committed", quoteMint: MINT_USDC, minQuoteAmount: 777n }), // not Open
    ];
    const buckets = computeMarketStats(rows, resolve).openByQuoteMint;
    expect(buckets).toHaveLength(2);
    expect(buckets[0]).toEqual({
      mint: MINT_USDC.toBase58(),
      symbol: "USDC",
      decimals: 6,
      count: 2,
      totalAmount: 350n,
    });
    expect(buckets[1]).toEqual({
      mint: MINT_JUP.toBase58(),
      symbol: "JUP",
      decimals: 6,
      count: 1,
      totalAmount: 999n,
    });
  });

  it("sorts buckets by count descending", () => {
    const rows = [
      row({ state: "Open", quoteMint: MINT_JUP }),
      row({ state: "Open", quoteMint: MINT_USDC }),
      row({ state: "Open", quoteMint: MINT_JUP }),
    ];
    const buckets = computeMarketStats(rows, resolve).openByQuoteMint;
    expect(buckets.map((b) => b.symbol)).toEqual(["JUP", "USDC"]);
  });
});

describe("computeMarketStats — topPairs", () => {
  it("ranks mint pairs by settled count, keeping baseTotal single-mint", () => {
    const rows = [
      row({ state: "Settled", baseMint: MINT_SOL, quoteMint: MINT_USDC, baseAmount: 10n }),
      row({ state: "Settled", baseMint: MINT_SOL, quoteMint: MINT_USDC, baseAmount: 15n }),
      row({ state: "Settled", baseMint: MINT_JUP, quoteMint: MINT_USDC, baseAmount: 500n }),
      row({ state: "Open", baseMint: MINT_SOL, quoteMint: MINT_USDC, baseAmount: 999n }), // not settled
    ];
    const pairs = computeMarketStats(rows, resolve).topPairs;
    expect(pairs).toEqual([
      { pair: "wSOL/USDC", settledCount: 2, baseTotal: 25n, baseSymbol: "wSOL", baseDecimals: 9 },
      { pair: "JUP/USDC", settledCount: 1, baseTotal: 500n, baseSymbol: "JUP", baseDecimals: 6 },
    ]);
  });

  it("caps the ranking at three pairs", () => {
    const mints = [key(20), key(21), key(22), key(23)];
    const rows = mints.map((baseMint) => row({ state: "Settled", baseMint }));
    expect(computeMarketStats(rows, resolve).topPairs).toHaveLength(3);
  });
});

describe("computeMarketStats — recent", () => {
  it("returns the latest three lifecycle events across rows, newest first", () => {
    const rows = [
      row({ state: "Settled", createdAt: 100, openedAt: 200, completedAt: 900 }),
      row({ state: "Open", createdAt: 500, openedAt: 800 }),
      row({ state: "Draft", createdAt: 300 }),
    ];
    const recent = computeMarketStats(rows, resolve).recent;
    expect(recent).toEqual([
      { kind: "settled", pair: "wSOL/USDC", at: 900 },
      { kind: "opened", pair: "wSOL/USDC", at: 800 },
      { kind: "created", pair: "wSOL/USDC", at: 500 },
    ]);
  });
});
