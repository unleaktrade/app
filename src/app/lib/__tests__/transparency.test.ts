import { describe, expect, it } from "vitest";
import { totalsByMint, sortLedger } from "../transparency";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";

describe("totalsByMint", () => {
  it("sums per mint and never across mints", () => {
    const totals = totalsByMint([
      { mint: USDC, amount: 100n },
      { mint: USDC, amount: 250n },
      { mint: WSOL, amount: 7n },
    ]);
    expect(totals).toHaveLength(2);
    const usdc = totals.find((t) => t.mint === USDC);
    const wsol = totals.find((t) => t.mint === WSOL);
    expect(usdc).toEqual({ mint: USDC, total: 350n, count: 2 });
    expect(wsol).toEqual({ mint: WSOL, total: 7n, count: 1 });
  });

  it("skips null amounts (tracker created, nothing seized yet)", () => {
    const totals = totalsByMint([
      { mint: USDC, amount: null },
      { mint: USDC, amount: 5n },
    ]);
    expect(totals).toEqual([{ mint: USDC, total: 5n, count: 1 }]);
  });

  it("orders by descending total", () => {
    const totals = totalsByMint([
      { mint: WSOL, amount: 1n },
      { mint: USDC, amount: 9_999_999_999_999n },
    ]);
    expect(totals.map((t) => t.mint)).toEqual([USDC, WSOL]);
  });

  it("returns [] for an empty ledger", () => {
    expect(totalsByMint([])).toEqual([]);
  });
});

describe("sortLedger", () => {
  it("sorts newest first, nulls last", () => {
    const rows = [{ at: 10 }, { at: null }, { at: 99 }];
    expect(sortLedger(rows, (r) => r.at).map((r) => r.at)).toEqual([99, 10, null]);
  });

  it("does not mutate the input", () => {
    const rows = [{ at: 1 }, { at: 2 }];
    sortLedger(rows, (r) => r.at);
    expect(rows.map((r) => r.at)).toEqual([1, 2]);
  });
});
