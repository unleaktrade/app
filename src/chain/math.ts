// Mirrors ../settlement-engine/programs/settlement-engine/src/state/settlement.rs
// (compute_total_fee / compute_facilitator_share) and the maker-net payout in
// complete_settlement.rs. All math is bigint; no floats.

const BPS_DENOMINATOR = 10_000n;

/** Floor division, but guarantee at least 1 when takerFeeBps > 0. */
export function computeTotalFee(quoteAmount: bigint, takerFeeBps: number): bigint {
  if (takerFeeBps <= 0) return 0n;
  const fee = (quoteAmount * BigInt(takerFeeBps)) / BPS_DENOMINATOR;
  return fee === 0n ? 1n : fee;
}

/** Facilitator share = floor(totalFee * facilitatorFeeBps / 10_000). */
export function computeFacilitatorShare(totalFee: bigint, facilitatorFeeBps: number): bigint {
  if (facilitatorFeeBps <= 0) return 0n;
  return (totalFee * BigInt(facilitatorFeeBps)) / BPS_DENOMINATOR;
}

/**
 * The taker must hold quote_amount plus the protocol fee uplift to fund a
 * settlement — identical formula to computeTotalFee; named for the
 * liquidity-guard balance rule it backs.
 */
export function takerUplift(quoteAmount: bigint, takerFeeBps: number): bigint {
  return computeTotalFee(quoteAmount, takerFeeBps);
}

/**
 * Total quote-side outlay to fund a settlement: the fee is paid ON TOP of the
 * quote amount (complete_settlement.rs transfers the fee from the taker's
 * quote account and then the full quote_amount to the maker — the maker
 * receives quote_amount undiminished).
 */
export function totalToFund(quoteAmount: bigint, takerFeeBps: number): bigint {
  return quoteAmount + computeTotalFee(quoteAmount, takerFeeBps);
}
