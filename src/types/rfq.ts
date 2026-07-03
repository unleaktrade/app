export type RFQState =
  | "Draft"
  | "Open"
  | "Committed"
  | "Revealed"
  | "Selected"
  | "Settled"
  | "Ignored"
  | "Expired"
  | "Incomplete";

export type UserRole = "maker" | "taker" | "facilitator";

/**
 * UI-level facilitator edit, mirroring the on-chain `FacilitatorUpdate` enum
 * (`Clear` | `Set(Pubkey)`). `pubkey` is base58; the instruction builder parses
 * it to a `PublicKey` (throwing on malformed input) via `toFacilitatorUpdateArg`.
 */
export type FacilitatorUpdate = { kind: "clear" } | { kind: "set"; pubkey: string };

export interface RFQ {
  publicKey: string;
  maker: string;
  baseMint: string;
  quoteMint: string;
  pair: string;
  baseAmount: number;
  minQuoteAmount: number;
  bondAmount: number;
  feeAmount: number;
  state: RFQState;
  commitTtlSecs: number;
  revealTtlSecs: number;
  selectionTtlSecs: number;
  fundTtlSecs: number;
  createdAt: number;
  openedAt: number | null;
  selectedAt: number | null;
  completedAt: number | null;
  committedCount: number;
  revealedCount: number;
  selectedQuote: string | null;
  facilitator: string | null;
  expiresIn: string | null;
}

export interface Quote {
  publicKey: string;
  rfq: string;
  taker: string;
  commitHash: string;
  liquidityProof: string;
  committedAt: number;
  revealedAt: number | null;
  bondsRefundedAt: number | null;
  quoteAmount: number | null;
  selected: boolean;
  facilitator: string;
  maxFundingDeadline: number;
}

export interface Settlement {
  publicKey: string;
  rfq: string;
  quote: string;
  maker: string;
  taker: string;
  baseMint: string;
  quoteMint: string;
  baseAmount: number;
  quoteAmount: number;
  bondAmount: number;
  feeAmount: number;
  createdAt: number;
  completedAt: number | null;
  makerFundedAt: number | null;
  takerFundedAt: number | null;
}

export interface FacilitatorReward {
  publicKey: string;
  rfq: string;
  facilitator: string;
  amount: number;
  claimedAt: number | null;
}
