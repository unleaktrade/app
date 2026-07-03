// Bulk point-reads for the rewards derivation: given the settlement / winning
// quote keys referenced by a set of Settled RFQs, fetch them all in one
// `fetchMultiple` round-trip and hand back a base58-keyed Map. Settled
// accounts are immutable, so — unlike useDecodedAccount — there is no
// websocket subscription here; freshness follows the same TanStack defaults
// the list hooks use (refetch-on-focus + the shared write-path invalidation).

import type { PublicKey } from "@solana/web3.js";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { env } from "@/chain/env";
import { useSettlementProgram } from "@/chain/program";
import { normaliseSettlement, type RawSettlement, type SettlementAccount } from "./settlement";
import { normaliseQuote, type RawQuote, type QuoteAccount } from "./quote";

interface FetchMultipleApi<TRaw> {
  fetchMultiple(addresses: PublicKey[]): Promise<(TRaw | null)[]>;
}

/**
 * Shared fetchMultiple plumbing. Query keys follow the
 * ["<account>", "byKeys", programId, ...sortedBase58] convention — sorting
 * makes the key order-insensitive so the same set of keys hits the same cache
 * entry regardless of how the caller assembled the array. Accounts that don't
 * exist (fetchMultiple returns null slots) are skipped silently; consumers
 * tolerate missing map entries.
 */
function useAccountsByKeys<TRaw, T>(
  accountKey: string,
  normalise: (raw: TRaw) => T,
  keys: PublicKey[],
): UseQueryResult<Map<string, T>> {
  const program = useSettlementProgram();
  const base58Keys = keys.map((k) => k.toBase58());

  return useQuery<Map<string, T>>({
    queryKey: [accountKey, "byKeys", env.programId.toBase58(), ...[...base58Keys].sort()],
    enabled: program !== null && keys.length > 0,
    queryFn: async () => {
      const result = new Map<string, T>();
      if (!program || keys.length === 0) return result;
      const api = (
        program.account as unknown as Record<string, FetchMultipleApi<TRaw> | undefined>
      )[accountKey];
      if (!api) throw new Error(`Unknown account namespace: ${accountKey}`);
      const raws = await api.fetchMultiple(keys);
      raws.forEach((raw, i) => {
        const key = base58Keys[i];
        if (raw !== null && raw !== undefined && key !== undefined) {
          result.set(key, normalise(raw));
        }
      });
      return result;
    },
  });
}

/** Settlement accounts for a set of keys → Map<base58, SettlementAccount>. */
export function useSettlementAccountsByKeys(
  keys: PublicKey[],
): UseQueryResult<Map<string, SettlementAccount>> {
  return useAccountsByKeys<RawSettlement, SettlementAccount>(
    "settlement",
    normaliseSettlement,
    keys,
  );
}

/** Quote accounts for a set of keys → Map<base58, QuoteAccount>. */
export function useQuoteAccountsByKeys(
  keys: PublicKey[],
): UseQueryResult<Map<string, QuoteAccount>> {
  return useAccountsByKeys<RawQuote, QuoteAccount>("quote", normaliseQuote, keys);
}
