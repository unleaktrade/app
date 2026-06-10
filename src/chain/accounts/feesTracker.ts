import type { PublicKey } from "@solana/web3.js";
import type { BN } from "@coral-xyz/anchor";
import type { UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";
import {
  bumpSchema,
  publicKeySchema,
  toBigInt,
  toUnixSeconds,
  u64AmountSchema,
  unixSecondsSchema,
} from "./shared";
import { useDecodedAccount, type AccountCodec } from "./useDecodedAccount";

export const feesTrackerAccountSchema = z.object({
  rfq: publicKeySchema,
  taker: publicKeySchema,
  quoteMint: publicKeySchema,
  treasuryWallet: publicKeySchema,
  amount: u64AmountSchema,
  payedAt: unixSecondsSchema,
  bump: bumpSchema,
});

export type FeesTrackerAccount = z.infer<typeof feesTrackerAccountSchema>;

export interface RawFeesTracker {
  rfq: PublicKey;
  taker: PublicKey;
  quoteMint: PublicKey;
  treasuryWallet: PublicKey;
  amount: BN;
  payedAt: BN;
  bump: number;
}

export function normaliseFeesTracker(raw: RawFeesTracker): FeesTrackerAccount {
  return feesTrackerAccountSchema.parse({
    rfq: raw.rfq,
    taker: raw.taker,
    quoteMint: raw.quoteMint,
    treasuryWallet: raw.treasuryWallet,
    amount: toBigInt(raw.amount),
    payedAt: toUnixSeconds(raw.payedAt),
    bump: raw.bump,
  });
}

const feesTrackerCodec: AccountCodec<RawFeesTracker, FeesTrackerAccount> = {
  accountKey: "feesTracker",
  normalise: normaliseFeesTracker,
};

export function useFeesTrackerAccount(
  address: PublicKey | null,
): UseQueryResult<FeesTrackerAccount | null> {
  return useDecodedAccount(feesTrackerCodec, address);
}
