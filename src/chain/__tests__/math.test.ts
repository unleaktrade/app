import { describe, expect, it } from "vitest";
import { computeFacilitatorShare, computeTotalFee, takerUplift, totalToFund } from "@/chain/math";

describe("computeTotalFee (settlement.rs compute_total_fee)", () => {
  it("floors the bps product", () => {
    // 950_000_000 * 30 / 10_000 = 2_850_000 exactly
    expect(computeTotalFee(950_000_000n, 30)).toBe(2_850_000n);
    // 999 * 30 / 10_000 = 2.997 → floors to 2
    expect(computeTotalFee(999n, 30)).toBe(2n);
  });

  it("guarantees a minimum fee of 1 when bps > 0", () => {
    // 10 * 1 / 10_000 = 0.001 → floored 0 → min 1
    expect(computeTotalFee(10n, 1)).toBe(1n);
    expect(computeTotalFee(0n, 30)).toBe(1n);
  });

  it("returns 0 when bps == 0", () => {
    expect(computeTotalFee(1_000_000n, 0)).toBe(0n);
  });

  it("handles amounts beyond 2^53", () => {
    const huge = 2n ** 60n;
    expect(computeTotalFee(huge, 100)).toBe(huge / 100n);
  });
});

describe("computeFacilitatorShare (settlement.rs compute_facilitator_share)", () => {
  it("floors with no minimum", () => {
    expect(computeFacilitatorShare(2_850_000n, 500)).toBe(142_500n);
    // 1 * 500 / 10_000 = 0.05 → 0 (no min-1 rule here)
    expect(computeFacilitatorShare(1n, 500)).toBe(0n);
  });

  it("returns 0 for zero bps", () => {
    expect(computeFacilitatorShare(2_850_000n, 0)).toBe(0n);
  });
});

describe("derived helpers", () => {
  it("takerUplift equals the protocol fee (liquidity-guard balance rule)", () => {
    expect(takerUplift(950_000_000n, 30)).toBe(computeTotalFee(950_000_000n, 30));
  });

  it("totalToFund = quote + fee (fee is paid on top; the full quote reaches the counterparty)", () => {
    expect(totalToFund(950_000_000n, 30)).toBe(952_850_000n);
    expect(totalToFund(950_000_000n, 0)).toBe(950_000_000n);
  });
});
