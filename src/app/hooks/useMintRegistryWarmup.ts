import { useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import {
  decodeMintDecimals,
  getMintInfo,
  registerMintInfos,
  type MintInfo,
} from "@/app/lib/mint-registry";
import { resolveTokenMeta } from "@/app/lib/tokens";

// getMultipleAccountsInfo accepts at most 100 addresses per call.
const CHUNK = 100;

/**
 * Read the decimals of every mint the static sources (seed manifest / catalog)
 * don't know from their on-chain Mint accounts, once, and publish them to the
 * mint registry. One batched RPC per distinct set of unknown mints; the query
 * is keyed by endpoint so clusters never share results.
 */
export function useMintRegistryWarmup(mints: string[]): void {
  const { connection } = useConnection();

  const unknown = useMemo(() => {
    const set = new Set<string>();
    for (const mint of mints) {
      if (getMintInfo(mint)) continue;
      if (resolveTokenMeta(mint).decimals !== 0) continue;
      set.add(mint);
    }
    return [...set].sort();
    // The registry is consulted on purpose: once a mint is published this
    // list shrinks and the query key stops changing.
  }, [mints]);

  useQuery({
    queryKey: ["mint-info", connection.rpcEndpoint, ...unknown],
    enabled: unknown.length > 0,
    staleTime: Infinity,
    queryFn: async (): Promise<Record<string, MintInfo>> => {
      const out: Record<string, MintInfo> = {};
      for (let i = 0; i < unknown.length; i += CHUNK) {
        const slice = unknown.slice(i, i + CHUNK);
        const infos = await connection.getMultipleAccountsInfo(slice.map((m) => new PublicKey(m)));
        infos.forEach((info, j) => {
          const mint = slice[j];
          const decimals = info ? decodeMintDecimals(info.data) : null;
          if (mint !== undefined && decimals !== null) out[mint] = { decimals };
        });
      }
      registerMintInfos(out);
      return out;
    },
  });
}
