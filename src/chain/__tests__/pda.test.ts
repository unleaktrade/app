import { describe, expect, it } from "vitest";
import { Buffer } from "buffer";
import { PublicKey } from "@solana/web3.js";
import {
  deriveCommitGuardPda,
  deriveConfigPda,
  deriveFacilitatorRewardPda,
  deriveFeesTrackerPda,
  deriveQuotePda,
  deriveRfqPda,
  deriveSettlementPda,
  deriveSlashedBondsTrackerPda,
} from "@/chain/pda";

const PROGRAM_ID = new PublicKey("7wrjbU1NbVtUCUGP1obi3aiT6QrjXZnH5XJDXMsKtkPG");
const A = PublicKey.unique();
const B = PublicKey.unique();

function expected(seeds: (Buffer | Uint8Array)[]): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
}

describe("PDA derivation", () => {
  it('config: ["config"]', () => {
    expect(deriveConfigPda(PROGRAM_ID)).toEqual(expected([Buffer.from("config")]));
  });

  it('rfq: ["rfq", maker, uuid]', () => {
    const uuid = new Uint8Array(16).fill(9);
    expect(deriveRfqPda(PROGRAM_ID, A, uuid)).toEqual(
      expected([Buffer.from("rfq"), A.toBytes(), uuid]),
    );
  });

  it('quote: ["quote", rfq, taker]', () => {
    expect(deriveQuotePda(PROGRAM_ID, A, B)).toEqual(
      expected([Buffer.from("quote"), A.toBytes(), B.toBytes()]),
    );
  });

  it('commit-guard: ["commit-guard", hash]', () => {
    const hash = new Uint8Array(32).fill(3);
    expect(deriveCommitGuardPda(PROGRAM_ID, hash)).toEqual(
      expected([Buffer.from("commit-guard"), hash]),
    );
  });

  it("settlement / fees_tracker / slashed_bonds_tracker: [seed, rfq]", () => {
    expect(deriveSettlementPda(PROGRAM_ID, A)).toEqual(
      expected([Buffer.from("settlement"), A.toBytes()]),
    );
    expect(deriveFeesTrackerPda(PROGRAM_ID, A)).toEqual(
      expected([Buffer.from("fees_tracker"), A.toBytes()]),
    );
    expect(deriveSlashedBondsTrackerPda(PROGRAM_ID, A)).toEqual(
      expected([Buffer.from("slashed_bonds_tracker"), A.toBytes()]),
    );
  });

  it('facilitator_reward: ["facilitator_reward", rfq, facilitator]', () => {
    expect(deriveFacilitatorRewardPda(PROGRAM_ID, A, B)).toEqual(
      expected([Buffer.from("facilitator_reward"), A.toBytes(), B.toBytes()]),
    );
  });

  it("is deterministic", () => {
    const uuid = new Uint8Array(16).fill(1);
    expect(deriveRfqPda(PROGRAM_ID, A, uuid)).toEqual(deriveRfqPda(PROGRAM_ID, A, uuid));
  });

  it("validates seed byte lengths", () => {
    expect(() => deriveRfqPda(PROGRAM_ID, A, new Uint8Array(15))).toThrow(/16 bytes/);
    expect(() => deriveCommitGuardPda(PROGRAM_ID, new Uint8Array(31))).toThrow(/32 bytes/);
  });
});
