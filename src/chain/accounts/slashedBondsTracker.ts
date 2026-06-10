import type { PublicKey } from "@solana/web3.js";
import type { BN } from "@coral-xyz/anchor";
import type { UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";
import {
  bumpSchema,
  mapNullable,
  publicKeySchema,
  toBigInt,
  toUnixSeconds,
  u64AmountSchema,
  unixSecondsSchema,
} from "./shared";
import { useDecodedAccount, type AccountCodec } from "./useDecodedAccount";

export const slashedBondsTrackerAccountSchema = z.object({
  rfq: publicKeySchema,
  usdcMint: publicKeySchema,
  treasuryWallet: publicKeySchema,
  amount: u64AmountSchema.nullable(),
  seizedAt: unixSecondsSchema.nullable(),
  bump: bumpSchema,
});

export type SlashedBondsTrackerAccount = z.infer<typeof slashedBondsTrackerAccountSchema>;

export interface RawSlashedBondsTracker {
  rfq: PublicKey;
  usdcMint: PublicKey;
  treasuryWallet: PublicKey;
  amount: BN | null;
  seizedAt: BN | null;
  bump: number;
}

export function normaliseSlashedBondsTracker(
  raw: RawSlashedBondsTracker,
): SlashedBondsTrackerAccount {
  return slashedBondsTrackerAccountSchema.parse({
    rfq: raw.rfq,
    usdcMint: raw.usdcMint,
    treasuryWallet: raw.treasuryWallet,
    amount: mapNullable(raw.amount, toBigInt),
    seizedAt: mapNullable(raw.seizedAt, toUnixSeconds),
    bump: raw.bump,
  });
}

const slashedBondsTrackerCodec: AccountCodec<RawSlashedBondsTracker, SlashedBondsTrackerAccount> = {
  accountKey: "slashedBondsTracker",
  normalise: normaliseSlashedBondsTracker,
};

export function useSlashedBondsTrackerAccount(
  address: PublicKey | null,
): UseQueryResult<SlashedBondsTrackerAccount | null> {
  return useDecodedAccount(slashedBondsTrackerCodec, address);
}
