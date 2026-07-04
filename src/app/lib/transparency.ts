// Pure aggregation for the read-only /dashboard/transparency ledger
// (issue #16). Amounts stay denominated per mint — never summed across mints,
// never converted to USD (no oracle; see the reward-denomination rule).

export interface LedgerEntry {
  /** Base58 mint the amount is denominated in. */
  mint: string;
  /** Base-unit amount; null = tracker created but nothing seized/recorded yet. */
  amount: bigint | null;
}

export interface MintTotal {
  mint: string;
  /** Sum of non-null amounts, in that mint's base units. */
  total: bigint;
  /** Number of entries carrying a non-null amount for this mint. */
  count: number;
}

/** Per-mint totals, ordered by descending total (stable for equal totals). */
export function totalsByMint(entries: LedgerEntry[]): MintTotal[] {
  const acc = new Map<string, MintTotal>();
  for (const entry of entries) {
    if (entry.amount === null) continue;
    const bucket = acc.get(entry.mint) ?? { mint: entry.mint, total: 0n, count: 0 };
    bucket.total += entry.amount;
    bucket.count += 1;
    acc.set(entry.mint, bucket);
  }
  return [...acc.values()].sort((a, b) => (b.total > a.total ? 1 : b.total < a.total ? -1 : 0));
}

/** Entries with a recorded amount, newest first by the given timestamp pick. */
export function sortLedger<T>(rows: T[], at: (row: T) => number | null): T[] {
  return [...rows].sort((a, b) => (at(b) ?? 0) - (at(a) ?? 0));
}
