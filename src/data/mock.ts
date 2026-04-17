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

interface StatusConfig {
  color: string;
  bgColor: string;
  label: string;
  description: string;
}

const STATUS_CONFIG: Record<RFQState, StatusConfig> = {
  Draft: {
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
    label: "Draft",
    description:
      "Initial state when RFQ is being created. The maker is still configuring the request parameters.",
  },
  Open: {
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    label: "Open",
    description:
      "RFQ is open and accepting commitments. Takers can now submit cryptographic proof commitments to participate.",
  },
  Committed: {
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    label: "Committed",
    description:
      "At least one taker has submitted a commitment. The commitment phase is complete and takers must reveal their quotes.",
  },
  Revealed: {
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/20",
    label: "Revealed",
    description:
      "At least one taker has revealed their quote. The maker can now review and select the best quote.",
  },
  Selected: {
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    label: "Selected",
    description:
      "Maker has selected a taker and initiated settlement. The selected taker must now fund the escrow to complete the trade.",
  },
  Settled: {
    color: "text-teal-400",
    bgColor: "bg-teal-500/20",
    label: "Settled",
    description:
      "Settlement completed successfully! The taker has funded the escrow and the trade has been executed.",
  },
  Ignored: {
    color: "text-gray-400",
    bgColor: "bg-gray-500/20",
    label: "Ignored",
    description:
      "Maker did not select any valid quote within the selection window. The RFQ has expired without settlement.",
  },
  Expired: {
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    label: "Expired",
    description:
      "RFQ expired without receiving any valid commitments or reveals. No takers participated in time.",
  },
  Incomplete: {
    color: "text-red-400",
    bgColor: "bg-red-600/20",
    label: "Incomplete",
    description:
      "Taker did not fund the escrow in time after being selected. The trade failed to complete and bonds may be slashed.",
  },
};

export function getStatusConfig(status: RFQState): StatusConfig {
  return STATUS_CONFIG[status];
}

const CARD_GRADIENTS: Record<RFQState, string> = {
  Draft: "bg-gradient-to-br from-slate-500/10 via-slate-600/5 to-white/[0.02]",
  Open: "bg-gradient-to-br from-cyan-500/15 via-cyan-600/8 to-white/[0.02]",
  Committed: "bg-gradient-to-br from-purple-500/15 via-purple-600/8 to-white/[0.02]",
  Revealed: "bg-gradient-to-br from-indigo-500/15 via-indigo-600/8 to-white/[0.02]",
  Selected: "bg-gradient-to-br from-blue-500/15 via-blue-600/8 to-white/[0.02]",
  Settled: "bg-gradient-to-br from-teal-500/15 via-teal-600/8 to-white/[0.02]",
  Ignored: "bg-gradient-to-br from-gray-500/15 via-gray-600/8 to-white/[0.02]",
  Expired: "bg-gradient-to-br from-orange-500/15 via-orange-600/8 to-white/[0.02]",
  Incomplete: "bg-gradient-to-br from-red-500/15 via-red-600/8 to-white/[0.02]",
};

const CARD_BORDERS: Record<RFQState, string> = {
  Draft: "border-slate-500/20 hover:border-slate-400/40",
  Open: "border-cyan-500/20 hover:border-cyan-400/40",
  Committed: "border-purple-500/20 hover:border-purple-400/40",
  Revealed: "border-indigo-500/20 hover:border-indigo-400/40",
  Selected: "border-blue-500/20 hover:border-blue-400/40",
  Settled: "border-teal-500/20 hover:border-teal-400/40",
  Ignored: "border-gray-500/20 hover:border-gray-400/40",
  Expired: "border-orange-500/20 hover:border-orange-400/40",
  Incomplete: "border-red-500/20 hover:border-red-400/40",
};

const CARD_GLOWS: Record<RFQState, string> = {
  Draft: "from-slate-500/0 to-slate-600/0 group-hover:from-slate-500/5 group-hover:to-slate-600/10",
  Open: "from-cyan-500/0 to-cyan-600/0 group-hover:from-cyan-500/5 group-hover:to-cyan-600/10",
  Committed:
    "from-purple-500/0 to-purple-600/0 group-hover:from-purple-500/5 group-hover:to-purple-600/10",
  Revealed:
    "from-indigo-500/0 to-indigo-600/0 group-hover:from-indigo-500/5 group-hover:to-indigo-600/10",
  Selected: "from-blue-500/0 to-blue-600/0 group-hover:from-blue-500/5 group-hover:to-blue-600/10",
  Settled: "from-teal-500/0 to-teal-600/0 group-hover:from-teal-500/5 group-hover:to-teal-600/10",
  Ignored: "from-gray-500/0 to-gray-600/0 group-hover:from-gray-500/5 group-hover:to-gray-600/10",
  Expired:
    "from-orange-500/0 to-orange-600/0 group-hover:from-orange-500/5 group-hover:to-orange-600/10",
  Incomplete: "from-red-500/0 to-red-600/0 group-hover:from-red-500/5 group-hover:to-red-600/10",
};

export function getCardGradient(status: RFQState): string {
  return CARD_GRADIENTS[status];
}

export function getCardBorder(status: RFQState): string {
  return CARD_BORDERS[status];
}

export function getCardGlow(status: RFQState): string {
  return CARD_GLOWS[status];
}
