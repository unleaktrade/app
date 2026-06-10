import type { PublicKey } from "@solana/web3.js";
import type { BN } from "@coral-xyz/anchor";
import type { UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";
import {
  type AnchorRfqState,
  bpsSchema,
  bumpSchema,
  bytesSchema,
  mapNullable,
  publicKeySchema,
  rfqStateFromAnchor,
  rfqStateSchema,
  toBigInt,
  toBytes,
  toUnixSeconds,
  u16Schema,
  u32Schema,
  u64AmountSchema,
  unixSecondsSchema,
} from "./shared";
import { useDecodedAccount, type AccountCodec } from "./useDecodedAccount";

export const rfqAccountSchema = z.object({
  config: publicKeySchema,
  maker: publicKeySchema,
  uuid: bytesSchema(16),
  state: rfqStateSchema,
  baseMint: publicKeySchema,
  quoteMint: publicKeySchema,
  usdcMint: publicKeySchema,
  treasuryWallet: publicKeySchema,
  liquidityGuard: publicKeySchema,
  bondAmount: u64AmountSchema,
  baseAmount: u64AmountSchema,
  minQuoteAmount: u64AmountSchema,
  takerFeeBps: bpsSchema,
  facilitatorFeeBps: bpsSchema,
  commitTtlSecs: u32Schema,
  revealTtlSecs: u32Schema,
  selectionTtlSecs: u32Schema,
  fundTtlSecs: u32Schema,
  createdAt: unixSecondsSchema,
  openedAt: unixSecondsSchema.nullable(),
  selectedAt: unixSecondsSchema.nullable(),
  completedAt: unixSecondsSchema.nullable(),
  committedCount: u16Schema,
  revealedCount: u16Schema,
  selectedQuote: publicKeySchema.nullable(),
  settlement: publicKeySchema.nullable(),
  bondsEscrow: publicKeySchema,
  makerPaymentAccount: publicKeySchema,
  facilitator: publicKeySchema.nullable(),
  bump: bumpSchema,
});

export type RfqAccount = z.infer<typeof rfqAccountSchema>;

// Shape that Anchor's fetch/decode returns (camelCase).
export interface RawRfq {
  config: PublicKey;
  maker: PublicKey;
  uuid: number[] | Uint8Array;
  state: AnchorRfqState;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  usdcMint: PublicKey;
  treasuryWallet: PublicKey;
  liquidityGuard: PublicKey;
  bondAmount: BN;
  baseAmount: BN;
  minQuoteAmount: BN;
  takerFeeBps: number;
  facilitatorFeeBps: number;
  commitTtlSecs: number;
  revealTtlSecs: number;
  selectionTtlSecs: number;
  fundTtlSecs: number;
  createdAt: BN;
  openedAt: BN | null;
  selectedAt: BN | null;
  completedAt: BN | null;
  committedCount: number;
  revealedCount: number;
  selectedQuote: PublicKey | null;
  settlement: PublicKey | null;
  bondsEscrow: PublicKey;
  makerPaymentAccount: PublicKey;
  facilitator: PublicKey | null;
  bump: number;
}

export function normaliseRfq(raw: RawRfq): RfqAccount {
  return rfqAccountSchema.parse({
    config: raw.config,
    maker: raw.maker,
    uuid: toBytes(raw.uuid),
    state: rfqStateFromAnchor(raw.state),
    baseMint: raw.baseMint,
    quoteMint: raw.quoteMint,
    usdcMint: raw.usdcMint,
    treasuryWallet: raw.treasuryWallet,
    liquidityGuard: raw.liquidityGuard,
    bondAmount: toBigInt(raw.bondAmount),
    baseAmount: toBigInt(raw.baseAmount),
    minQuoteAmount: toBigInt(raw.minQuoteAmount),
    takerFeeBps: raw.takerFeeBps,
    facilitatorFeeBps: raw.facilitatorFeeBps,
    commitTtlSecs: raw.commitTtlSecs,
    revealTtlSecs: raw.revealTtlSecs,
    selectionTtlSecs: raw.selectionTtlSecs,
    fundTtlSecs: raw.fundTtlSecs,
    createdAt: toUnixSeconds(raw.createdAt),
    openedAt: mapNullable(raw.openedAt, toUnixSeconds),
    selectedAt: mapNullable(raw.selectedAt, toUnixSeconds),
    completedAt: mapNullable(raw.completedAt, toUnixSeconds),
    committedCount: raw.committedCount,
    revealedCount: raw.revealedCount,
    selectedQuote: raw.selectedQuote,
    settlement: raw.settlement,
    bondsEscrow: raw.bondsEscrow,
    makerPaymentAccount: raw.makerPaymentAccount,
    facilitator: raw.facilitator,
    bump: raw.bump,
  });
}

const rfqCodec: AccountCodec<RawRfq, RfqAccount> = {
  accountKey: "rfq",
  normalise: normaliseRfq,
};

export function useRfqAccount(address: PublicKey | null): UseQueryResult<RfqAccount | null> {
  return useDecodedAccount(rfqCodec, address);
}
