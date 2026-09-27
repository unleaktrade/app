// Maps a failed liquidity-guard /check call to what SubmitQuoteModal shows.
// Kept pure (no React, no toast) so every branch is unit-tested.

import { LiquidityGuardError } from "@/chain/liquidityGuard";

export type GuardErrorView =
  /** Reads like a funds shortfall: the modal shows the beta-token guidance. */
  | { kind: "shortfall"; message: string }
  /** Anything else: a one-line error under the form. */
  | { kind: "error"; message: string };

export function describeGuardError(err: unknown): GuardErrorView {
  if (err instanceof LiquidityGuardError) {
    if (err.status === 429) {
      return {
        kind: "error",
        message: "Liquidity-guard is rate-limited — wait a moment and retry.",
      };
    }
    // 401/403: the guard refused this deployment's API key. Nothing the user
    // can fix by retrying — it is a configuration problem on our side.
    if (err.status === 401 || err.status === 403) {
      return {
        kind: "error",
        message:
          "Liquidity-guard refused this app's API key — the deployment is misconfigured. Please report it; retrying won't help.",
      };
    }
    if (/insufficient|balance|funds/i.test(err.message)) {
      return { kind: "shortfall", message: err.message };
    }
    return { kind: "error", message: `Liquidity-guard rejected the quote: ${err.message}` };
  }
  if (err instanceof Error) return { kind: "error", message: err.message };
  return { kind: "error", message: "Failed to commit quote" };
}
