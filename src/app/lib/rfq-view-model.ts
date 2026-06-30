// Bridge decoded on-chain accounts → the UI view-model types in src/types/rfq.
// On-chain amounts are base-unit bigints; the UI RFQ/Quote types carry display
// numbers. Scaling here is display-only — all protocol math stays bigint in
// src/chain/. Symbols/decimals come from the synchronous resolver in tokens.ts
// (seed manifest → static catalog → fallback).

import { Buffer } from "buffer";
import type { RFQ, Quote, FacilitatorReward } from "@/types/rfq";
import type { RfqAccount } from "@/chain/accounts/rfq";
import type { QuoteAccount } from "@/chain/accounts/quote";
import type { FacilitatorRewardTrackerAccount } from "@/chain/accounts/facilitatorRewardTracker";
import type { ProgramAccount } from "@/chain/accounts/lists";
import { computeTotalFee } from "@/chain/math";
import {
  commitDeadline,
  revealDeadline,
  selectionDeadline,
  fundingDeadline,
} from "@/chain/state-machine";
import { formatDuration } from "./format";
import { resolveTokenMeta, type ResolvedToken } from "./tokens";

export type ResolveToken = (mint: string) => ResolvedToken;

/** Scale a base-unit bigint to a display number using mint decimals. Display
 * only — magnitudes stay well under 2^53 for the seeded test tokens. */
function scaleToNumber(baseUnits: bigint, decimals: number): number {
  if (decimals === 0) return Number(baseUnits);
  return Number(baseUnits) / 10 ** decimals;
}

/** The deadline that matters for the RFQ's current state, or null. */
function activeDeadline(account: RfqAccount): number | null {
  switch (account.state) {
    case "Open":
      return commitDeadline(account);
    case "Committed":
      return revealDeadline(account);
    case "Revealed":
      return selectionDeadline(account);
    case "Selected":
      return fundingDeadline(account);
    default:
      return null; // Draft (not opened) + terminal states have no live countdown
  }
}

/** "2h 15m" until the active deadline, or null if none / already elapsed. */
function deriveExpiresIn(account: RfqAccount, now: number): string | null {
  const deadline = activeDeadline(account);
  if (deadline === null || now >= deadline) return null;
  return formatDuration(deadline - now);
}

/**
 * Decoded RFQ → UI RFQ. `now` (unix secs) drives the expiresIn label; pass
 * Math.floor(Date.now()/1000) from the screen. The default resolver is the
 * synchronous tokens.ts one; tests can inject a stub.
 */
export function toRfqViewModel(
  row: ProgramAccount<RfqAccount>,
  now: number,
  resolve: ResolveToken = resolveTokenMeta,
): RFQ {
  const { publicKey, account } = row;
  const base = resolve(account.baseMint.toBase58());
  const quote = resolve(account.quoteMint.toBase58());
  const usdc = resolve(account.usdcMint.toBase58());

  // No single fee is stored on an RFQ (it's bps); show the fee on the minimum
  // quote as a representative figure, in quote-mint units.
  const feeOnMinQuote = computeTotalFee(account.minQuoteAmount, account.takerFeeBps);

  return {
    publicKey: publicKey.toBase58(),
    maker: account.maker.toBase58(),
    baseMint: account.baseMint.toBase58(),
    quoteMint: account.quoteMint.toBase58(),
    pair: `${base.symbol}/${quote.symbol}`,
    baseAmount: scaleToNumber(account.baseAmount, base.decimals),
    minQuoteAmount: scaleToNumber(account.minQuoteAmount, quote.decimals),
    bondAmount: scaleToNumber(account.bondAmount, usdc.decimals),
    feeAmount: scaleToNumber(feeOnMinQuote, quote.decimals),
    state: account.state,
    commitTtlSecs: account.commitTtlSecs,
    revealTtlSecs: account.revealTtlSecs,
    selectionTtlSecs: account.selectionTtlSecs,
    fundTtlSecs: account.fundTtlSecs,
    createdAt: account.createdAt,
    openedAt: account.openedAt,
    selectedAt: account.selectedAt,
    completedAt: account.completedAt,
    committedCount: account.committedCount,
    revealedCount: account.revealedCount,
    selectedQuote: account.selectedQuote?.toBase58() ?? null,
    facilitator: account.facilitator?.toBase58() ?? null,
    expiresIn: deriveExpiresIn(account, now),
  };
}

/**
 * Decoded Quote → UI Quote. The quote account doesn't carry its mint, so the
 * caller passes the parent RFQ's quote-mint decimals for amount scaling.
 */
export function toQuoteViewModel(row: ProgramAccount<QuoteAccount>, quoteDecimals: number): Quote {
  const { publicKey, account } = row;
  return {
    publicKey: publicKey.toBase58(),
    rfq: account.rfq.toBase58(),
    taker: account.taker.toBase58(),
    commitHash: Buffer.from(account.commitHash).toString("hex"),
    liquidityProof: Buffer.from(account.liquidityProof).toString("hex"),
    committedAt: account.committedAt,
    revealedAt: account.revealedAt,
    bondsRefundedAt: account.bondsRefundedAt,
    quoteAmount:
      account.quoteAmount === null ? null : scaleToNumber(account.quoteAmount, quoteDecimals),
    selected: account.selected,
    facilitator: account.facilitator?.toBase58() ?? "",
    maxFundingDeadline: account.maxFundingDeadline,
  };
}

/**
 * Decoded FacilitatorRewardTracker → UI FacilitatorReward. The tracker is only
 * written by withdraw_reward, so every tracker that exists is already CLAIMED
 * (claimed_at is always set). The amount is in the reward's own quote mint, so
 * scale by that mint's decimals — not the RFQ pair.
 */
export function toFacilitatorRewardViewModel(
  row: ProgramAccount<FacilitatorRewardTrackerAccount>,
  resolve: ResolveToken = resolveTokenMeta,
): FacilitatorReward {
  const { publicKey, account } = row;
  const { decimals } = resolve(account.quoteMint.toBase58());
  return {
    publicKey: publicKey.toBase58(),
    rfq: account.rfq.toBase58(),
    facilitator: account.facilitator.toBase58(),
    amount: scaleToNumber(account.amount, decimals),
    claimedAt: account.claimedAt > 0 ? account.claimedAt : null,
  };
}
