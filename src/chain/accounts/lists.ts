import { PublicKey } from "@solana/web3.js";
import { useQuery, type QueryKey, type UseQueryResult } from "@tanstack/react-query";
import { env } from "@/chain/env";
import { useSettlementProgram } from "@/chain/program";
import { normaliseRfq, type RfqAccount } from "./rfq";
import { normaliseQuote, type QuoteAccount } from "./quote";
import {
  normaliseFacilitatorRewardTracker,
  type FacilitatorRewardTrackerAccount,
} from "./facilitatorRewardTracker";

/**
 * Result row for a list read. The per-account schemas don't carry the account's
 * own address (it's the query input for a single read), but list consumers need
 * the PDA to navigate / derive related accounts — so surface it alongside.
 */
export interface ProgramAccount<T> {
  publicKey: PublicKey;
  account: T;
}

// memcmp offsets are absolute from byte 0. Every Anchor account is prefixed by
// an 8-byte discriminator; the fields preceding each filter target are all
// 32-byte Pubkeys. Asserted against the committed-IDL Borsh layout in
// __tests__/lists.test.ts so a field reorder fails loudly instead of silently
// filtering on the wrong bytes.
const DISCRIMINATOR = 8;
const PUBKEY = 32;

/** rfq: [disc][config][maker] → maker at 8 + 32. */
export const RFQ_MAKER_OFFSET = DISCRIMINATOR + PUBKEY;
/** quote: [disc][rfq] → rfq at 8. */
export const QUOTE_RFQ_OFFSET = DISCRIMINATOR;
/** quote: [disc][rfq][taker] → taker at 8 + 32. */
export const QUOTE_TAKER_OFFSET = DISCRIMINATOR + PUBKEY;
/** facilitatorRewardTracker: [disc][rfq] → rfq at 8. */
export const FACILITATOR_REWARD_RFQ_OFFSET = DISCRIMINATOR;
/** facilitatorRewardTracker: [disc][rfq][facilitator] → facilitator at 8 + 32. */
export const FACILITATOR_REWARD_FACILITATOR_OFFSET = DISCRIMINATOR + PUBKEY;

interface MemcmpFilter {
  memcmp: { offset: number; bytes: string };
}

interface ListApi<TRaw> {
  all(filters?: MemcmpFilter[]): Promise<{ publicKey: PublicKey; account: TRaw }[]>;
}

function memcmp(offset: number, key: PublicKey): MemcmpFilter {
  return { memcmp: { offset, bytes: key.toBase58() } };
}

/**
 * Shared getProgramAccounts plumbing for list reads. Unlike useDecodedAccount,
 * lists do NOT open a websocket subscription (those stay detail-page-only — no
 * polling loops); freshness comes from TanStack's refetch-on-focus. Query keys
 * follow the [account, programId, "all", …] convention; react-query hashes them
 * structurally, so building the array inline each render is fine.
 */
function useProgramAccounts<TRaw, T>(
  accountKey: string,
  normalise: (raw: TRaw) => T,
  filters: MemcmpFilter[],
  queryKey: QueryKey,
  enabled: boolean,
): UseQueryResult<ProgramAccount<T>[]> {
  const program = useSettlementProgram();

  return useQuery<ProgramAccount<T>[]>({
    queryKey,
    enabled: program !== null && enabled,
    queryFn: async () => {
      if (!program) return [];
      const api = (program.account as unknown as Record<string, ListApi<TRaw> | undefined>)[
        accountKey
      ];
      if (!api) throw new Error(`Unknown account namespace: ${accountKey}`);
      const rows = await api.all(filters.length > 0 ? filters : undefined);
      return rows.map((row) => ({ publicKey: row.publicKey, account: normalise(row.account) }));
    },
  });
}

/** All RFQs, optionally narrowed to those a given maker posted. */
export function useRfqAccounts(
  filters: { maker?: PublicKey | null } = {},
): UseQueryResult<ProgramAccount<RfqAccount>[]> {
  const maker = filters.maker ?? null;
  const memcmps = maker ? [memcmp(RFQ_MAKER_OFFSET, maker)] : [];
  return useProgramAccounts(
    "rfq",
    normaliseRfq,
    memcmps,
    ["rfq", env.programId.toBase58(), "all", maker?.toBase58() ?? null],
    true,
  );
}

/** Every quote committed against one RFQ. */
export function useQuoteAccountsForRfq(
  rfq: PublicKey | null,
): UseQueryResult<ProgramAccount<QuoteAccount>[]> {
  const memcmps = rfq ? [memcmp(QUOTE_RFQ_OFFSET, rfq)] : [];
  return useProgramAccounts(
    "quote",
    normaliseQuote,
    memcmps,
    ["quote", env.programId.toBase58(), "all", "rfq", rfq?.toBase58() ?? null],
    rfq !== null,
  );
}

/** Every quote a given taker submitted, across all RFQs. */
export function useQuoteAccountsByTaker(
  taker: PublicKey | null,
): UseQueryResult<ProgramAccount<QuoteAccount>[]> {
  const memcmps = taker ? [memcmp(QUOTE_TAKER_OFFSET, taker)] : [];
  return useProgramAccounts(
    "quote",
    normaliseQuote,
    memcmps,
    ["quote", env.programId.toBase58(), "all", "taker", taker?.toBase58() ?? null],
    taker !== null,
  );
}

/** Claimable / claimed facilitator reward trackers owned by one facilitator. */
export function useFacilitatorRewardTrackersByFacilitator(
  facilitator: PublicKey | null,
): UseQueryResult<ProgramAccount<FacilitatorRewardTrackerAccount>[]> {
  const memcmps = facilitator ? [memcmp(FACILITATOR_REWARD_FACILITATOR_OFFSET, facilitator)] : [];
  return useProgramAccounts(
    "facilitatorRewardTracker",
    normaliseFacilitatorRewardTracker,
    memcmps,
    ["facilitatorRewardTracker", env.programId.toBase58(), "all", facilitator?.toBase58() ?? null],
    facilitator !== null,
  );
}
