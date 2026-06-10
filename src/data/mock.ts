import type { FacilitatorReward, Quote, RFQ, RFQState } from "@/types/rfq";

const TRADING_PAIRS = [
  {
    base: "So11111111111111111111111111111111111111112",
    quote: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    pair: "wSOL/USDC",
  },
  {
    base: "So11111111111111111111111111111111111111112",
    quote: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    pair: "wSOL/USDT",
  },
  {
    base: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    quote: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    pair: "JUP/USDC",
  },
  {
    base: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    quote: "So11111111111111111111111111111111111111112",
    pair: "JUP/wSOL",
  },
  {
    base: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    quote: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    pair: "RAY/USDC",
  },
  {
    base: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    quote: "So11111111111111111111111111111111111111112",
    pair: "RAY/wSOL",
  },
  {
    base: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    quote: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    pair: "BONK/USDC",
  },
  {
    base: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    quote: "So11111111111111111111111111111111111111112",
    pair: "BONK/wSOL",
  },
  {
    base: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv",
    quote: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    pair: "PENGU/USDC",
  },
  {
    base: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    quote: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    pair: "mSOL/USDC",
  },
  {
    base: "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
    quote: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    pair: "stSOL/USDC",
  },
  {
    base: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    quote: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    pair: "PYTH/USDC",
  },
  {
    base: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    quote: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    pair: "USDC/USDT",
  },
];

const STATES: RFQState[] = [
  "Draft",
  "Open",
  "Committed",
  "Revealed",
  "Selected",
  "Settled",
  "Expired",
  "Ignored",
  "Incomplete",
];

function randomElement<T>(arr: T[]): T {
  const item = arr[Math.floor(Math.random() * arr.length)];
  if (item === undefined) {
    throw new Error("randomElement called on empty array");
  }
  return item;
}

function randomAmount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min);
}

function generateMockAddress(): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const CURRENT_USER = "7Xg9...K3pQ";
export const CURRENT_USER_FULL = "7XgBxRz9K3pQ";

const now = Math.floor(Date.now() / 1000);

export const mockRFQs: RFQ[] = (() => {
  const rfqs: RFQ[] = [];
  const myRFQsPerState = new Map<RFQState, number>();
  STATES.forEach((state) => myRFQsPerState.set(state, 0));

  for (let i = 0; i < 70; i++) {
    const pair = randomElement(TRADING_PAIRS);
    const state = randomElement(STATES);
    const baseAmount = randomAmount(10000, 1000000);
    const minQuoteAmount = randomAmount(baseAmount * 0.8, baseAmount * 1.5);
    const bondAmount = randomAmount(1000, 10000);
    const feeAmount = Math.floor(minQuoteAmount * 0.002);
    const createdAt = now - randomAmount(3600, 86400);
    const openedAt = state !== "Draft" ? createdAt + 60 : null;

    let expiresIn: string | null = null;
    if (openedAt && (state === "Open" || state === "Committed" || state === "Revealed")) {
      const ttl = randomAmount(1800, 7200);
      const deadline = openedAt + ttl;
      const remaining = deadline - now;
      if (remaining > 0) {
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        expiresIn = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      }
    }

    const currentCount = myRFQsPerState.get(state) ?? 0;
    const targetMinPerState = 1 + Math.floor(Math.random() * 2);
    const isMine = currentCount < targetMinPerState || Math.random() < 0.2;
    if (isMine) {
      myRFQsPerState.set(state, currentCount + 1);
    }

    rfqs.push({
      publicKey: `RFQ-${i.toString().padStart(3, "0")}-${generateMockAddress().substring(0, 8)}`,
      maker: isMine ? CURRENT_USER_FULL : generateMockAddress(),
      baseMint: pair.base,
      quoteMint: pair.quote,
      pair: pair.pair,
      baseAmount,
      minQuoteAmount,
      bondAmount,
      feeAmount,
      state,
      commitTtlSecs: 3600,
      revealTtlSecs: 1800,
      selectionTtlSecs: 1800,
      fundTtlSecs: 3600,
      createdAt,
      openedAt,
      selectedAt: state === "Selected" || state === "Settled" ? createdAt + 5400 : null,
      completedAt: state === "Settled" ? createdAt + 7200 : null,
      committedCount:
        state === "Committed" ? randomAmount(1, 5) : state === "Revealed" ? randomAmount(2, 6) : 0,
      revealedCount: state === "Revealed" ? randomAmount(1, 4) : 0,
      selectedQuote: state === "Selected" || state === "Settled" ? `QUOTE-${i}` : null,
      facilitator: Math.random() < 0.3 ? generateMockAddress() : null,
      expiresIn,
    });
  }
  return rfqs;
})();

export const mockQuotes: Quote[] = (() => {
  const quotes: Quote[] = [];
  for (let i = 0; i < 15; i++) {
    const rfq = mockRFQs[i];
    if (!rfq) break;
    const isSelected = i < 3;
    quotes.push({
      publicKey: `QUOTE-${i}-${generateMockAddress().substring(0, 8)}`,
      rfq: rfq.publicKey,
      taker: CURRENT_USER_FULL,
      commitHash: generateMockAddress().substring(0, 32),
      liquidityProof: generateMockAddress().substring(0, 32),
      committedAt: now - randomAmount(1800, 7200),
      revealedAt: rfq.state !== "Committed" ? now - randomAmount(900, 3600) : null,
      bondsRefundedAt: rfq.state === "Settled" ? now - 300 : null,
      quoteAmount:
        rfq.state !== "Committed" ? rfq.minQuoteAmount + randomAmount(-1000, 1000) : null,
      selected: isSelected,
      facilitator: rfq.facilitator ?? generateMockAddress(),
      maxFundingDeadline: now + 3600,
    });
  }
  return quotes;
})();

export const mockFacilitatorRewards: FacilitatorReward[] = (() => {
  const rewards: FacilitatorReward[] = [];
  for (let i = 0; i < 3; i++) {
    const rfq = mockRFQs[i];
    if (!rfq) break;
    rewards.push({
      publicKey: `REWARD-${(i + 1).toString().padStart(3, "0")}`,
      rfq: rfq.publicKey,
      facilitator: CURRENT_USER_FULL,
      amount: 200 - i * 50,
      claimedAt: i === 2 ? now - 3600 : null,
    });
  }
  return rewards;
})();

export function getRFQsByState(state: RFQState): RFQ[] {
  return mockRFQs.filter((rfq) => rfq.state === state);
}

export function getMyRFQs(userAddress: string): RFQ[] {
  return mockRFQs.filter((rfq) => rfq.maker === userAddress);
}

export function getMyQuotes(userAddress: string): Quote[] {
  return mockQuotes.filter((quote) => quote.taker === userAddress);
}

export function getMyFacilitatorRewards(userAddress: string): FacilitatorReward[] {
  return mockFacilitatorRewards.filter((reward) => reward.facilitator === userAddress);
}

export function getQuotesForRFQ(rfqPublicKey: string): Quote[] {
  return mockQuotes.filter((quote) => quote.rfq === rfqPublicKey);
}

export function getRFQById(publicKey: string): RFQ | undefined {
  return mockRFQs.find((rfq) => rfq.publicKey === publicKey);
}

export function getLiquidityData() {
  return [
    { token: "USDC", value: 32.1, color: "#3b82f6" },
    { token: "USDT", value: 28.5, color: "#10b981" },
    { token: "BONK", value: 12.3, color: "#f97316" },
    { token: "JUP", value: 8.4, color: "#06b6d4" },
    { token: "RAY", value: 6.2, color: "#ec4899" },
    { token: "WIF", value: 4.8, color: "#8b5cf6" },
    { token: "TRUMP", value: 3.5, color: "#ef4444" },
    { token: "PENGU", value: 2.7, color: "#14b8a6" },
    { token: "LINK", value: 1.5, color: "#6366f1" },
  ];
}
