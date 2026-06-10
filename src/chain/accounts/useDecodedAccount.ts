import { useMemo } from "react";
import type { PublicKey } from "@solana/web3.js";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { env } from "@/chain/env";
import { useSettlementProgram } from "@/chain/program";
import { useAccountSubscription } from "@/chain/accountSubscription";

export interface AccountCodec<TRaw, T> {
  /**
   * Account name in camelCase (e.g. "rfq"). Anchor's Program camelCases the
   * whole IDL at construction, so this same key addresses both the
   * `program.account` namespace and the BorshAccountsCoder.
   */
  accountKey: string;
  /** Module-level pure function: raw Anchor shape → validated normalised shape. */
  normalise: (raw: TRaw) => T;
}

/**
 * Shared fetch + live-subscription plumbing for every settlement-engine
 * account hook. Mirrors the pattern established by useConfigAccount in
 * Phase 1: TanStack query keyed by [account, programId, address] kept fresh
 * by a websocket account subscription — no polling.
 */
export function useDecodedAccount<TRaw, T>(
  codec: AccountCodec<TRaw, T>,
  address: PublicKey | null,
): UseQueryResult<T | null> {
  const program = useSettlementProgram();
  const { accountKey, normalise } = codec;

  const address58 = address?.toBase58() ?? null;
  const queryKey = useMemo(
    () => [accountKey, env.programId.toBase58(), address58],
    [accountKey, address58],
  );

  const query = useQuery<T | null>({
    queryKey,
    enabled: program !== null && address !== null,
    queryFn: async () => {
      if (!program || !address) return null;
      const accountsApi = program.account as unknown as Record<
        string,
        { fetchNullable(address: PublicKey): Promise<TRaw | null> } | undefined
      >;
      const api = accountsApi[accountKey];
      if (!api) throw new Error(`Unknown account namespace: ${accountKey}`);
      const raw = await api.fetchNullable(address);
      return raw ? normalise(raw) : null;
    },
  });

  // Decoding path used by the websocket subscription. Program camelCases the
  // IDL before building its coder, so the coder is keyed by the camelCase
  // account name — same key as the fetch-by-name API above. (Decoding with
  // the capitalized IDL name throws "Account not found".)
  const decoder = useMemo(() => {
    return (data: Buffer): T => {
      if (!program) throw new Error("program not ready");
      const coder = program.coder as unknown as {
        accounts: { decode<TDecoded>(name: string, data: Buffer): TDecoded };
      };
      return normalise(coder.accounts.decode<TRaw>(accountKey, data));
    };
  }, [program, accountKey, normalise]);

  useAccountSubscription(program && address ? address : null, decoder, queryKey);

  return query;
}
