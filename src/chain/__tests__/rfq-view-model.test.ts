import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { toRfqViewModel, toQuoteViewModel } from "@/app/lib/rfq-view-model";
import type { ProgramAccount } from "@/chain/accounts/lists";
import type { RfqAccount } from "@/chain/accounts/rfq";
import type { QuoteAccount } from "@/chain/accounts/quote";
import type { ResolvedToken } from "@/app/lib/tokens";

const BASE = new PublicKey("So11111111111111111111111111111111111111112");
const QUOTE = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const USDC = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

// sBASE 9dp, USDC quote 6dp, USDC bond 6dp.
const resolve = (mint: string): ResolvedToken => {
  if (mint === BASE.toBase58()) return { symbol: "sBASE", decimals: 9 };
  if (mint === QUOTE.toBase58()) return { symbol: "USDC", decimals: 6 };
  if (mint === USDC.toBase58()) return { symbol: "USDC", decimals: 6 };
  return { symbol: "???", decimals: 0 };
};

const T0 = 1_750_000_000;

function rfqRow(overrides: Partial<RfqAccount> = {}): ProgramAccount<RfqAccount> {
  const account: RfqAccount = {
    config: PublicKey.unique(),
    maker: PublicKey.unique(),
    uuid: new Uint8Array(16),
    state: "Open",
    baseMint: BASE,
    quoteMint: QUOTE,
    usdcMint: USDC,
    treasuryWallet: PublicKey.unique(),
    liquidityGuard: PublicKey.unique(),
    bondAmount: 50_000_000n, // 50 USDC @6
    baseAmount: 2_000_000_000n, // 2 sBASE @9
    minQuoteAmount: 900_000_000n, // 900 USDC @6
    takerFeeBps: 30,
    facilitatorFeeBps: 500,
    commitTtlSecs: 3600,
    revealTtlSecs: 1800,
    selectionTtlSecs: 1800,
    fundTtlSecs: 3600,
    createdAt: T0 - 100,
    openedAt: T0,
    selectedAt: null,
    completedAt: null,
    committedCount: 0,
    revealedCount: 0,
    selectedQuote: null,
    settlement: null,
    bondsEscrow: PublicKey.unique(),
    makerPaymentAccount: PublicKey.unique(),
    facilitator: null,
    bump: 254,
    ...overrides,
  };
  return { publicKey: PublicKey.unique(), account };
}

describe("toRfqViewModel", () => {
  it("scales amounts by mint decimals and derives the pair", () => {
    const rfq = toRfqViewModel(rfqRow(), T0 + 60, resolve);
    expect(rfq.pair).toBe("sBASE/USDC");
    expect(rfq.baseAmount).toBe(2); // 2_000_000_000 / 1e9
    expect(rfq.minQuoteAmount).toBe(900); // 900_000_000 / 1e6
    expect(rfq.bondAmount).toBe(50); // 50_000_000 / 1e6
    // fee on min quote: floor(900_000_000 * 30 / 10_000) = 2_700_000 → /1e6 = 2.7
    expect(rfq.feeAmount).toBeCloseTo(2.7, 6);
  });

  it("derives a live expiresIn for an Open RFQ against the commit deadline", () => {
    // commitDeadline = openedAt + commitTtl = T0 + 3600; 600s before it → "10m 0s"
    const rfq = toRfqViewModel(rfqRow(), T0 + 3000, resolve);
    expect(rfq.expiresIn).toBe("10m 0s");
  });

  it("has no expiresIn for Draft or terminal states", () => {
    expect(toRfqViewModel(rfqRow({ state: "Draft", openedAt: null }), T0, resolve).expiresIn).toBe(
      null,
    );
    expect(toRfqViewModel(rfqRow({ state: "Settled" }), T0, resolve).expiresIn).toBe(null);
  });
});

describe("toQuoteViewModel", () => {
  function quoteRow(quoteAmount: bigint | null): ProgramAccount<QuoteAccount> {
    const account: QuoteAccount = {
      rfq: PublicKey.unique(),
      taker: PublicKey.unique(),
      commitHash: new Uint8Array(32).fill(1),
      liquidityProof: new Uint8Array(64).fill(2),
      committedAt: T0,
      revealedAt: quoteAmount === null ? null : T0 + 10,
      maxFundingDeadline: T0 + 10_000,
      bondsRefundedAt: null,
      quoteAmount,
      takerPaymentAccount: PublicKey.unique(),
      selected: false,
      facilitator: null,
      bump: 253,
    };
    return { publicKey: PublicKey.unique(), account };
  }

  it("scales a revealed quote amount and hex-encodes the commit hash", () => {
    const quote = toQuoteViewModel(quoteRow(950_000_000n), 6);
    expect(quote.quoteAmount).toBe(950);
    expect(quote.commitHash).toBe("01".repeat(32));
  });

  it("keeps a sealed (un-revealed) quote amount null", () => {
    expect(toQuoteViewModel(quoteRow(null), 6).quoteAmount).toBe(null);
  });
});
