import { describe, expect, it } from "vitest";
import { describeGuardError } from "@/app/lib/guard-errors";
import { LiquidityGuardError } from "@/chain/liquidityGuard";

describe("describeGuardError", () => {
  it("maps 401 and 403 to the misconfigured-deployment message", () => {
    for (const status of [401, 403]) {
      const view = describeGuardError(new LiquidityGuardError(status, "Unauthorized"));
      expect(view.kind).toBe("error");
      expect(view.message).toMatch(/refused this app's API key/);
      // Never framed as a quote rejection or a funds problem.
      expect(view.message).not.toMatch(/rejected the quote|balance/);
    }
  });

  it("maps 429 to the rate-limit hint, even if the body mentions balance", () => {
    expect(describeGuardError(new LiquidityGuardError(429, "balance"))).toEqual({
      kind: "error",
      message: "Liquidity-guard is rate-limited — wait a moment and retry.",
    });
  });

  it("routes funds shortfalls to the beta-token guidance", () => {
    for (const msg of [
      "Insufficient USDC balance: have 1, need 2",
      "insufficient funds",
      "Quote token Balance too low",
    ]) {
      expect(describeGuardError(new LiquidityGuardError(400, msg))).toEqual({
        kind: "shortfall",
        message: msg,
      });
    }
  });

  it("prefixes other guard rejections", () => {
    expect(describeGuardError(new LiquidityGuardError(400, "Invalid salt"))).toEqual({
      kind: "error",
      message: "Liquidity-guard rejected the quote: Invalid salt",
    });
  });

  it("passes through plain errors and falls back for non-errors", () => {
    expect(describeGuardError(new Error("wallet closed"))).toEqual({
      kind: "error",
      message: "wallet closed",
    });
    expect(describeGuardError("boom")).toEqual({
      kind: "error",
      message: "Failed to commit quote",
    });
  });
});
