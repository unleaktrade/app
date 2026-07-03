// Pure aggregation over decoded on-chain RFQ rows for the marketplace
// analytics band. Operates on the RAW ProgramAccount<RfqAccount> rows (bigint
// base-unit amounts), NOT the display view-models — protocol math stays bigint.
//
// Cross-token safety invariant: the ONLY amount aggregates are per-mint buckets
// (openByQuoteMint, topPairs — each bucket sums a single mint) or USDC-only
// (avgBondUsdc — bonds are always denominated in USDC). Token amounts are never
// summed across different mints.

import type { RFQState } from "@/types/rfq";
import type { RfqAccount } from "@/chain/accounts/rfq";
import type { ProgramAccount } from "@/chain/accounts/lists";
import type { ResolveToken } from "./rfq-view-model";
import { resolveTokenMeta } from "./tokens";

export const ALL_RFQ_STATES: readonly RFQState[] = [
  "Draft",
  "Open",
  "Committed",
  "Revealed",
  "Selected",
  "Settled",
  "Ignored",
  "Expired",
  "Incomplete",
];

/** States with a live lifecycle (not yet terminal). */
export const LIVE_RFQ_STATES: readonly RFQState[] = [
  "Draft",
  "Open",
  "Committed",
  "Revealed",
  "Selected",
];

/** Per-mint aggregate — amounts inside one bucket share a single mint. */
export interface TokenBucket {
  mint: string;
  symbol: string;
  decimals: number;
  count: number;
  totalAmount: bigint;
}

export interface TopPair {
  pair: string;
  settledCount: number;
  /** Sum of baseAmount across the bucket — same base mint per bucket. */
  baseTotal: bigint;
  baseSymbol: string;
  baseDecimals: number;
}

export interface RecentEvent {
  kind: "settled" | "opened" | "created";
  pair: string;
  at: number;
}

export interface MarketStats {
  countsByState: Record<RFQState, number>;
  openCount: number;
  committedCount: number;
  revealedCount: number;
  settledCount: number;
  /** Distinct RFQ posters. Internal naming only — displayed as "Participants". */
  distinctMakers: number;
  /** Mean bondAmount over non-Draft RFQs, in USDC base units. Null when none. */
  avgBondUsdc: bigint | null;
  /** settled / (settled + expired + ignored + incomplete) × 100, 1 decimal. Null when denominator is 0. */
  settlementRatePct: number | null;
  /** Mean (completedAt − openedAt) over Settled rows with both timestamps. Null when none. */
  avgFillSecs: number | null;
  /** Open RFQs bucketed by quote mint; totalAmount = Σ minQuoteAmount per mint. Sorted by count desc. */
  openByQuoteMint: TokenBucket[];
  /** Top 3 mint pairs by settled count. */
  topPairs: TopPair[];
  /** Latest 3 lifecycle events (created / opened / settled) across all rows. */
  recent: RecentEvent[];
}

export function computeMarketStats(
  rows: readonly ProgramAccount<RfqAccount>[],
  resolve: ResolveToken = resolveTokenMeta,
): MarketStats {
  const countsByState = Object.fromEntries(ALL_RFQ_STATES.map((s) => [s, 0])) as Record<
    RFQState,
    number
  >;

  const makers = new Set<string>();
  let bondSum = 0n;
  let bondCount = 0;
  let fillSum = 0;
  let fillCount = 0;
  const openBuckets = new Map<string, TokenBucket>();
  const pairBuckets = new Map<string, TopPair>();
  const events: RecentEvent[] = [];

  for (const { account } of rows) {
    countsByState[account.state] += 1;
    makers.add(account.maker.toBase58());

    if (account.state !== "Draft") {
      bondSum += account.bondAmount;
      bondCount += 1;
    }

    const baseMint = account.baseMint.toBase58();
    const quoteMint = account.quoteMint.toBase58();
    const base = resolve(baseMint);
    const quote = resolve(quoteMint);
    const pair = `${base.symbol}/${quote.symbol}`;

    if (account.state === "Open") {
      const bucket = openBuckets.get(quoteMint) ?? {
        mint: quoteMint,
        symbol: quote.symbol,
        decimals: quote.decimals,
        count: 0,
        totalAmount: 0n,
      };
      bucket.count += 1;
      bucket.totalAmount += account.minQuoteAmount;
      openBuckets.set(quoteMint, bucket);
    }

    if (account.state === "Settled") {
      // Keyed by the mint pair (not the symbol label) so two distinct base
      // mints can never share a bucket's baseTotal.
      const key = `${baseMint}/${quoteMint}`;
      const bucket = pairBuckets.get(key) ?? {
        pair,
        settledCount: 0,
        baseTotal: 0n,
        baseSymbol: base.symbol,
        baseDecimals: base.decimals,
      };
      bucket.settledCount += 1;
      bucket.baseTotal += account.baseAmount;
      pairBuckets.set(key, bucket);

      if (account.openedAt !== null && account.completedAt !== null) {
        fillSum += account.completedAt - account.openedAt;
        fillCount += 1;
      }
      if (account.completedAt !== null) {
        events.push({ kind: "settled", pair, at: account.completedAt });
      }
    }

    events.push({ kind: "created", pair, at: account.createdAt });
    if (account.openedAt !== null) {
      events.push({ kind: "opened", pair, at: account.openedAt });
    }
  }

  const settledCount = countsByState.Settled;
  const closedCount =
    settledCount + countsByState.Expired + countsByState.Ignored + countsByState.Incomplete;

  return {
    countsByState,
    openCount: countsByState.Open,
    committedCount: countsByState.Committed,
    revealedCount: countsByState.Revealed,
    settledCount,
    distinctMakers: makers.size,
    avgBondUsdc: bondCount > 0 ? bondSum / BigInt(bondCount) : null,
    settlementRatePct:
      closedCount > 0 ? Math.round((settledCount / closedCount) * 1000) / 10 : null,
    avgFillSecs: fillCount > 0 ? Math.round(fillSum / fillCount) : null,
    openByQuoteMint: [...openBuckets.values()].sort(
      (a, b) => b.count - a.count || a.symbol.localeCompare(b.symbol),
    ),
    topPairs: [...pairBuckets.values()]
      .sort((a, b) => b.settledCount - a.settledCount || a.pair.localeCompare(b.pair))
      .slice(0, 3),
    recent: events.sort((a, b) => b.at - a.at).slice(0, 3),
  };
}
