import type { PublicKey } from "@solana/web3.js";
import type { BN } from "@coral-xyz/anchor";
import type { UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";
import { bumpSchema, publicKeySchema, toUnixSeconds, unixSecondsSchema } from "./shared";
import { useDecodedAccount, type AccountCodec } from "./useDecodedAccount";

export const commitGuardAccountSchema = z.object({
  quote: publicKeySchema,
  committedAt: unixSecondsSchema,
  bump: bumpSchema,
});

export type CommitGuardAccount = z.infer<typeof commitGuardAccountSchema>;

export interface RawCommitGuard {
  quote: PublicKey;
  committedAt: BN;
  bump: number;
}

export function normaliseCommitGuard(raw: RawCommitGuard): CommitGuardAccount {
  return commitGuardAccountSchema.parse({
    quote: raw.quote,
    committedAt: toUnixSeconds(raw.committedAt),
    bump: raw.bump,
  });
}

const commitGuardCodec: AccountCodec<RawCommitGuard, CommitGuardAccount> = {
  accountKey: "commitGuard",
  normalise: normaliseCommitGuard,
};

export function useCommitGuardAccount(
  address: PublicKey | null,
): UseQueryResult<CommitGuardAccount | null> {
  return useDecodedAccount(commitGuardCodec, address);
}
