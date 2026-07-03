// Pure rewards derivation — no hooks, no chain I/O, unit-tested in
// __tests__/rewards.test.ts. Mirrors the withdraw_reward eligibility in
// ../settlement-engine: a reward is pending for wallet W on RFQ R iff
// R.state == Settled, the settlement completed, R.facilitator == W, the
// winning quote's facilitator == W, and the fee share is non-zero — computed
// from the RFQ's facilitatorFeeBps SNAPSHOT (never Config's current value).
// A FacilitatorRewardTracker existing for (rfq, W) means it's already claimed.
//
// Inputs are structural (same convention as src/chain/state-machine.ts) so
// decoded accounts and test fixtures both satisfy them. All protocol math
// stays bigint; the chart series helpers scale to display numbers at the edge.

import type { PublicKey } from "@solana/web3.js";
import type { RFQState } from "@/types/rfq";
import { computeFacilitatorShare, computeTotalFee } from "@/chain/math";
import { resolveTokenMeta, type ResolvedToken } from "./tokens";

export type ResolveToken = (mint: string) => ResolvedToken;

// --------------------------------------------------------------------------
// Structural input views (subset of the decoded account shapes).
// --------------------------------------------------------------------------

export interface RewardRfqView {
  state: RFQState;
  facilitator: PublicKey | null;
  settlement: PublicKey | null;
  selectedQuote: PublicKey | null;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  facilitatorFeeBps: number;
}

export interface RewardSettlementView {
  quoteAmount: bigint;
  takerFeeBps: number;
  completedAt: number | null;
}

export interface RewardQuoteView {
  facilitator: PublicKey | null;
}

export interface RewardTrackerView {
  rfq: PublicKey;
  facilitator: PublicKey;
  quoteMint: PublicKey;
  amount: bigint;
  claimedAt: number;
}

/** Mirrors ProgramAccount<T> from lists.ts without importing hook plumbing. */
export interface RewardRow<T> {
  publicKey: PublicKey;
  account: T;
}

// --------------------------------------------------------------------------
// Output shapes.
// --------------------------------------------------------------------------

export interface PendingReward {
  rfq: string;
  quote: string;
  quoteMint: string;
  symbol: string;
  decimals: number;
  amount: bigint;
  settledAt: number | null;
  pair: string;
}

export interface ClaimedReward {
  tracker: string;
  rfq: string;
  quoteMint: string;
  symbol: string;
  decimals: number;
  amount: bigint;
  claimedAt: number;
  /** "BASE/QUOTE" when the RFQ row is available, else null. */
  pair: string | null;
}

export interface MintRewardTotals {
  mint: string;
  symbol: string;
  decimals: number;
  pendingTotal: bigint;
  claimedTotal: bigint;
}

/** Display-scale a base-unit amount. Chart/series edge only — protocol math stays bigint. */
function toDisplay(amount: bigint, decimals: number): number {
  if (decimals === 0) return Number(amount);
  return Number(amount) / 10 ** decimals;
}

function pairOf(rfq: RewardRfqView, resolve: ResolveToken): string {
  const base = resolve(rfq.baseMint.toBase58());
  const quote = resolve(rfq.quoteMint.toBase58());
  return `${base.symbol}/${quote.symbol}`;
}

// --------------------------------------------------------------------------
// Derivation.
// --------------------------------------------------------------------------

export function derivePendingRewards(args: {
  rfqRows: RewardRow<RewardRfqView>[];
  settlements: Map<string, RewardSettlementView>;
  quotes: Map<string, RewardQuoteView>;
  trackers: RewardRow<RewardTrackerView>[];
  me: string;
  resolve?: ResolveToken;
}): PendingReward[] {
  const { rfqRows, settlements, quotes, trackers, me } = args;
  const resolve = args.resolve ?? resolveTokenMeta;

  const claimedRfqs = new Set(
    trackers
      .filter((t) => t.account.facilitator.toBase58() === me)
      .map((t) => t.account.rfq.toBase58()),
  );

  const pending: PendingReward[] = [];
  for (const row of rfqRows) {
    const rfq = row.account;
    if (rfq.state !== "Settled") continue;
    if (rfq.facilitator?.toBase58() !== me) continue;
    const rfqKey = row.publicKey.toBase58();
    if (claimedRfqs.has(rfqKey)) continue;
    if (rfq.settlement === null || rfq.selectedQuote === null) continue;

    // Tolerate missing map entries (bulk fetch still in flight / pruned account).
    const settlement = settlements.get(rfq.settlement.toBase58());
    if (!settlement || settlement.completedAt === null) continue;
    const quote = quotes.get(rfq.selectedQuote.toBase58());
    if (!quote || quote.facilitator?.toBase58() !== me) continue;

    // Share from the RFQ's facilitatorFeeBps snapshot — never Config's current value.
    const totalFee = computeTotalFee(settlement.quoteAmount, settlement.takerFeeBps);
    const share = computeFacilitatorShare(totalFee, rfq.facilitatorFeeBps);
    if (share <= 0n) continue;

    const quoteMint = rfq.quoteMint.toBase58();
    const { symbol, decimals } = resolve(quoteMint);
    pending.push({
      rfq: rfqKey,
      quote: rfq.selectedQuote.toBase58(),
      quoteMint,
      symbol,
      decimals,
      amount: share,
      settledAt: settlement.completedAt,
      pair: pairOf(rfq, resolve),
    });
  }

  // Most recently settled first.
  return pending.sort((a, b) => (b.settledAt ?? 0) - (a.settledAt ?? 0));
}

export function toClaimedRewards(
  trackers: RewardRow<RewardTrackerView>[],
  rfqRows?: RewardRow<RewardRfqView>[],
  resolve: ResolveToken = resolveTokenMeta,
): ClaimedReward[] {
  const rfqByKey = new Map((rfqRows ?? []).map((r) => [r.publicKey.toBase58(), r.account]));
  return trackers
    .map((row) => {
      const quoteMint = row.account.quoteMint.toBase58();
      const { symbol, decimals } = resolve(quoteMint);
      const rfqKey = row.account.rfq.toBase58();
      const rfq = rfqByKey.get(rfqKey);
      return {
        tracker: row.publicKey.toBase58(),
        rfq: rfqKey,
        quoteMint,
        symbol,
        decimals,
        amount: row.account.amount,
        claimedAt: row.account.claimedAt,
        pair: rfq ? pairOf(rfq, resolve) : null,
      };
    })
    .sort((a, b) => b.claimedAt - a.claimedAt);
}

/**
 * Per-mint pending/claimed totals. Each mint stays its own row — NEVER a
 * cross-mint grand total (amounts in different mints are not comparable).
 */
export function groupByMint(
  pending: PendingReward[],
  claimed: ClaimedReward[],
): MintRewardTotals[] {
  const groups = new Map<string, MintRewardTotals>();
  const ensure = (mint: string, symbol: string, decimals: number): MintRewardTotals => {
    let group = groups.get(mint);
    if (!group) {
      group = { mint, symbol, decimals, pendingTotal: 0n, claimedTotal: 0n };
      groups.set(mint, group);
    }
    return group;
  };
  for (const r of pending) ensure(r.quoteMint, r.symbol, r.decimals).pendingTotal += r.amount;
  for (const r of claimed) ensure(r.quoteMint, r.symbol, r.decimals).claimedTotal += r.amount;
  return [...groups.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

/**
 * Cumulative claimed value per mint over time, keyed by symbol, display-scaled,
 * sorted by claimedAt — one LineChart datum per claim event. Every point carries
 * the running total of every symbol so each per-mint line is continuous; the
 * lines are separate series, never a combined cross-mint sum.
 */
export function cumulativeClaimSeries(
  claimed: ClaimedReward[],
): Array<Record<string, number> & { at: number }> {
  const sorted = [...claimed].sort((a, b) => a.claimedAt - b.claimedAt);
  const running = new Map<string, number>();
  for (const c of sorted) running.set(c.symbol, 0);
  return sorted.map((c) => {
    running.set(c.symbol, (running.get(c.symbol) ?? 0) + toDisplay(c.amount, c.decimals));
    const point: Record<string, number> = { at: c.claimedAt };
    for (const [symbol, value] of running) point[symbol] = value;
    return point as Record<string, number> & { at: number };
  });
}

/** Pending vs claimed display totals per token symbol (BarChart input). */
export function totalsByTokenSeries(
  pending: PendingReward[],
  claimed: ClaimedReward[],
): { symbol: string; pending: number; claimed: number }[] {
  return groupByMint(pending, claimed).map((g) => ({
    symbol: g.symbol,
    pending: toDisplay(g.pendingTotal, g.decimals),
    claimed: toDisplay(g.claimedTotal, g.decimals),
  }));
}
