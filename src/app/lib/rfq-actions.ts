// The single source of truth for which CTAs are legal on an RFQ for the
// connected wallet. Role is derived internally (is the wallet the maker? does it
// own a quote? is it the facilitator?) and fed into the state-machine.ts guards
// — it never becomes user-facing copy (labels are "Open", "Cancel", "Reclaim",
// "Claim"). This module is PURE and structural so it unit-tests without a
// wallet/chain, and both decoded accounts and view-models satisfy its inputs.
//
// select_quote is intentionally NOT emitted here: selecting a winner requires
// choosing among the revealed quotes, so it lives as a per-row CTA on the
// comparison table (guarded by canSelectQuote). This resolver covers the
// state-level maker actions + the facilitator claim.

import type { RFQState } from "@/types/rfq";
import {
  canCloseExpired,
  canCloseIncomplete,
  canCommitQuote,
  canCompleteSettlement,
  canMakerCancel,
  canOpenRfq,
  canRefundQuoteBonds,
  canRevealQuote,
  canSetQuoteFacilitator,
  canSetRfqFacilitator,
  canUpdateRfq,
  canWithdrawReward,
  revealDeadline,
  selectionDeadline,
  type QuoteView,
  type RfqView,
} from "@/chain/state-machine";

export type RfqActionId =
  | "open"
  | "edit"
  | "cancel"
  | "setFacilitator"
  | "closeExpired"
  | "closeIncomplete"
  | "claimReward"
  // taker (Phase 4)
  | "commit"
  | "reveal"
  | "settle"
  | "refundBond"
  | "setQuoteFacilitator";

export type RfqActionTone = "primary" | "default" | "danger" | "reward";

export interface RfqActionDescriptor {
  id: RfqActionId;
  label: string;
  tone: RfqActionTone;
  /** Short, role-neutral helper shown under the button / as a tooltip. */
  description: string;
}

/** Structural RFQ shape the resolver needs. Satisfied by the decoded RfqAccount
 * (pass pubkeys stringified) and by test fixtures. */
export interface RfqActionRfq extends RfqView {
  maker: string;
  facilitator: string | null;
  /** Config.facilitator_fee_bps — governs whether a claim has a non-zero share. */
  minQuoteAmount: bigint;
  takerFeeBps: number;
  /** Settlement.completed_at, or null if not settled/complete. */
  settlementCompletedAt: number | null;
  /** The winning quote's facilitator (quote.facilitator), when settled. */
  selectedQuoteFacilitator: string | null;
}

export interface RfqActionsInput {
  rfq: RfqActionRfq;
  /** The connected wallet's quote on this RFQ, if it owns one (structural). */
  myQuote?: QuoteView | null;
  /** Connected wallet base58, or null when disconnected. */
  connected: string | null;
  now: number;
  /** Config.facilitator_fee_bps. */
  facilitatorFeeBps: number;
}

export interface RfqRelation {
  isMaker: boolean;
  isFacilitator: boolean;
}

export function deriveRelation(input: RfqActionsInput): RfqRelation {
  const { rfq, connected } = input;
  return {
    isMaker: connected !== null && connected === rfq.maker,
    isFacilitator: connected !== null && rfq.facilitator === connected,
  };
}

/**
 * Ordered list of legal CTAs for the connected wallet. Empty when nothing is
 * actionable (the action bar then renders only informational content). Ordering
 * is deliberate: the primary next-step first, destructive actions last.
 */
export function deriveRfqActions(input: RfqActionsInput): RfqActionDescriptor[] {
  const { rfq, connected, now, facilitatorFeeBps } = input;
  if (connected === null) return [];
  const { isMaker, isFacilitator } = deriveRelation(input);
  const actions: RfqActionDescriptor[] = [];

  if (isMaker) {
    if (canOpenRfq(rfq)) {
      actions.push({
        id: "open",
        label: "Open",
        tone: "primary",
        description: "Publish this RFQ and post the bond to start the clock.",
      });
    }
    if (canUpdateRfq(rfq)) {
      actions.push({
        id: "edit",
        label: "Edit parameters",
        tone: "default",
        description: "Adjust amounts, fee, or timing while still a draft.",
      });
    }
    if (canSetRfqFacilitator(rfq)) {
      actions.push({
        id: "setFacilitator",
        label: rfq.facilitator ? "Change facilitator" : "Add facilitator",
        tone: "default",
        description: "Assign or clear the facilitator that earns the fee share.",
      });
    }
    if (canCloseExpired(rfq, now)) {
      actions.push({
        id: "closeExpired",
        label: "Reclaim bond",
        tone: "primary",
        description: "No valid reveals before the deadline — reclaim your bond.",
      });
    }
    if (canCloseIncomplete(rfq, now)) {
      actions.push({
        id: "closeIncomplete",
        label: "Reclaim bond",
        tone: "primary",
        description: "The counterparty never funded in time — reclaim escrow and bond.",
      });
    }
    if (canMakerCancel(rfq)) {
      actions.push({
        id: "cancel",
        label: "Cancel",
        tone: "danger",
        description: "Discard this draft and refund the account rent.",
      });
    }
  }

  // Taker actions, derived from the connected wallet's quote on this RFQ.
  const myQuote = input.myQuote ?? null;
  if (myQuote) {
    if (canRevealQuote(rfq, myQuote, now)) {
      actions.push({
        id: "reveal",
        label: "Reveal quote",
        tone: "primary",
        description: "Disclose your committed amount before the reveal deadline.",
      });
    }
    if (canCompleteSettlement(rfq, myQuote, now)) {
      actions.push({
        id: "settle",
        label: "Settle now",
        tone: "primary",
        description: "Fund and finalize the trade before the funding deadline.",
      });
    }
    if (canRefundQuoteBonds(rfq, myQuote, now)) {
      actions.push({
        id: "refundBond",
        label: "Reclaim bond",
        tone: "default",
        description: "Your quote wasn't selected — reclaim your posted bond.",
      });
    }
    if (canSetQuoteFacilitator(rfq)) {
      actions.push({
        id: "setQuoteFacilitator",
        label: "Facilitator",
        tone: "default",
        description: "Assign or clear the facilitator credited on your quote.",
      });
    }
  } else if (!isMaker && canCommitQuote(rfq, now)) {
    actions.push({
      id: "commit",
      label: "Commit quote",
      tone: "primary",
      description: "Post a sealed quote and bond to compete for this RFQ.",
    });
  }

  if (
    isFacilitator &&
    canWithdrawReward({
      rfqState: rfq.state,
      settlementCompletedAt: rfq.settlementCompletedAt,
      rfqFacilitator: rfq.facilitator,
      quoteFacilitator: rfq.selectedQuoteFacilitator,
      signer: connected,
      quoteAmount: rfq.minQuoteAmount,
      takerFeeBps: rfq.takerFeeBps,
      facilitatorFeeBps,
    })
  ) {
    actions.push({
      id: "claimReward",
      label: "Claim reward",
      tone: "reward",
      description: "Withdraw your facilitator fee share for this settled RFQ.",
    });
  }

  return actions;
}

/** True when at least one revealed, unselected quote can still be selected — i.e.
 * the maker should see the selection table's per-row CTAs as live. Mirrors the
 * window portion of canSelectQuote without needing a specific quote. */
export function isSelectionWindowOpen(rfq: RfqActionRfq, now: number): boolean {
  if (rfq.state !== "Revealed" || rfq.selectedAt !== null) return false;
  if (rfq.revealedCount === 0) return false;
  const reveal = revealDeadline(rfq);
  const selection = selectionDeadline(rfq);
  return reveal !== null && selection !== null && now > reveal && now <= selection;
}

export const TERMINAL_RFQ_STATES: ReadonlySet<RFQState> = new Set<RFQState>([
  "Settled",
  "Ignored",
  "Expired",
  "Incomplete",
]);
