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

export const facilitatorRewardTrackerAccountSchema = z.object({
  rfq: publicKeySchema,
  facilitator: publicKeySchema,
  quoteMint: publicKeySchema,
  amount: u64AmountSchema,
  claimedAt: unixSecondsSchema,
  bump: bumpSchema,
});

export type FacilitatorRewardTrackerAccount = z.infer<typeof facilitatorRewardTrackerAccountSchema>;

export interface RawFacilitatorRewardTracker {
  rfq: PublicKey;
  facilitator: PublicKey;
  quoteMint: PublicKey;
  amount: BN;
  claimedAt: BN;
  bump: number;
}

export function normaliseFacilitatorRewardTracker(
  raw: RawFacilitatorRewardTracker,
): FacilitatorRewardTrackerAccount {
  return facilitatorRewardTrackerAccountSchema.parse({
    rfq: raw.rfq,
    facilitator: raw.facilitator,
    quoteMint: raw.quoteMint,
    amount: toBigInt(raw.amount),
    claimedAt: toUnixSeconds(raw.claimedAt),
    bump: raw.bump,
  });
}

const facilitatorRewardTrackerCodec: AccountCodec<
  RawFacilitatorRewardTracker,
  FacilitatorRewardTrackerAccount
> = {
  accountKey: "facilitatorRewardTracker",
  normalise: normaliseFacilitatorRewardTracker,
};

export function useFacilitatorRewardTrackerAccount(
  address: PublicKey | null,
): UseQueryResult<FacilitatorRewardTrackerAccount | null> {
  return useDecodedAccount(facilitatorRewardTrackerCodec, address);
}
