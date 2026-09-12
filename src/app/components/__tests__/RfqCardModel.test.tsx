import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import type { RFQ } from "@/types/rfq";
import { getCardBorder, getCardGradient, getOwnedHighlight } from "@/app/lib/rfq-visuals";
import { useRfqCardModel } from "../marketplace/RfqCardModel";

const POSTER = "Poster11111111111111111111111111111111111111";
const QUOTER = "Quoter11111111111111111111111111111111111111";
const BYSTANDER = "Bystander1111111111111111111111111111111111";

const baseRfq: RFQ = {
  publicKey: "Rfq1111111111111111111111111111111111111111",
  maker: POSTER,
  baseMint: "So11111111111111111111111111111111111111112",
  quoteMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  pair: "SOL/USDC",
  baseAmount: 10,
  minQuoteAmount: 1_500,
  bondAmount: 50,
  feeAmount: 0,
  state: "Open",
  commitTtlSecs: 3_600,
  revealTtlSecs: 3_600,
  selectionTtlSecs: 3_600,
  fundTtlSecs: 3_600,
  createdAt: 1_700_000_000,
  openedAt: 1_700_000_100,
  selectedAt: null,
  completedAt: null,
  committedCount: 0,
  revealedCount: 0,
  selectedQuote: null,
  facilitator: null,
  expiresIn: "59m",
};

describe("useRfqCardModel", () => {
  it("splits the pair and resolves the state-based styling", () => {
    const { result } = renderHook(() => useRfqCardModel(baseRfq, BYSTANDER));
    expect(result.current.base).toBe("SOL");
    expect(result.current.quote).toBe("USDC");
    expect(result.current.cardGradient).toBe(getCardGradient("Open"));
    expect(result.current.cardBorder).toBe(getCardBorder("Open"));
    expect(result.current.myRFQStyles).toEqual(getOwnedHighlight("Open"));
  });

  it("marks the poster's own RFQ as mine (quotable state, but never by the owner)", () => {
    const { result } = renderHook(() => useRfqCardModel(baseRfq, POSTER));
    expect(result.current.isMyRFQ).toBe(true);
    expect(result.current.canQuote).toBe(true);
    expect(result.current.isCommitted).toBe(false);
  });

  it("keeps an RFQ the current user quoted (Committed) quotable and not mine", () => {
    const committed: RFQ = { ...baseRfq, state: "Committed", committedCount: 1 };
    const { result } = renderHook(() => useRfqCardModel(committed, QUOTER));
    expect(result.current.isMyRFQ).toBe(false);
    expect(result.current.isCommitted).toBe(true);
    expect(result.current.canQuote).toBe(true);
    expect(result.current.cardGradient).toBe(getCardGradient("Committed"));
    expect(result.current.myRFQStyles).toEqual(getOwnedHighlight("Committed"));
  });

  it("treats an uninvolved wallet as a plain viewer", () => {
    const { result } = renderHook(() => useRfqCardModel(baseRfq, BYSTANDER));
    expect(result.current.isMyRFQ).toBe(false);
    expect(result.current.isCommitted).toBe(false);
    expect(result.current.canQuote).toBe(true);
  });

  it("never claims ownership with no wallet connected", () => {
    const { result } = renderHook(() => useRfqCardModel(baseRfq, null));
    expect(result.current.isMyRFQ).toBe(false);
    expect(result.current.canQuote).toBe(true);
  });

  it("only Open and Committed RFQs are quotable", () => {
    const quotable = (state: RFQ["state"]) =>
      renderHook(() => useRfqCardModel({ ...baseRfq, state }, BYSTANDER)).result.current.canQuote;
    expect(quotable("Draft")).toBe(false);
    expect(quotable("Open")).toBe(true);
    expect(quotable("Committed")).toBe(true);
    expect(quotable("Revealed")).toBe(false);
    expect(quotable("Selected")).toBe(false);
    expect(quotable("Settled")).toBe(false);
    expect(quotable("Expired")).toBe(false);
    expect(quotable("Ignored")).toBe(false);
    expect(quotable("Incomplete")).toBe(false);
  });
});
