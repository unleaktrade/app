import { describe, expect, it } from "vitest";
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
  canSelectQuote,
  canSetQuoteFacilitator,
  canSetRfqFacilitator,
  canUpdateRfq,
  canWithdrawReward,
  commitDeadline,
  fundingDeadline,
  isTerminalState,
  nextAllowedStates,
  revealDeadline,
  selectionDeadline,
  type QuoteView,
  type RfqView,
} from "@/chain/state-machine";

const ALL_STATES: RFQState[] = [
  "Draft",
  "Open",
  "Committed",
  "Revealed",
  "Selected",
  "Settled",
  "Ignored",
  "Expired",
  "Incomplete",
];

const T0 = 1_750_000_000;

function rfq(overrides: Partial<RfqView> = {}): RfqView {
  return {
    state: "Open",
    createdAt: T0 - 100,
    openedAt: T0,
    selectedAt: null,
    commitTtlSecs: 3600,
    revealTtlSecs: 1800,
    selectionTtlSecs: 1200,
    fundTtlSecs: 7200,
    committedCount: 0,
    revealedCount: 0,
    ...overrides,
  };
}

function quote(overrides: Partial<QuoteView> = {}): QuoteView {
  return {
    revealedAt: null,
    bondsRefundedAt: null,
    selected: false,
    ...overrides,
  };
}

// Deadlines from the fixture: commit T0+3600, reveal T0+5400, selection T0+6600.
const COMMIT = T0 + 3600;
const REVEAL = T0 + 5400;
const SELECTION = T0 + 6600;
const TOTAL = 3600 + 1800 + 1200 + 7200;

describe("deadline math (state/rfq.rs)", () => {
  it("returns null deadlines before the RFQ is opened", () => {
    const draft = rfq({ openedAt: null });
    expect(commitDeadline(draft)).toBeNull();
    expect(revealDeadline(draft)).toBeNull();
    expect(selectionDeadline(draft)).toBeNull();
  });

  it("derives the three phase deadlines from opened_at", () => {
    const opened = rfq();
    expect(commitDeadline(opened)).toBe(COMMIT);
    expect(revealDeadline(opened)).toBe(REVEAL);
    expect(selectionDeadline(opened)).toBe(SELECTION);
  });

  it("funding deadline: selected → selected_at + fund_ttl", () => {
    expect(fundingDeadline(rfq({ selectedAt: T0 + 6000 }))).toBe(T0 + 6000 + 7200);
  });

  it("funding deadline: opened, not selected → opened_at + sum of all TTLs", () => {
    expect(fundingDeadline(rfq())).toBe(T0 + TOTAL);
  });

  it("funding deadline: not opened → preview horizon from created_at", () => {
    expect(fundingDeadline(rfq({ openedAt: null, selectedAt: null }))).toBe(T0 - 100 + TOTAL);
  });
});

describe("draft-only guards (update_rfq / cancel_rfq / open_rfq)", () => {
  it.each(ALL_STATES)("state %s", (state) => {
    const expected = state === "Draft";
    expect(canUpdateRfq({ state })).toBe(expected);
    expect(canMakerCancel({ state })).toBe(expected);
    expect(canOpenRfq({ state })).toBe(expected);
  });
});

describe("canSetRfqFacilitator (set_rfq_facilitator.rs)", () => {
  it.each(ALL_STATES)("state %s", (state) => {
    const allowed: RFQState[] = ["Draft", "Open", "Committed", "Revealed"];
    expect(canSetRfqFacilitator({ state })).toBe(allowed.includes(state));
  });
});

describe("canSetQuoteFacilitator (set_quote_facilitator.rs)", () => {
  it.each(ALL_STATES)("state %s", (state) => {
    const allowed: RFQState[] = ["Draft", "Open", "Committed", "Revealed", "Selected"];
    expect(canSetQuoteFacilitator({ state })).toBe(allowed.includes(state));
  });
});

describe("canCommitQuote (commit_quote.rs)", () => {
  it("allows Open and Committed inside the commit window", () => {
    expect(canCommitQuote(rfq({ state: "Open" }), COMMIT - 1)).toBe(true);
    expect(canCommitQuote(rfq({ state: "Committed" }), COMMIT - 1)).toBe(true);
  });

  it("boundary: now == commit_deadline is allowed (Rust: now <= deadline)", () => {
    expect(canCommitQuote(rfq(), COMMIT)).toBe(true);
    expect(canCommitQuote(rfq(), COMMIT + 1)).toBe(false);
  });

  it("rejects other states and unopened RFQs", () => {
    expect(canCommitQuote(rfq({ state: "Revealed" }), COMMIT - 1)).toBe(false);
    expect(canCommitQuote(rfq({ state: "Open", openedAt: null }), COMMIT - 1)).toBe(false);
  });
});

describe("canRevealQuote (reveal_quote.rs)", () => {
  it("opens strictly after the commit deadline (Rust: now > commit_deadline)", () => {
    expect(canRevealQuote(rfq({ state: "Committed" }), quote(), COMMIT)).toBe(false);
    expect(canRevealQuote(rfq({ state: "Committed" }), quote(), COMMIT + 1)).toBe(true);
  });

  it("closes at the reveal deadline inclusive (Rust: now <= reveal_deadline)", () => {
    expect(canRevealQuote(rfq({ state: "Committed" }), quote(), REVEAL)).toBe(true);
    expect(canRevealQuote(rfq({ state: "Committed" }), quote(), REVEAL + 1)).toBe(false);
  });

  it("requires Committed or Revealed and an unrevealed quote", () => {
    expect(canRevealQuote(rfq({ state: "Revealed" }), quote(), COMMIT + 1)).toBe(true);
    expect(canRevealQuote(rfq({ state: "Open" }), quote(), COMMIT + 1)).toBe(false);
    expect(canRevealQuote(rfq({ state: "Committed" }), quote({ revealedAt: T0 }), COMMIT + 1)).toBe(
      false,
    );
  });
});

describe("canCloseExpired (close_expired.rs)", () => {
  it("requires Open|Committed, zero reveals, strictly past the reveal deadline", () => {
    expect(canCloseExpired(rfq({ state: "Open" }), REVEAL + 1)).toBe(true);
    expect(canCloseExpired(rfq({ state: "Committed", committedCount: 2 }), REVEAL + 1)).toBe(true);
    expect(canCloseExpired(rfq({ state: "Open" }), REVEAL)).toBe(false); // boundary: now > deadline
    expect(canCloseExpired(rfq({ state: "Open", revealedCount: 1 }), REVEAL + 1)).toBe(false);
    expect(canCloseExpired(rfq({ state: "Revealed" }), REVEAL + 1)).toBe(false);
    expect(canCloseExpired(rfq({ state: "Open", openedAt: null }), REVEAL + 1)).toBe(false);
  });
});

describe("canCloseIncomplete (close_incomplete.rs)", () => {
  it("requires Selected strictly past the funding deadline", () => {
    const selected = rfq({ state: "Selected", selectedAt: T0 + 6000 });
    const deadline = T0 + 6000 + 7200;
    expect(canCloseIncomplete(selected, deadline)).toBe(false); // boundary
    expect(canCloseIncomplete(selected, deadline + 1)).toBe(true);
    expect(canCloseIncomplete(rfq({ state: "Open" }), deadline + 1)).toBe(false);
  });
});

describe("canSelectQuote (select_quote.rs)", () => {
  const revealed = rfq({ state: "Revealed", revealedCount: 1 });
  const revealedQuote = quote({ revealedAt: REVEAL - 10 });

  it("selection window is (reveal_deadline, selection_deadline]", () => {
    expect(canSelectQuote(revealed, revealedQuote, REVEAL)).toBe(false); // now > reveal
    expect(canSelectQuote(revealed, revealedQuote, REVEAL + 1)).toBe(true);
    expect(canSelectQuote(revealed, revealedQuote, SELECTION)).toBe(true); // now <= selection
    expect(canSelectQuote(revealed, revealedQuote, SELECTION + 1)).toBe(false);
  });

  it("rejects unrevealed or already-selected quotes and re-selection", () => {
    expect(canSelectQuote(revealed, quote(), REVEAL + 1)).toBe(false);
    expect(canSelectQuote(revealed, quote({ revealedAt: T0, selected: true }), REVEAL + 1)).toBe(
      false,
    );
    expect(
      canSelectQuote(rfq({ state: "Revealed", selectedAt: T0 }), revealedQuote, REVEAL + 1),
    ).toBe(false);
  });
});

describe("canCompleteSettlement (complete_settlement.rs)", () => {
  const selected = rfq({ state: "Selected", selectedAt: T0 + 6000 });
  const winner = quote({ revealedAt: T0 + 5000, selected: true });
  const deadline = T0 + 6000 + 7200;

  it("selected quote can fund up to the funding deadline inclusive", () => {
    expect(canCompleteSettlement(selected, winner, deadline)).toBe(true);
    expect(canCompleteSettlement(selected, winner, deadline + 1)).toBe(false);
  });

  it("requires Selected state and the selected quote", () => {
    expect(canCompleteSettlement(rfq({ state: "Settled" }), winner, deadline)).toBe(false);
    expect(canCompleteSettlement(selected, quote({ revealedAt: T0 }), deadline)).toBe(false);
  });
});

describe("canRefundQuoteBonds (refund_quote_bonds.rs)", () => {
  const base = rfq({ state: "Revealed", revealedCount: 1 });
  const refundable = quote({ revealedAt: T0 + 5000 });
  const past = fundingDeadline(base) + 1;

  it("refunds a revealed unselected quote strictly past the funding deadline", () => {
    expect(canRefundQuoteBonds(base, refundable, past)).toBe(true);
    expect(canRefundQuoteBonds(base, refundable, past - 1)).toBe(false); // boundary
  });

  it.each(ALL_STATES)("state gate: %s", (state) => {
    const allowed: RFQState[] = ["Revealed", "Selected", "Settled", "Ignored", "Incomplete"];
    expect(canRefundQuoteBonds(rfq({ state, revealedCount: 1 }), refundable, past)).toBe(
      allowed.includes(state),
    );
  });

  it("rejects selected, unrevealed, already-refunded quotes and zero-reveal RFQs", () => {
    expect(canRefundQuoteBonds(base, quote({ revealedAt: T0, selected: true }), past)).toBe(false);
    expect(canRefundQuoteBonds(base, quote(), past)).toBe(false);
    expect(
      canRefundQuoteBonds(base, quote({ revealedAt: T0, bondsRefundedAt: T0 + 9000 }), past),
    ).toBe(false);
    expect(
      canRefundQuoteBonds(rfq({ state: "Revealed", revealedCount: 0 }), refundable, past),
    ).toBe(false);
  });
});

describe("canWithdrawReward (withdraw_reward.rs)", () => {
  const signer = "FaciLitator1111111111111111111111111111111";
  const base = {
    rfqState: "Settled" as RFQState,
    settlementCompletedAt: T0 + 9000,
    rfqFacilitator: signer,
    quoteFacilitator: signer,
    signer,
    quoteAmount: 950_000_000n,
    takerFeeBps: 30,
    facilitatorFeeBps: 500,
  };

  it("allows the assigned facilitator on a completed settled RFQ", () => {
    expect(canWithdrawReward(base)).toBe(true);
  });

  it("requires Settled + completed settlement", () => {
    expect(canWithdrawReward({ ...base, rfqState: "Selected" })).toBe(false);
    expect(canWithdrawReward({ ...base, settlementCompletedAt: null })).toBe(false);
  });

  it("requires both facilitator assignments to match the signer", () => {
    expect(canWithdrawReward({ ...base, rfqFacilitator: null })).toBe(false);
    expect(canWithdrawReward({ ...base, quoteFacilitator: "other" })).toBe(false);
  });

  it("requires a non-zero facilitator share (Rust: require!(share > 0))", () => {
    expect(canWithdrawReward({ ...base, facilitatorFeeBps: 0 })).toBe(false);
    // total fee floors to 1, share floors to 0 → not withdrawable
    expect(canWithdrawReward({ ...base, quoteAmount: 10n, takerFeeBps: 1 })).toBe(false);
  });
});

describe("nextAllowedStates", () => {
  it("maker transitions", () => {
    expect(nextAllowedStates("Draft", "maker")).toEqual(["Open"]);
    expect(nextAllowedStates("Open", "maker")).toEqual(["Expired"]);
    expect(nextAllowedStates("Committed", "maker")).toEqual(["Expired"]);
    expect(nextAllowedStates("Revealed", "maker")).toEqual(["Selected"]);
    expect(nextAllowedStates("Selected", "maker")).toEqual(["Incomplete"]);
  });

  it("taker transitions", () => {
    expect(nextAllowedStates("Open", "taker")).toEqual(["Committed"]);
    expect(nextAllowedStates("Committed", "taker")).toEqual(["Revealed"]);
    expect(nextAllowedStates("Revealed", "taker")).toEqual(["Ignored"]);
    expect(nextAllowedStates("Selected", "taker")).toEqual(["Settled"]);
  });

  it("facilitator never drives a state change; terminals go nowhere", () => {
    for (const state of ALL_STATES) {
      expect(nextAllowedStates(state, "facilitator")).toEqual([]);
    }
    for (const state of ["Settled", "Ignored", "Expired", "Incomplete"] as RFQState[]) {
      expect(nextAllowedStates(state, "maker")).toEqual([]);
      expect(nextAllowedStates(state, "taker")).toEqual([]);
      expect(isTerminalState(state)).toBe(true);
    }
    expect(isTerminalState("Open")).toBe(false);
  });
});
