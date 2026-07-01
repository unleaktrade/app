import { describe, expect, it } from "vitest";
import {
  deriveRelation,
  deriveRfqActions,
  isSelectionWindowOpen,
  type RfqActionId,
  type RfqActionRfq,
  type RfqActionsInput,
} from "@/app/lib/rfq-actions";

const MAKER = "Maker1111111111111111111111111111111111111";
const FAC = "Facilitator11111111111111111111111111111111";
const OTHER = "Other1111111111111111111111111111111111111";

function makeRfq(overrides: Partial<RfqActionRfq> = {}): RfqActionRfq {
  return {
    state: "Draft",
    createdAt: 900,
    openedAt: null,
    selectedAt: null,
    commitTtlSecs: 100,
    revealTtlSecs: 100,
    selectionTtlSecs: 100,
    fundTtlSecs: 100,
    committedCount: 0,
    revealedCount: 0,
    maker: MAKER,
    facilitator: null,
    minQuoteAmount: 1_000_000n,
    takerFeeBps: 50,
    settlementCompletedAt: null,
    selectedQuoteFacilitator: null,
    ...overrides,
  };
}

function ids(input: RfqActionsInput): RfqActionId[] {
  return deriveRfqActions(input).map((a) => a.id);
}

describe("deriveRelation", () => {
  it("identifies the maker", () => {
    const rel = deriveRelation({
      rfq: makeRfq(),
      connected: MAKER,
      now: 1000,
      facilitatorFeeBps: 0,
    });
    expect(rel).toEqual({ isMaker: true, isFacilitator: false });
  });

  it("identifies the facilitator", () => {
    const rel = deriveRelation({
      rfq: makeRfq({ facilitator: FAC }),
      connected: FAC,
      now: 1000,
      facilitatorFeeBps: 0,
    });
    expect(rel).toEqual({ isMaker: false, isFacilitator: true });
  });

  it("a stranger is neither", () => {
    const rel = deriveRelation({
      rfq: makeRfq({ facilitator: FAC }),
      connected: OTHER,
      now: 1000,
      facilitatorFeeBps: 0,
    });
    expect(rel).toEqual({ isMaker: false, isFacilitator: false });
  });
});

describe("deriveRfqActions — gating", () => {
  it("returns nothing when disconnected", () => {
    expect(ids({ rfq: makeRfq(), connected: null, now: 1000, facilitatorFeeBps: 0 })).toEqual([]);
  });

  it("a stranger sees no maker CTAs on a draft", () => {
    expect(ids({ rfq: makeRfq(), connected: OTHER, now: 1000, facilitatorFeeBps: 0 })).toEqual([]);
  });

  it("maker on a draft can open, edit, set facilitator, cancel — in that order", () => {
    expect(ids({ rfq: makeRfq(), connected: MAKER, now: 1000, facilitatorFeeBps: 0 })).toEqual([
      "open",
      "edit",
      "setFacilitator",
      "cancel",
    ]);
  });

  it("maker on an open RFQ within the commit window can only set the facilitator", () => {
    const rfq = makeRfq({ state: "Open", openedAt: 1000 });
    expect(ids({ rfq, connected: MAKER, now: 1050, facilitatorFeeBps: 0 })).toEqual([
      "setFacilitator",
    ]);
  });

  it("maker can reclaim an expired RFQ once the reveal window lapses with no reveals", () => {
    const rfq = makeRfq({ state: "Open", openedAt: 1000, revealedCount: 0 });
    // revealDeadline = 1000 + 100 + 100 = 1200
    expect(ids({ rfq, connected: MAKER, now: 1250, facilitatorFeeBps: 0 })).toEqual([
      "setFacilitator",
      "closeExpired",
    ]);
  });

  it("close_expired is not offered while a reveal exists", () => {
    const rfq = makeRfq({ state: "Committed", openedAt: 1000, revealedCount: 1 });
    expect(ids({ rfq, connected: MAKER, now: 1250, facilitatorFeeBps: 0 })).not.toContain(
      "closeExpired",
    );
  });

  it("maker can reclaim an incomplete settlement past the funding deadline", () => {
    // Selected: fundingDeadline = selectedAt + fundTtl = 1000 + 100 = 1100
    const rfq = makeRfq({ state: "Selected", openedAt: 800, selectedAt: 1000 });
    expect(ids({ rfq, connected: MAKER, now: 1200, facilitatorFeeBps: 0 })).toEqual([
      "closeIncomplete",
    ]);
  });

  it("maker on a Revealed RFQ sees only setFacilitator here (select lives in the table)", () => {
    const rfq = makeRfq({ state: "Revealed", openedAt: 1000, revealedCount: 2 });
    expect(ids({ rfq, connected: MAKER, now: 1250, facilitatorFeeBps: 0 })).toEqual([
      "setFacilitator",
    ]);
  });
});

describe("deriveRfqActions — facilitator claim (withdraw_reward)", () => {
  const settled = makeRfq({
    state: "Settled",
    openedAt: 800,
    selectedAt: 1000,
    settlementCompletedAt: 1100,
    facilitator: FAC,
    selectedQuoteFacilitator: FAC,
    minQuoteAmount: 1_000_000n,
    takerFeeBps: 50,
  });

  it("offers claim when settled, both facilitators match, and the share is non-zero", () => {
    // fee = floor(1e6 * 50 / 1e4) = 5000; share = floor(5000 * 5000 / 1e4) = 2500 > 0
    expect(ids({ rfq: settled, connected: FAC, now: 1200, facilitatorFeeBps: 5000 })).toEqual([
      "claimReward",
    ]);
  });

  it("no claim when the facilitator share rounds to zero", () => {
    expect(ids({ rfq: settled, connected: FAC, now: 1200, facilitatorFeeBps: 0 })).toEqual([]);
  });

  it("no claim for a non-facilitator wallet", () => {
    expect(ids({ rfq: settled, connected: OTHER, now: 1200, facilitatorFeeBps: 5000 })).toEqual([]);
  });

  it("no claim before settlement completes", () => {
    const notComplete = makeRfq({ ...settled, settlementCompletedAt: null });
    expect(ids({ rfq: notComplete, connected: FAC, now: 1200, facilitatorFeeBps: 5000 })).toEqual(
      [],
    );
  });

  it("no claim when the RFQ and quote facilitators disagree", () => {
    const mismatched = makeRfq({ ...settled, selectedQuoteFacilitator: OTHER });
    expect(ids({ rfq: mismatched, connected: FAC, now: 1200, facilitatorFeeBps: 5000 })).toEqual(
      [],
    );
  });
});

describe("isSelectionWindowOpen", () => {
  it("is open in the selection window with revealed quotes", () => {
    const rfq = makeRfq({ state: "Revealed", openedAt: 1000, revealedCount: 2 });
    // reveal=1200, selection=1300
    expect(isSelectionWindowOpen(rfq, 1250)).toBe(true);
  });

  it("is closed before reveals close", () => {
    const rfq = makeRfq({ state: "Revealed", openedAt: 1000, revealedCount: 2 });
    expect(isSelectionWindowOpen(rfq, 1150)).toBe(false);
  });

  it("is closed after the selection deadline", () => {
    const rfq = makeRfq({ state: "Revealed", openedAt: 1000, revealedCount: 2 });
    expect(isSelectionWindowOpen(rfq, 1350)).toBe(false);
  });

  it("is closed once a winner is already selected", () => {
    const rfq = makeRfq({ state: "Revealed", openedAt: 1000, revealedCount: 2, selectedAt: 1250 });
    expect(isSelectionWindowOpen(rfq, 1260)).toBe(false);
  });

  it("is closed with no revealed quotes", () => {
    const rfq = makeRfq({ state: "Revealed", openedAt: 1000, revealedCount: 0 });
    expect(isSelectionWindowOpen(rfq, 1250)).toBe(false);
  });
});
