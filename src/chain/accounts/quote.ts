import type { PublicKey } from "@solana/web3.js";
import type { BN } from "@coral-xyz/anchor";
import type { UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";
import {
  bumpSchema,
  bytesSchema,
  mapNullable,
  publicKeySchema,
  toBigInt,
  toBytes,
  toUnixSeconds,
  u64AmountSchema,
  unixSecondsSchema,
} from "./shared";
import { useDecodedAccount, type AccountCodec } from "./useDecodedAccount";

export const quoteAccountSchema = z.object({
  rfq: publicKeySchema,
  taker: publicKeySchema,
  commitHash: bytesSchema(32),
  liquidityProof: bytesSchema(64),
  committedAt: unixSecondsSchema,
  revealedAt: unixSecondsSchema.nullable(),
  maxFundingDeadline: unixSecondsSchema,
  bondsRefundedAt: unixSecondsSchema.nullable(),
  quoteAmount: u64AmountSchema.nullable(),
  takerPaymentAccount: publicKeySchema,
  selected: z.boolean(),
  facilitator: publicKeySchema.nullable(),
  bump: bumpSchema,
});

export type QuoteAccount = z.infer<typeof quoteAccountSchema>;

export interface RawQuote {
  rfq: PublicKey;
  taker: PublicKey;
  commitHash: number[] | Uint8Array;
  liquidityProof: number[] | Uint8Array;
  committedAt: BN;
  revealedAt: BN | null;
  maxFundingDeadline: BN;
  bondsRefundedAt: BN | null;
  quoteAmount: BN | null;
  takerPaymentAccount: PublicKey;
  selected: boolean;
  facilitator: PublicKey | null;
  bump: number;
}

export function normaliseQuote(raw: RawQuote): QuoteAccount {
  return quoteAccountSchema.parse({
    rfq: raw.rfq,
    taker: raw.taker,
    commitHash: toBytes(raw.commitHash),
    liquidityProof: toBytes(raw.liquidityProof),
    committedAt: toUnixSeconds(raw.committedAt),
    revealedAt: mapNullable(raw.revealedAt, toUnixSeconds),
    maxFundingDeadline: toUnixSeconds(raw.maxFundingDeadline),
    bondsRefundedAt: mapNullable(raw.bondsRefundedAt, toUnixSeconds),
    quoteAmount: mapNullable(raw.quoteAmount, toBigInt),
    takerPaymentAccount: raw.takerPaymentAccount,
    selected: raw.selected,
    facilitator: raw.facilitator,
    bump: raw.bump,
  });
}

const quoteCodec: AccountCodec<RawQuote, QuoteAccount> = {
  accountKey: "quote",
  normalise: normaliseQuote,
};

export function useQuoteAccount(address: PublicKey | null): UseQueryResult<QuoteAccount | null> {
  return useDecodedAccount(quoteCodec, address);
}
