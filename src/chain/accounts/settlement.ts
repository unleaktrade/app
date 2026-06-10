import type { PublicKey } from "@solana/web3.js";
import type { BN } from "@coral-xyz/anchor";
import type { UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";
import {
  bpsSchema,
  bumpSchema,
  mapNullable,
  publicKeySchema,
  toBigInt,
  toUnixSeconds,
  u64AmountSchema,
  unixSecondsSchema,
} from "./shared";
import { useDecodedAccount, type AccountCodec } from "./useDecodedAccount";

export const settlementAccountSchema = z.object({
  rfq: publicKeySchema,
  quote: publicKeySchema,
  maker: publicKeySchema,
  taker: publicKeySchema,
  baseMint: publicKeySchema,
  quoteMint: publicKeySchema,
  baseAmount: u64AmountSchema,
  quoteAmount: u64AmountSchema,
  bondAmount: u64AmountSchema,
  takerFeeBps: bpsSchema,
  makerPaymentAccount: publicKeySchema,
  takerPaymentAccount: publicKeySchema,
  bondsEscrow: publicKeySchema,
  makerBaseAccount: publicKeySchema,
  takerBaseAccount: publicKeySchema.nullable(),
  vaultBaseAta: publicKeySchema,
  makerQuoteAccount: publicKeySchema,
  takerQuoteAccount: publicKeySchema.nullable(),
  createdAt: unixSecondsSchema,
  completedAt: unixSecondsSchema.nullable(),
  makerFundedAt: unixSecondsSchema.nullable(),
  takerFundedAt: unixSecondsSchema.nullable(),
  bump: bumpSchema,
});

export type SettlementAccount = z.infer<typeof settlementAccountSchema>;

export interface RawSettlement {
  rfq: PublicKey;
  quote: PublicKey;
  maker: PublicKey;
  taker: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  baseAmount: BN;
  quoteAmount: BN;
  bondAmount: BN;
  takerFeeBps: number;
  makerPaymentAccount: PublicKey;
  takerPaymentAccount: PublicKey;
  bondsEscrow: PublicKey;
  makerBaseAccount: PublicKey;
  takerBaseAccount: PublicKey | null;
  vaultBaseAta: PublicKey;
  makerQuoteAccount: PublicKey;
  takerQuoteAccount: PublicKey | null;
  createdAt: BN;
  completedAt: BN | null;
  makerFundedAt: BN | null;
  takerFundedAt: BN | null;
  bump: number;
}

export function normaliseSettlement(raw: RawSettlement): SettlementAccount {
  return settlementAccountSchema.parse({
    rfq: raw.rfq,
    quote: raw.quote,
    maker: raw.maker,
    taker: raw.taker,
    baseMint: raw.baseMint,
    quoteMint: raw.quoteMint,
    baseAmount: toBigInt(raw.baseAmount),
    quoteAmount: toBigInt(raw.quoteAmount),
    bondAmount: toBigInt(raw.bondAmount),
    takerFeeBps: raw.takerFeeBps,
    makerPaymentAccount: raw.makerPaymentAccount,
    takerPaymentAccount: raw.takerPaymentAccount,
    bondsEscrow: raw.bondsEscrow,
    makerBaseAccount: raw.makerBaseAccount,
    takerBaseAccount: raw.takerBaseAccount,
    vaultBaseAta: raw.vaultBaseAta,
    makerQuoteAccount: raw.makerQuoteAccount,
    takerQuoteAccount: raw.takerQuoteAccount,
    createdAt: toUnixSeconds(raw.createdAt),
    completedAt: mapNullable(raw.completedAt, toUnixSeconds),
    makerFundedAt: mapNullable(raw.makerFundedAt, toUnixSeconds),
    takerFundedAt: mapNullable(raw.takerFundedAt, toUnixSeconds),
    bump: raw.bump,
  });
}

const settlementCodec: AccountCodec<RawSettlement, SettlementAccount> = {
  accountKey: "settlement",
  normalise: normaliseSettlement,
};

export function useSettlementAccount(
  address: PublicKey | null,
): UseQueryResult<SettlementAccount | null> {
  return useDecodedAccount(settlementCodec, address);
}
