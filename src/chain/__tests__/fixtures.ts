// Fixture encoder for decoder round-trip tests. Encoding goes through
// Anchor's BorshCoder built from the *committed* IDL, so a passing
// round-trip proves decoder ↔ committed-IDL parity without a validator.

import { Buffer } from "buffer";
import { BN, BorshCoder, type Idl } from "@coral-xyz/anchor";
// Deep import: Program camelCases the IDL with this exact helper before
// building its coder, so tests must do the same for runtime parity. Anchor
// publishes no exports map, so the dist path is reachable and typed.
import { convertIdlToCamelCase } from "@coral-xyz/anchor/dist/cjs/idl";
import { PublicKey } from "@solana/web3.js";
import idlJson from "@/chain/idl/settlement_engine.json";
import type { RawRfq } from "@/chain/accounts/rfq";
import type { RawQuote } from "@/chain/accounts/quote";
import type { RawCommitGuard } from "@/chain/accounts/commitGuard";
import type { RawSettlement } from "@/chain/accounts/settlement";
import type { RawFeesTracker } from "@/chain/accounts/feesTracker";
import type { RawSlashedBondsTracker } from "@/chain/accounts/slashedBondsTracker";
import type { RawFacilitatorRewardTracker } from "@/chain/accounts/facilitatorRewardTracker";
import type { RawConfig } from "@/chain/accounts/config";

export const idl = idlJson as Idl;
export const coder = new BorshCoder(convertIdlToCamelCase(idl));

export function encodeAccount(name: string, value: unknown): Promise<Buffer> {
  return coder.accounts.encode(name, value);
}

export function decodeAccount<T>(name: string, data: Buffer): T {
  return coder.accounts.decode<T>(name, data);
}

/** Deterministic distinct pubkeys (PublicKey.unique is a process counter). */
export function pk(): PublicKey {
  return PublicKey.unique();
}

export function bytes(length: number, fill = 7): number[] {
  return new Array<number>(length).fill(fill);
}

const NOW = 1_750_000_000; // fixed reference timestamp (unix seconds)
export const T0 = NOW;

export function makeRawConfig(overrides: Partial<RawConfig> = {}): RawConfig {
  return {
    admin: pk(),
    usdcMint: pk(),
    treasuryWallet: pk(),
    liquidityGuard: pk(),
    facilitatorFeeBps: 500,
    bump: 254,
    ...overrides,
  };
}

export function makeRawRfq(overrides: Partial<RawRfq> = {}): RawRfq {
  return {
    config: pk(),
    maker: pk(),
    uuid: bytes(16),
    state: { draft: {} },
    baseMint: pk(),
    quoteMint: pk(),
    usdcMint: pk(),
    treasuryWallet: pk(),
    liquidityGuard: pk(),
    bondAmount: new BN(50_000_000),
    baseAmount: new BN(1_000_000_000),
    minQuoteAmount: new BN(900_000_000),
    takerFeeBps: 30,
    facilitatorFeeBps: 500,
    commitTtlSecs: 3600,
    revealTtlSecs: 1800,
    selectionTtlSecs: 1800,
    fundTtlSecs: 7200,
    createdAt: new BN(T0),
    openedAt: null,
    selectedAt: null,
    completedAt: null,
    committedCount: 0,
    revealedCount: 0,
    selectedQuote: null,
    settlement: null,
    bondsEscrow: pk(),
    makerPaymentAccount: pk(),
    facilitator: null,
    bump: 253,
    ...overrides,
  };
}

export function makeRawQuote(overrides: Partial<RawQuote> = {}): RawQuote {
  return {
    rfq: pk(),
    taker: pk(),
    commitHash: bytes(32),
    liquidityProof: bytes(64),
    committedAt: new BN(T0),
    revealedAt: null,
    maxFundingDeadline: new BN(T0 + 14_400),
    bondsRefundedAt: null,
    quoteAmount: null,
    takerPaymentAccount: pk(),
    selected: false,
    facilitator: null,
    bump: 252,
    ...overrides,
  };
}

export function makeRawCommitGuard(overrides: Partial<RawCommitGuard> = {}): RawCommitGuard {
  return {
    quote: pk(),
    committedAt: new BN(T0),
    bump: 251,
    ...overrides,
  };
}

export function makeRawSettlement(overrides: Partial<RawSettlement> = {}): RawSettlement {
  return {
    rfq: pk(),
    quote: pk(),
    maker: pk(),
    taker: pk(),
    baseMint: pk(),
    quoteMint: pk(),
    baseAmount: new BN(1_000_000_000),
    quoteAmount: new BN(950_000_000),
    bondAmount: new BN(50_000_000),
    takerFeeBps: 30,
    makerPaymentAccount: pk(),
    takerPaymentAccount: pk(),
    bondsEscrow: pk(),
    makerBaseAccount: pk(),
    takerBaseAccount: null,
    vaultBaseAta: pk(),
    makerQuoteAccount: pk(),
    takerQuoteAccount: null,
    createdAt: new BN(T0),
    completedAt: null,
    makerFundedAt: null,
    takerFundedAt: null,
    bump: 250,
    ...overrides,
  };
}

export function makeRawFeesTracker(overrides: Partial<RawFeesTracker> = {}): RawFeesTracker {
  return {
    rfq: pk(),
    taker: pk(),
    quoteMint: pk(),
    treasuryWallet: pk(),
    amount: new BN(285_000),
    payedAt: new BN(T0),
    bump: 249,
    ...overrides,
  };
}

export function makeRawSlashedBondsTracker(
  overrides: Partial<RawSlashedBondsTracker> = {},
): RawSlashedBondsTracker {
  return {
    rfq: pk(),
    usdcMint: pk(),
    treasuryWallet: pk(),
    amount: null,
    seizedAt: null,
    bump: 248,
    ...overrides,
  };
}

export function makeRawFacilitatorRewardTracker(
  overrides: Partial<RawFacilitatorRewardTracker> = {},
): RawFacilitatorRewardTracker {
  return {
    rfq: pk(),
    facilitator: pk(),
    quoteMint: pk(),
    amount: new BN(14_250),
    claimedAt: new BN(T0),
    bump: 247,
    ...overrides,
  };
}
