// Pins every rule + error message the RFQ wizard's per-step validators
// produce. The messages are the exact toast copy the form shows, so each
// assertion is byte-for-byte — change the copy in one place and this suite
// tells you.

import { describe, expect, it } from "vitest";
import type { Token } from "@/app/lib/tokens";
import {
  calculateImpliedPrice,
  formatTime,
  validateEconomicsStep,
  validateTimingStep,
  validateTokensStep,
} from "../rfq-form-validation";

const SOL: Token = {
  symbol: "SOL",
  name: "Solana",
  mint: "So11111111111111111111111111111111111111112",
  decimals: 9,
};
const USDC: Token = {
  symbol: "USDC",
  name: "USD Coin",
  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  decimals: 6,
};

const validTokens = {
  baseToken: SOL,
  quoteToken: USDC,
  baseAmount: "10",
  minQuoteAmount: "1500",
};

describe("validateTokensStep", () => {
  it("passes a fully populated step", () => {
    expect(validateTokensStep(validTokens)).toBeNull();
  });

  it("requires both tokens before looking at amounts", () => {
    expect(validateTokensStep({ ...validTokens, baseToken: null })).toBe(
      "Please select both tokens",
    );
    expect(validateTokensStep({ ...validTokens, quoteToken: null })).toBe(
      "Please select both tokens",
    );
    // Token check wins even when the amounts are also broken.
    expect(
      validateTokensStep({ baseToken: null, quoteToken: null, baseAmount: "", minQuoteAmount: "" }),
    ).toBe("Please select both tokens");
  });

  it("rejects an empty, zero or negative base amount", () => {
    for (const baseAmount of ["", "0", "-1", "0.0"]) {
      expect(validateTokensStep({ ...validTokens, baseAmount })).toBe(
        "Please enter a valid base amount",
      );
    }
  });

  it("rejects an empty, zero or negative minimum quote amount", () => {
    for (const minQuoteAmount of ["", "0", "-5"]) {
      expect(validateTokensStep({ ...validTokens, minQuoteAmount })).toBe(
        "Please enter a valid minimum quote amount",
      );
    }
  });

  it("checks the base amount before the minimum quote amount", () => {
    expect(validateTokensStep({ ...validTokens, baseAmount: "", minQuoteAmount: "" })).toBe(
      "Please enter a valid base amount",
    );
  });

  it("accepts fractional positive amounts", () => {
    expect(validateTokensStep({ ...validTokens, baseAmount: "0.5", minQuoteAmount: "0.01" })).toBe(
      null,
    );
  });

  it("mirrors parseFloat: non-numeric text is NaN and does not trip the <= 0 guard", () => {
    // The amount inputs are type="number", so this never reaches the wizard
    // from the UI; pinned so a future tightening is deliberate, not silent.
    expect(validateTokensStep({ ...validTokens, baseAmount: "abc" })).toBeNull();
    expect(validateTokensStep({ ...validTokens, minQuoteAmount: "abc" })).toBeNull();
  });
});

describe("validateEconomicsStep", () => {
  it("passes a positive bond with an in-range integer fee", () => {
    expect(validateEconomicsStep({ bondAmount: "5000", takerFeeBps: "50" })).toBeNull();
    expect(validateEconomicsStep({ bondAmount: "0.01", takerFeeBps: "0" })).toBeNull();
    expect(validateEconomicsStep({ bondAmount: "1", takerFeeBps: "10000" })).toBeNull();
  });

  it("rejects an empty, zero or negative bond amount", () => {
    for (const bondAmount of ["", "0", "-100"]) {
      expect(validateEconomicsStep({ bondAmount, takerFeeBps: "50" })).toBe(
        "Bond amount must be greater than 0",
      );
    }
  });

  it("rejects a fee outside 0..=10000 bps", () => {
    for (const takerFeeBps of ["-1", "10001", "99999"]) {
      expect(validateEconomicsStep({ bondAmount: "5000", takerFeeBps })).toBe(
        "Protocol fee must be between 0 and 10000 bps",
      );
    }
  });

  it("rejects a non-integer or non-numeric fee", () => {
    for (const takerFeeBps of ["50.5", "abc", "1e400"]) {
      expect(validateEconomicsStep({ bondAmount: "5000", takerFeeBps })).toBe(
        "Protocol fee must be between 0 and 10000 bps",
      );
    }
  });

  it("mirrors parseFloat: a non-numeric bond is NaN and does not trip the <= 0 guard", () => {
    expect(validateEconomicsStep({ bondAmount: "abc", takerFeeBps: "50" })).toBeNull();
  });

  it("treats an empty fee as 0 bps (Number('') === 0)", () => {
    expect(validateEconomicsStep({ bondAmount: "5000", takerFeeBps: "" })).toBeNull();
  });

  it("checks the bond before the fee", () => {
    expect(validateEconomicsStep({ bondAmount: "", takerFeeBps: "-1" })).toBe(
      "Bond amount must be greater than 0",
    );
  });
});

describe("validateTimingStep", () => {
  const valid = {
    commitTtlSecs: "3600",
    revealTtlSecs: "1800",
    selectionTtlSecs: "1800",
    fundTtlSecs: "3600",
  };

  it("passes when every TTL is a positive integer", () => {
    expect(validateTimingStep(valid)).toBeNull();
    expect(
      validateTimingStep({
        commitTtlSecs: "1",
        revealTtlSecs: "1",
        selectionTtlSecs: "1",
        fundTtlSecs: "1",
      }),
    ).toBeNull();
  });

  it.each(["commitTtlSecs", "revealTtlSecs", "selectionTtlSecs", "fundTtlSecs"] as const)(
    "rejects a zero or negative %s",
    (field) => {
      expect(validateTimingStep({ ...valid, [field]: "0" })).toBe(
        "All TTL values must be greater than 0",
      );
      expect(validateTimingStep({ ...valid, [field]: "-60" })).toBe(
        "All TTL values must be greater than 0",
      );
    },
  );

  it("mirrors parseInt: a non-numeric TTL is NaN and does not trip the <= 0 guard", () => {
    // parseInt("abc") is NaN, and NaN <= 0 is false — the wizard lets it
    // through to the review step, where formatTime renders "NaNs". Pinned so a
    // future tightening is a deliberate change, not a silent one.
    expect(validateTimingStep({ ...valid, commitTtlSecs: "abc" })).toBeNull();
    expect(validateTimingStep({ ...valid, fundTtlSecs: "" })).toBeNull();
  });
});

describe("calculateImpliedPrice", () => {
  it("divides minimum quote by base amount to 6 decimals", () => {
    expect(calculateImpliedPrice("10", "1500")).toBe("150.000000");
    expect(calculateImpliedPrice("3", "1")).toBe("0.333333");
    expect(calculateImpliedPrice("0.5", "100")).toBe("200.000000");
  });

  it("returns null while either side is empty or the base is zero", () => {
    expect(calculateImpliedPrice("", "1500")).toBeNull();
    expect(calculateImpliedPrice("10", "")).toBeNull();
    expect(calculateImpliedPrice("0", "1500")).toBeNull();
    expect(calculateImpliedPrice("0.0", "1500")).toBeNull();
  });
});

describe("formatTime", () => {
  it("uses seconds below a minute", () => {
    expect(formatTime(0)).toBe("0s");
    expect(formatTime(45)).toBe("45s");
    expect(formatTime(59)).toBe("59s");
  });

  it("floors to whole minutes below an hour", () => {
    expect(formatTime(60)).toBe("1m");
    expect(formatTime(899)).toBe("14m");
    expect(formatTime(1800)).toBe("30m");
    expect(formatTime(3599)).toBe("59m");
  });

  it("floors to whole hours from an hour up", () => {
    expect(formatTime(3600)).toBe("1h");
    expect(formatTime(7199)).toBe("1h");
    expect(formatTime(7200)).toBe("2h");
    expect(formatTime(8700)).toBe("2h");
  });
});
