import { useMemo } from "react";
import type { PublicKey } from "@solana/web3.js";
import type { UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";
import { env } from "@/chain/env";
import { deriveConfigPda } from "@/chain/pda";
import { bpsSchema, bumpSchema, publicKeySchema } from "./shared";
import { useDecodedAccount, type AccountCodec } from "./useDecodedAccount";

export const configAccountSchema = z.object({
  admin: publicKeySchema,
  usdcMint: publicKeySchema,
  treasuryWallet: publicKeySchema,
  liquidityGuard: publicKeySchema,
  facilitatorFeeBps: bpsSchema,
  bump: bumpSchema,
});

export type ConfigAccount = z.infer<typeof configAccountSchema>;

// Shape that Anchor's `program.account.config.fetch` returns (camelCase).
export interface RawConfig {
  admin: PublicKey;
  usdcMint: PublicKey;
  treasuryWallet: PublicKey;
  liquidityGuard: PublicKey;
  facilitatorFeeBps: number;
  bump: number;
}

export function normaliseConfig(raw: RawConfig): ConfigAccount {
  return configAccountSchema.parse({
    admin: raw.admin,
    usdcMint: raw.usdcMint,
    treasuryWallet: raw.treasuryWallet,
    liquidityGuard: raw.liquidityGuard,
    facilitatorFeeBps: raw.facilitatorFeeBps,
    bump: raw.bump,
  });
}

const configCodec: AccountCodec<RawConfig, ConfigAccount> = {
  accountKey: "config",
  normalise: normaliseConfig,
};

export function useConfigAccount(): UseQueryResult<ConfigAccount | null> {
  const pda = useMemo(() => deriveConfigPda(env.programId)[0], []);
  return useDecodedAccount(configCodec, pda);
}
