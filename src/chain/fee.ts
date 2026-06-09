// Mirrors ../settlement-engine/programs/settlement-engine/src/instructions/settlement/complete_settlement.rs
// and the liquidity-guard fee-uplift rules. All math is bigint; no floats.

export function takerUplift(quoteAmount: bigint, bps: number): bigint {
  if (bps <= 0) return 0n;
  const uplift = (quoteAmount * BigInt(bps)) / 10_000n;
  return uplift === 0n ? 1n : uplift;
}

export function facilitatorShare(totalFee: bigint, bps: number): bigint {
  if (bps <= 0) return 0n;
  return (totalFee * BigInt(bps)) / 10_000n;
}

export function makerNet(quoteAmount: bigint, totalFee: bigint): bigint {
  return quoteAmount - totalFee;
}
