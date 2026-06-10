// Jupiter lite-api lookups: token metadata + optional per-amount USD price.
// Mainnet-only — Jupiter indexes mainnet mints; devnet/localnet fall back to
// the static catalog in tokens.ts. Prices are NEVER aggregated across tokens
// (project rule: no USD oracle for totals).

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { Cluster } from "@/chain/env";
import { findTokenByMint, type Token } from "./tokens";

const TOKEN_API = "https://lite-api.jup.ag/tokens/v2/search?query=";
const PRICE_API = "https://lite-api.jup.ag/price/v3?ids=";

interface JupiterTokenResponse {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  icon?: string;
}

export interface TokenMeta {
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

function staticMeta(mint: string): TokenMeta | null {
  const token: Token | undefined = findTokenByMint(mint);
  if (!token) return null;
  return {
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    ...(token.logoURI !== undefined ? { logoURI: token.logoURI } : {}),
  };
}

/**
 * Token metadata for a mint: Jupiter token list on mainnet, static catalog
 * elsewhere (and as the mainnet fallback when Jupiter has no entry).
 */
export function useTokenMeta(
  mint: string | null,
  cluster: Cluster,
): UseQueryResult<TokenMeta | null> {
  return useQuery({
    queryKey: ["token-meta", cluster, mint],
    enabled: mint !== null,
    staleTime: Infinity, // metadata is immutable for practical purposes
    queryFn: async (): Promise<TokenMeta | null> => {
      if (!mint) return null;
      if (cluster !== "mainnet-beta") return staticMeta(mint);
      try {
        const res = await fetch(`${TOKEN_API}${encodeURIComponent(mint)}`);
        if (!res.ok) return staticMeta(mint);
        const list = (await res.json()) as JupiterTokenResponse[];
        const hit = list.find((t) => t.id === mint);
        if (!hit) return staticMeta(mint);
        return {
          symbol: hit.symbol,
          name: hit.name,
          decimals: hit.decimals,
          ...(hit.icon !== undefined ? { logoURI: hit.icon } : {}),
        };
      } catch {
        return staticMeta(mint);
      }
    },
  });
}

/**
 * USD price for one mint (mainnet only — null elsewhere). Opt-in, used for
 * single-amount hints only; never aggregate across tokens.
 */
export function useUsdPrice(
  mint: string | null,
  cluster: Cluster,
  enabled: boolean,
): UseQueryResult<number | null> {
  return useQuery({
    queryKey: ["usd-price", mint],
    enabled: enabled && mint !== null && cluster === "mainnet-beta",
    staleTime: 60_000,
    queryFn: async (): Promise<number | null> => {
      if (!mint) return null;
      const res = await fetch(`${PRICE_API}${encodeURIComponent(mint)}`);
      if (!res.ok) return null;
      const body = (await res.json()) as Record<string, { usdPrice?: number } | undefined>;
      return body[mint]?.usdPrice ?? null;
    },
  });
}
