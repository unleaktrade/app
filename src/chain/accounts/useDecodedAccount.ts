import { useMemo } from "react";
import type { PublicKey } from "@solana/web3.js";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useConnection } from "@solana/wallet-adapter-react";
import { env } from "@/chain/env";
import { useSettlementProgram } from "@/chain/program";
import { useAccountSubscription } from "@/chain/accountSubscription";
import { accountKey } from "./queryKeys";

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
 * Phase 1: TanStack query keyed by [account, programId, endpoint, address] kept fresh
 * by a websocket account subscription — no polling.
 */
export function useDecodedAccount<TRaw, T>(
  codec: AccountCodec<TRaw, T>,
  address: PublicKey | null,
): UseQueryResult<T | null> {
  const program = useSettlementProgram();
  const { connection } = useConnection();
  const { accountKey: accountName, normalise } = codec;

  const address58 = address?.toBase58() ?? null;
  const endpoint = connection.rpcEndpoint;
  const queryKey = useMemo(
    () => accountKey(accountName, env.programId.toBase58(), endpoint, address58),
    [accountName, endpoint, address58],
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
      const api = accountsApi[accountName];
      if (!api) throw new Error(`Unknown account namespace: ${accountName}`);
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
      return normalise(coder.accounts.decode<TRaw>(accountName, data));
    };
  }, [program, accountName, normalise]);

  useAccountSubscription(program && address ? address : null, decoder, queryKey);

  return query;
}
