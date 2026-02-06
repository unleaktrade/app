import { RFQState } from "@/app/App";

// Enhanced data structures based on backend model

export interface RFQ {
  publicKey: string;
  maker: string;
  baseMint: string;
  quoteMint: string;
  pair: string; // Human readable e.g., "wSOL/USDC"
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
  selectedQuote: string | null; // Quote publicKey
  facilitator: string | null;
  expiresIn: string | null; // Human readable
}

export interface Quote {
  publicKey: string;
  rfq: string; // RFQ publicKey
  taker: string;
  commitHash: string;
  liquidityProof: string;
  committedAt: number;
  revealedAt: number | null;
  bondsRefundedAt: number | null;
  quoteAmount: number | null; // Null until revealed
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

// Token pairs mapping
const TOKEN_PAIRS: Record<string, string> = {
  "So11111111111111111111111111111111111111112": "wSOL",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": "JUP",
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": "RAY",
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "BONK",
  "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv": "PENGU",
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": "mSOL",
  "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj": "stSOL",
  "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3": "PYTH",
};

const TRADING_PAIRS = [
  { base: "So11111111111111111111111111111111111111112", quote: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", pair: "wSOL/USDC" },
  { base: "So11111111111111111111111111111111111111112", quote: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", pair: "wSOL/USDT" },
  { base: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", quote: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", pair: "JUP/USDC" },
  { base: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", quote: "So11111111111111111111111111111111111111112", pair: "JUP/wSOL" },
  { base: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", quote: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", pair: "RAY/USDC" },
  { base: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", quote: "So11111111111111111111111111111111111111112", pair: "RAY/wSOL" },
  { base: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", quote: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", pair: "BONK/USDC" },
  { base: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", quote: "So11111111111111111111111111111111111111112", pair: "BONK/wSOL" },
  { base: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv", quote: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", pair: "PENGU/USDC" },
  { base: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", quote: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", pair: "mSOL/USDC" },
  { base: "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj", quote: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", pair: "stSOL/USDC" },
  { base: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3", quote: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", pair: "PYTH/USDC" },
  { base: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", quote: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", pair: "USDC/USDT" },
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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

// Simulated current user
export const CURRENT_USER = "7Xg9...K3pQ";
export const CURRENT_USER_FULL = "7XgBxRz9K3pQ";

// Generate 70+ mock RFQs
export const mockRFQs: RFQ[] = [];

// Generate various states
const states: RFQState[] = ["Draft", "Open", "Committed", "Revealed", "Selected", "Settled", "Expired", "Ignored", "Incomplete"];
const now = Math.floor(Date.now() / 1000);

// Generate 70 RFQs with more variety
for (let i = 0; i < 70; i++) {
  const pair = randomElement(TRADING_PAIRS);
  const state = randomElement(states);
  const baseAmount = randomAmount(10000, 1000000);
  const minQuoteAmount = randomAmount(baseAmount * 0.8, baseAmount * 1.5);
  const bondAmount = randomAmount(1000, 10000);
  const feeAmount = Math.floor(minQuoteAmount * 0.002);
  const createdAt = now - randomAmount(3600, 86400);
  const openedAt = state !== "Draft" ? createdAt + 60 : null;
  
  let expiresIn: string | null = null;
  if (openedAt && ["Open", "Committed", "Revealed"].includes(state)) {
    const ttl = randomAmount(1800, 7200);
    const deadline = openedAt + ttl;
    const remaining = deadline - now;
    if (remaining > 0) {
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      expiresIn = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
  }

  // Occasionally make current user the maker (10% chance)
  const isMine = Math.random() < 0.1;
  
  mockRFQs.push({
    publicKey: `RFQ-${i.toString().padStart(3, '0')}-${generateMockAddress().substring(0, 8)}`,
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
    selectedAt: ["Selected", "Settled"].includes(state) ? createdAt + 5400 : null,
    completedAt: state === "Settled" ? createdAt + 7200 : null,
    committedCount: state === "Committed" ? randomAmount(1, 5) : state === "Revealed" ? randomAmount(2, 6) : 0,
    revealedCount: state === "Revealed" ? randomAmount(1, 4) : 0,
    selectedQuote: ["Selected", "Settled"].includes(state) ? `QUOTE-${i}` : null,
    facilitator: Math.random() < 0.3 ? generateMockAddress() : null,
    expiresIn,
  });
}

// Mock Quotes (current user as taker)
export const mockQuotes: Quote[] = [];

for (let i = 0; i < 15; i++) {
  const rfq = mockRFQs[i];
  const isSelected = i < 3; // First 3 are selected/won
  
  mockQuotes.push({
    publicKey: `QUOTE-${i}-${generateMockAddress().substring(0, 8)}`,
    rfq: rfq.publicKey,
    taker: CURRENT_USER_FULL,
    commitHash: generateMockAddress().substring(0, 32),
    liquidityProof: generateMockAddress().substring(0, 32),
    committedAt: now - randomAmount(1800, 7200),
    revealedAt: rfq.state !== "Committed" ? now - randomAmount(900, 3600) : null,
    bondsRefundedAt: rfq.state === "Settled" ? now - 300 : null,
    quoteAmount: rfq.state !== "Committed" ? rfq.minQuoteAmount + randomAmount(-1000, 1000) : null,
    selected: isSelected,
    facilitator: rfq.facilitator || generateMockAddress(),
    maxFundingDeadline: now + 3600,
  });
}

// Mock Facilitator Rewards
export const mockFacilitatorRewards: FacilitatorReward[] = [
  {
    publicKey: "REWARD-001",
    rfq: mockRFQs[0].publicKey,
    facilitator: CURRENT_USER_FULL,
    amount: 200,
    claimedAt: null,
  },
  {
    publicKey: "REWARD-002",
    rfq: mockRFQs[1].publicKey,
    facilitator: CURRENT_USER_FULL,
    amount: 150,
    claimedAt: null,
  },
  {
    publicKey: "REWARD-003",
    rfq: mockRFQs[2].publicKey,
    facilitator: CURRENT_USER_FULL,
    amount: 180,
    claimedAt: now - 3600,
  },
];

// Helper functions
export function getRFQsByState(state: RFQState): RFQ[] {
  return mockRFQs.filter(rfq => rfq.state === state);
}

export function getMyRFQs(userAddress: string): RFQ[] {
  return mockRFQs.filter(rfq => rfq.maker === userAddress);
}

export function getMyQuotes(userAddress: string): Quote[] {
  return mockQuotes.filter(quote => quote.taker === userAddress);
}

export function getMyFacilitatorRewards(userAddress: string): FacilitatorReward[] {
  return mockFacilitatorRewards.filter(reward => reward.facilitator === userAddress);
}

export function getQuotesForRFQ(rfqPublicKey: string): Quote[] {
  return mockQuotes.filter(quote => quote.rfq === rfqPublicKey);
}

export function getRFQById(publicKey: string): RFQ | undefined {
  return mockRFQs.find(rfq => rfq.publicKey === publicKey);
}