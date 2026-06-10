// 1:1 port of the state-machine guards and deadline math enforced by
// ../settlement-engine/programs/settlement-engine/src — the Rust is the
// authoritative spec; every function cites the instruction file it mirrors.
//
// Inputs are structural (Pick-style shapes) so both the decoded on-chain
// accounts (src/chain/accounts/*) and the mock UI objects (src/data/mock.ts)
// satisfy them. `now` is unix seconds, passed explicitly so the UI can tick.

import type { RFQState, UserRole } from "@/types/rfq";
import { computeFacilitatorShare, computeTotalFee } from "./math";

// ---------------------------------------------------------------------------
// Deadlines — state/rfq.rs (commit_deadline … funding_deadline)
// ---------------------------------------------------------------------------

export interface RfqTimeline {
  createdAt: number;
  openedAt: number | null;
  selectedAt: number | null;
  commitTtlSecs: number;
  revealTtlSecs: number;
  selectionTtlSecs: number;
  fundTtlSecs: number;
}

/** commit_deadline = opened_at + commit_ttl; null until the RFQ is opened. */
export function commitDeadline(rfq: RfqTimeline): number | null {
  return rfq.openedAt === null ? null : rfq.openedAt + rfq.commitTtlSecs;
}

/** reveal_deadline = opened_at + commit_ttl + reveal_ttl. */
export function revealDeadline(rfq: RfqTimeline): number | null {
  return rfq.openedAt === null ? null : rfq.openedAt + rfq.commitTtlSecs + rfq.revealTtlSecs;
}

/** selection_deadline = opened_at + commit_ttl + reveal_ttl + selection_ttl. */
export function selectionDeadline(rfq: RfqTimeline): number | null {
  return rfq.openedAt === null
    ? null
    : rfq.openedAt + rfq.commitTtlSecs + rfq.revealTtlSecs + rfq.selectionTtlSecs;
}

/**
 * Funding deadline policy (selection-driven), mirroring the Rust match arms:
 * - opened and selected: selected_at + fund_ttl
 * - opened, not selected: opened_at + (commit + reveal + selection + fund)
 * - not opened: preview horizon from created_at
 */
export function fundingDeadline(rfq: RfqTimeline): number {
  const totalTtl = rfq.commitTtlSecs + rfq.revealTtlSecs + rfq.selectionTtlSecs + rfq.fundTtlSecs;
  if (rfq.openedAt !== null && rfq.selectedAt !== null) return rfq.selectedAt + rfq.fundTtlSecs;
  if (rfq.openedAt !== null) return rfq.openedAt + totalTtl;
  return rfq.createdAt + totalTtl;
}

// ---------------------------------------------------------------------------
// Guards — instructions/{rfq,quote,settlement}/*.rs
// ---------------------------------------------------------------------------

export interface RfqView extends RfqTimeline {
  state: RFQState;
  committedCount: number;
  revealedCount: number;
}

export interface QuoteView {
  revealedAt: number | null;
  bondsRefundedAt: number | null;
  selected: boolean;
}

/** instructions/rfq/update_rfq.rs — Draft only, signer is the RFQ owner. */
export function canUpdateRfq(rfq: Pick<RfqView, "state">): boolean {
  return rfq.state === "Draft";
}

/** instructions/rfq/cancel_rfq.rs — Draft only; closes the account. */
export function canMakerCancel(rfq: Pick<RfqView, "state">): boolean {
  return rfq.state === "Draft";
}

/** instructions/rfq/open_rfq.rs — Draft only; posts the bond and starts the clock. */
export function canOpenRfq(rfq: Pick<RfqView, "state">): boolean {
  return rfq.state === "Draft";
}

/** instructions/rfq/set_rfq_facilitator.rs — any pre-selection state. */
export function canSetRfqFacilitator(rfq: Pick<RfqView, "state">): boolean {
  return (
    rfq.state === "Draft" ||
    rfq.state === "Open" ||
    rfq.state === "Committed" ||
    rfq.state === "Revealed"
  );
}

/** instructions/rfq/close_expired.rs — no reveals and past the reveal deadline. */
export function canCloseExpired(rfq: RfqView, now: number): boolean {
  if (rfq.state !== "Open" && rfq.state !== "Committed") return false;
  if (rfq.revealedCount !== 0) return false;
  const deadline = revealDeadline(rfq);
  return deadline !== null && now > deadline;
}

/** instructions/rfq/close_incomplete.rs — selected but never funded in time. */
export function canCloseIncomplete(rfq: RfqView, now: number): boolean {
  return rfq.state === "Selected" && now > fundingDeadline(rfq);
}

/** instructions/quote/commit_quote.rs — within the commit window. */
export function canCommitQuote(rfq: RfqView, now: number): boolean {
  if (rfq.state !== "Open" && rfq.state !== "Committed") return false;
  const deadline = commitDeadline(rfq);
  return deadline !== null && now <= deadline;
}

/** instructions/quote/reveal_quote.rs — after commits close, before reveals close. */
export function canRevealQuote(rfq: RfqView, quote: QuoteView, now: number): boolean {
  if (rfq.state !== "Committed" && rfq.state !== "Revealed") return false;
  if (quote.revealedAt !== null) return false;
  const commit = commitDeadline(rfq);
  const reveal = revealDeadline(rfq);
  return commit !== null && reveal !== null && now > commit && now <= reveal;
}

/** instructions/quote/set_quote_facilitator.rs — any pre-settlement state. */
export function canSetQuoteFacilitator(rfq: Pick<RfqView, "state">): boolean {
  return (
    rfq.state === "Draft" ||
    rfq.state === "Open" ||
    rfq.state === "Committed" ||
    rfq.state === "Revealed" ||
    rfq.state === "Selected"
  );
}

/**
 * instructions/quote/refund_quote_bonds.rs — revealed, unselected quotes
 * reclaim their bond once the funding deadline has passed.
 */
export function canRefundQuoteBonds(rfq: RfqView, quote: QuoteView, now: number): boolean {
  if (
    rfq.state !== "Revealed" &&
    rfq.state !== "Selected" &&
    rfq.state !== "Settled" &&
    rfq.state !== "Ignored" &&
    rfq.state !== "Incomplete"
  ) {
    return false;
  }
  if (rfq.revealedCount === 0) return false;
  if (quote.selected || quote.revealedAt === null || quote.bondsRefundedAt !== null) return false;
  return now > fundingDeadline(rfq);
}

/** instructions/settlement/select_quote.rs — selection window, revealed unselected quote. */
export function canSelectQuote(rfq: RfqView, quote: QuoteView, now: number): boolean {
  if (rfq.state !== "Revealed" || rfq.selectedAt !== null) return false;
  if (quote.revealedAt === null || quote.selected) return false;
  const reveal = revealDeadline(rfq);
  const selection = selectionDeadline(rfq);
  return reveal !== null && selection !== null && now > reveal && now <= selection;
}

/** instructions/settlement/complete_settlement.rs — selected quote funds in time. */
export function canCompleteSettlement(rfq: RfqView, quote: QuoteView, now: number): boolean {
  return rfq.state === "Selected" && quote.selected && now <= fundingDeadline(rfq);
}

export interface WithdrawRewardInputs {
  rfqState: RFQState;
  /** Settlement.completed_at — withdraw requires settlement.is_complete(). */
  settlementCompletedAt: number | null;
  rfqFacilitator: string | { toString(): string } | null;
  quoteFacilitator: string | { toString(): string } | null;
  signer: string | { toString(): string };
  quoteAmount: bigint;
  takerFeeBps: number;
  facilitatorFeeBps: number;
}

/**
 * instructions/settlement/withdraw_reward.rs — settled, completed, both the
 * RFQ and the winning quote assign the signer, and the share is non-zero.
 * Facilitator keys accept PublicKey or base58 string (structural).
 */
export function canWithdrawReward(inputs: WithdrawRewardInputs): boolean {
  if (inputs.rfqState !== "Settled" || inputs.settlementCompletedAt === null) return false;
  if (inputs.rfqFacilitator === null || inputs.quoteFacilitator === null) return false;
  const signer = String(inputs.signer);
  if (String(inputs.rfqFacilitator) !== signer || String(inputs.quoteFacilitator) !== signer) {
    return false;
  }
  const share = computeFacilitatorShare(
    computeTotalFee(inputs.quoteAmount, inputs.takerFeeBps),
    inputs.facilitatorFeeBps,
  );
  return share > 0n;
}

// ---------------------------------------------------------------------------
// Transition map — which states each participant can drive an RFQ into.
// Derived from the instruction handlers; used for tooltips/CTA gating only
// (role is an internal derivation, never user-facing copy).
// ---------------------------------------------------------------------------

const MAKER_TRANSITIONS: Readonly<Partial<Record<RFQState, readonly RFQState[]>>> = {
  Draft: ["Open"], // open_rfq (cancel_rfq closes the account — no target state)
  Open: ["Expired"], // close_expired
  Committed: ["Expired"], // close_expired (only while revealed_count == 0)
  Revealed: ["Selected"], // select_quote
  Selected: ["Incomplete"], // close_incomplete
};

const TAKER_TRANSITIONS: Readonly<Partial<Record<RFQState, readonly RFQState[]>>> = {
  Open: ["Committed"], // commit_quote
  Committed: ["Revealed"], // reveal_quote
  Revealed: ["Ignored"], // refund_quote_bonds after the selection window lapses
  Selected: ["Settled"], // complete_settlement
};

export function nextAllowedStates(state: RFQState, role: UserRole): readonly RFQState[] {
  switch (role) {
    case "maker":
      return MAKER_TRANSITIONS[state] ?? [];
    case "taker":
      return TAKER_TRANSITIONS[state] ?? [];
    case "facilitator":
      return []; // withdraw_reward never changes the RFQ state
  }
}

export const TERMINAL_STATES: ReadonlySet<RFQState> = new Set([
  "Settled",
  "Ignored",
  "Expired",
  "Incomplete",
]);

export function isTerminalState(state: RFQState): boolean {
  return TERMINAL_STATES.has(state);
}
