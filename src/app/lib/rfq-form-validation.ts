// Pure per-step validators + display helpers for the RFQ wizard
// (src/app/components/RFQForm.tsx). Each validator returns the first failing
// rule's user-facing message, or `null` when the step is valid — the form
// toasts that message verbatim, so the strings here are the UI copy and must
// stay byte-identical (the unit suite pins every one of them). Inputs are
// structural Picks of the form values so the wizard's state object satisfies
// them directly.

import type { Token } from "@/app/lib/tokens";

export interface TokensStepInput {
  baseToken: Token | null;
  quoteToken: Token | null;
  baseAmount: string;
  minQuoteAmount: string;
}

export interface EconomicsStepInput {
  bondAmount: string;
  takerFeeBps: string;
}

export interface TimingStepInput {
  commitTtlSecs: string;
  revealTtlSecs: string;
  selectionTtlSecs: string;
  fundTtlSecs: string;
}

/** Step 1 — both tokens picked, both amounts parse to a positive number. */
export function validateTokensStep({
  baseToken,
  quoteToken,
  baseAmount,
  minQuoteAmount,
}: TokensStepInput): string | null {
  if (!baseToken || !quoteToken) {
    return "Please select both tokens";
  }
  if (!baseAmount || parseFloat(baseAmount) <= 0) {
    return "Please enter a valid base amount";
  }
  if (!minQuoteAmount || parseFloat(minQuoteAmount) <= 0) {
    return "Please enter a valid minimum quote amount";
  }
  return null;
}

/** Step 2 — positive bond, integer fee within the on-chain 0..=10_000 bps range. */
export function validateEconomicsStep({
  bondAmount,
  takerFeeBps,
}: EconomicsStepInput): string | null {
  if (!bondAmount || parseFloat(bondAmount) <= 0) {
    return "Bond amount must be greater than 0";
  }
  const bps = Number(takerFeeBps);
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
    return "Protocol fee must be between 0 and 10000 bps";
  }
  return null;
}

/** Step 3 — every phase TTL parses to a positive integer number of seconds. */
export function validateTimingStep({
  commitTtlSecs,
  revealTtlSecs,
  selectionTtlSecs,
  fundTtlSecs,
}: TimingStepInput): string | null {
  if (
    parseInt(commitTtlSecs) <= 0 ||
    parseInt(revealTtlSecs) <= 0 ||
    parseInt(selectionTtlSecs) <= 0 ||
    parseInt(fundTtlSecs) <= 0
  ) {
    return "All TTL values must be greater than 0";
  }
  return null;
}

/** `minQuoteAmount / baseAmount` to 6 dp, or `null` while either side is empty/zero. */
export function calculateImpliedPrice(baseAmount: string, minQuoteAmount: string): string | null {
  if (!baseAmount || !minQuoteAmount || parseFloat(baseAmount) === 0) return null;
  return (parseFloat(minQuoteAmount) / parseFloat(baseAmount)).toFixed(6);
}

/** Coarse duration label (`45s` / `30m` / `2h`) used by the timing + review steps. */
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}
