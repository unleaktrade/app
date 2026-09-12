import { describe, expect, it } from "vitest";
import type { Quote, RFQ } from "@/types/rfq";
import type { PendingReward } from "@/app/lib/rewards";
import { deriveAttentionItems, type AttentionItem } from "@/app/lib/attention";

// View-model fixtures (the shapes MyActivity feeds the ribbon with). Keys are
// arbitrary strings: the derivation only ever compares / interpolates them.
const ME = "me11111111111111111111111111111111111111111";

function makeRfq(overrides: Partial<RFQ> = {}): RFQ {
  return {
    publicKey: "rfq-1",
    maker: ME,
    baseMint: "base-mint",
    quoteMint: "quote-mint",
    pair: "SOL/USDC",
    baseAmount: 10,
    minQuoteAmount: 1000,
    bondAmount: 50,
    feeAmount: 5,
    state: "Open",
    commitTtlSecs: 3600,
    revealTtlSecs: 3600,
    selectionTtlSecs: 3600,
    fundTtlSecs: 3600,
    createdAt: 1_700_000_000,
    openedAt: 1_700_000_100,
    selectedAt: null,
    completedAt: null,
    committedCount: 0,
    revealedCount: 0,
    selectedQuote: null,
    facilitator: null,
    expiresIn: "42m",
    ...overrides,
  };
}

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    publicKey: "quote-1",
    rfq: "rfq-1",
    taker: ME,
    commitHash: "",
    liquidityProof: "",
    committedAt: 1_700_000_200,
    revealedAt: null,
    bondsRefundedAt: null,
    quoteAmount: null,
    selected: false,
    facilitator: "",
    maxFundingDeadline: 0,
    ...overrides,
  };
}

function makeReward(overrides: Partial<PendingReward> = {}): PendingReward {
  return {
    rfq: "rfq-settled",
    quote: "quote-winner",
    quoteMint: "quote-mint",
    symbol: "USDC",
    decimals: 6,
    amount: 1_500_000n,
    settledAt: 1_700_001_000,
    pair: "SOL/USDC",
    ...overrides,
  };
}

function byKey(rfqs: RFQ[]): Map<string, RFQ> {
  return new Map(rfqs.map((r) => [r.publicKey, r]));
}

function derive(args: {
  myRFQs?: RFQ[];
  myQuotes?: Quote[];
  pendingRewards?: PendingReward[];
  rfqByKey?: Map<string, RFQ>;
}): AttentionItem[] {
  const myRFQs = args.myRFQs ?? [];
  return deriveAttentionItems({
    myRFQs,
    myQuotes: args.myQuotes ?? [],
    pendingRewards: args.pendingRewards ?? [],
    rfqByKey: args.rfqByKey ?? byKey(myRFQs),
  });
}

describe("deriveAttentionItems", () => {
  it("returns nothing when there is nothing to do", () => {
    expect(derive({})).toEqual([]);
    expect(
      derive({
        myRFQs: [makeRfq({ state: "Open" }), makeRfq({ publicKey: "rfq-2", state: "Settled" })],
      }),
    ).toEqual([]);
  });

  describe("drafts to open", () => {
    it("emits an untimed primary open-draft item per Draft RFQ", () => {
      const items = derive({
        myRFQs: [makeRfq({ publicKey: "rfq-d", state: "Draft", expiresIn: null })],
      });
      expect(items).toEqual([
        {
          id: "open:rfq-d",
          kind: "open-draft",
          rfqKey: "rfq-d",
          label: "Open draft SOL/USDC",
          cta: "Open",
          tone: "primary",
        },
      ]);
    });

    it("ignores the draft's expiresIn — drafts are never timed", () => {
      const [item] = derive({
        myRFQs: [makeRfq({ publicKey: "rfq-d", state: "Draft", expiresIn: "5m" })],
      });
      expect(item).toBeDefined();
      expect(item).not.toHaveProperty("expiresIn");
    });
  });

  describe("quotes to reveal", () => {
    it("emits an urgent timed reveal item for an unrevealed quote on a Committed RFQ", () => {
      const rfq = makeRfq({ publicKey: "rfq-c", state: "Committed", expiresIn: "12m" });
      const items = derive({
        myQuotes: [makeQuote({ publicKey: "q-1", rfq: "rfq-c" })],
        rfqByKey: byKey([rfq]),
      });
      expect(items).toEqual([
        {
          id: "reveal:q-1",
          kind: "reveal",
          rfqKey: "rfq-c",
          quoteKey: "q-1",
          label: "Reveal quote on SOL/USDC",
          cta: "Reveal",
          tone: "urgent",
          expiresIn: "12m",
        },
      ]);
    });

    it("skips quotes already revealed, on non-Committed RFQs, or on unknown RFQs", () => {
      const committed = makeRfq({ publicKey: "rfq-c", state: "Committed" });
      const open = makeRfq({ publicKey: "rfq-o", state: "Open" });
      const items = derive({
        myQuotes: [
          makeQuote({ publicKey: "q-revealed", rfq: "rfq-c", revealedAt: 1_700_000_300 }),
          makeQuote({ publicKey: "q-open", rfq: "rfq-o" }),
          makeQuote({ publicKey: "q-orphan", rfq: "rfq-missing" }),
        ],
        rfqByKey: byKey([committed, open]),
      });
      expect(items).toEqual([]);
    });
  });

  describe("winners to select", () => {
    it("emits an urgent timed select item per Revealed RFQ I posted", () => {
      const items = derive({
        myRFQs: [makeRfq({ publicKey: "rfq-r", state: "Revealed", expiresIn: "3m" })],
      });
      expect(items).toEqual([
        {
          id: "select:rfq-r",
          kind: "select",
          rfqKey: "rfq-r",
          label: "Select winner on SOL/USDC",
          cta: "Select",
          tone: "urgent",
          expiresIn: "3m",
        },
      ]);
    });
  });

  describe("selected quotes to settle", () => {
    it("emits an urgent timed settle item for my selected quote on a Selected RFQ", () => {
      const rfq = makeRfq({ publicKey: "rfq-s", state: "Selected", expiresIn: "1h" });
      const items = derive({
        myQuotes: [makeQuote({ publicKey: "q-w", rfq: "rfq-s", selected: true })],
        rfqByKey: byKey([rfq]),
      });
      expect(items).toEqual([
        {
          id: "settle:q-w",
          kind: "settle",
          rfqKey: "rfq-s",
          quoteKey: "q-w",
          label: "Settle SOL/USDC",
          cta: "Settle",
          tone: "urgent",
          expiresIn: "1h",
        },
      ]);
    });

    it("skips unselected quotes and selected quotes whose RFQ has moved on", () => {
      const selected = makeRfq({ publicKey: "rfq-s", state: "Selected" });
      const settled = makeRfq({ publicKey: "rfq-done", state: "Settled" });
      const items = derive({
        myQuotes: [
          makeQuote({ publicKey: "q-loser", rfq: "rfq-s", selected: false }),
          makeQuote({ publicKey: "q-done", rfq: "rfq-done", selected: true }),
        ],
        rfqByKey: byKey([selected, settled]),
      });
      expect(items).toEqual([]);
    });
  });

  describe("rewards to claim", () => {
    it("emits a reward-toned claim item with the formatted per-mint amount", () => {
      const items = derive({
        pendingRewards: [makeReward({ rfq: "rfq-x", amount: 1_500_000n, decimals: 6 })],
      });
      expect(items).toEqual([
        {
          id: "claim:rfq-x",
          kind: "claim",
          rfqKey: "rfq-x",
          label: "Claim reward — SOL/USDC",
          sublabel: "1.5 USDC ready",
          cta: "Claim",
          tone: "reward",
        },
      ]);
    });

    it("formats in the reward's own mint, never a USD aggregate", () => {
      const [item] = derive({
        pendingRewards: [
          makeReward({
            rfq: "rfq-y",
            pair: "JUP/BONK",
            symbol: "BONK",
            decimals: 5,
            amount: 123_456_789n,
          }),
        ],
      });
      expect(item?.label).toBe("Claim reward — JUP/BONK");
      expect(item?.sublabel).toBe("1,234.56789 BONK ready");
    });
  });

  describe("ordering", () => {
    it("sorts urgent → primary → reward, and timed before untimed within a tone", () => {
      const rfqs = [
        makeRfq({ publicKey: "rfq-draft", state: "Draft", expiresIn: null }),
        makeRfq({ publicKey: "rfq-untimed-revealed", state: "Revealed", expiresIn: null }),
        makeRfq({ publicKey: "rfq-committed", state: "Committed", expiresIn: "9m" }),
        makeRfq({ publicKey: "rfq-selected", state: "Selected", expiresIn: "20m" }),
      ];
      const items = derive({
        myRFQs: rfqs,
        myQuotes: [
          makeQuote({ publicKey: "q-reveal", rfq: "rfq-committed" }),
          makeQuote({ publicKey: "q-settle", rfq: "rfq-selected", selected: true }),
        ],
        pendingRewards: [makeReward({ rfq: "rfq-claim" })],
        rfqByKey: byKey(rfqs),
      });
      expect(items.map((i) => i.id)).toEqual([
        "reveal:q-reveal",
        "settle:q-settle",
        "select:rfq-untimed-revealed",
        "open:rfq-draft",
        "claim:rfq-claim",
      ]);
    });

    it("keeps insertion order among equally-ranked items (drafts, reveals, selects, settles, claims)", () => {
      const rfqs = [
        makeRfq({ publicKey: "rfq-r2", state: "Revealed", expiresIn: "2m" }),
        makeRfq({ publicKey: "rfq-c1", state: "Committed", expiresIn: "8m" }),
        makeRfq({ publicKey: "rfq-d2", state: "Draft" }),
        makeRfq({ publicKey: "rfq-d1", state: "Draft" }),
      ];
      const items = derive({
        myRFQs: rfqs,
        myQuotes: [makeQuote({ publicKey: "q-c1", rfq: "rfq-c1" })],
        pendingRewards: [makeReward({ rfq: "rfq-k2" }), makeReward({ rfq: "rfq-k1" })],
        rfqByKey: byKey(rfqs),
      });
      expect(items.map((i) => i.id)).toEqual([
        "reveal:q-c1",
        "select:rfq-r2",
        "open:rfq-d2",
        "open:rfq-d1",
        "claim:rfq-k2",
        "claim:rfq-k1",
      ]);
    });
  });

  it("does not mutate its inputs", () => {
    const myRFQs = [makeRfq({ publicKey: "rfq-d", state: "Draft" })];
    const rewards = [makeReward()];
    const snapshotRfqs = structuredClone(myRFQs);
    derive({ myRFQs, pendingRewards: rewards });
    expect(myRFQs).toEqual(snapshotRfqs);
    expect(rewards).toHaveLength(1);
  });
});
