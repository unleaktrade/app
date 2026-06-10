import { PublicKey } from "@solana/web3.js";

const encoder = new TextEncoder();

const CONFIG_SEED = encoder.encode("config");
const RFQ_SEED = encoder.encode("rfq");
const QUOTE_SEED = encoder.encode("quote");
const COMMIT_GUARD_SEED = encoder.encode("commit-guard");
const SETTLEMENT_SEED = encoder.encode("settlement");
const FEES_TRACKER_SEED = encoder.encode("fees_tracker");
const SLASHED_BONDS_TRACKER_SEED = encoder.encode("slashed_bonds_tracker");
const FACILITATOR_REWARD_SEED = encoder.encode("facilitator_reward");

function requireLength(name: string, bytes: Uint8Array, expected: number): void {
  if (bytes.length !== expected) {
    throw new Error(`${name} must be ${expected} bytes, got ${bytes.length}`);
  }
}

export function deriveConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], programId);
}

export function deriveRfqPda(
  programId: PublicKey,
  maker: PublicKey,
  uuid: Uint8Array,
): [PublicKey, number] {
  requireLength("uuid", uuid, 16);
  return PublicKey.findProgramAddressSync([RFQ_SEED, maker.toBytes(), uuid], programId);
}

export function deriveQuotePda(
  programId: PublicKey,
  rfq: PublicKey,
  taker: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([QUOTE_SEED, rfq.toBytes(), taker.toBytes()], programId);
}

export function deriveCommitGuardPda(
  programId: PublicKey,
  commitHash: Uint8Array,
): [PublicKey, number] {
  requireLength("commitHash", commitHash, 32);
  return PublicKey.findProgramAddressSync([COMMIT_GUARD_SEED, commitHash], programId);
}

export function deriveSettlementPda(programId: PublicKey, rfq: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SETTLEMENT_SEED, rfq.toBytes()], programId);
}

export function deriveFeesTrackerPda(programId: PublicKey, rfq: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([FEES_TRACKER_SEED, rfq.toBytes()], programId);
}

export function deriveSlashedBondsTrackerPda(
  programId: PublicKey,
  rfq: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SLASHED_BONDS_TRACKER_SEED, rfq.toBytes()], programId);
}

export function deriveFacilitatorRewardPda(
  programId: PublicKey,
  rfq: PublicKey,
  facilitator: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [FACILITATOR_REWARD_SEED, rfq.toBytes(), facilitator.toBytes()],
    programId,
  );
}
