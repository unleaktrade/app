import { useMemo, useSyncExternalStore } from "react";
import { getMintRegistrySnapshot, subscribeMintRegistry } from "@/app/lib/mint-registry";
import { resolveTokenMeta, type ResolvedToken } from "@/app/lib/tokens";

/**
 * Render-safe access to resolveTokenMeta: subscribes to the mint registry so
 * the component re-renders when on-chain decimals for a previously unknown
 * mint arrive (useMintRegistryWarmup). The returned resolver is a pure
 * function of the registry snapshot, so it is a correct dependency for memos
 * that derive display values from decoded rows.
 */
export function useResolveTokenMeta(): (mint: string) => ResolvedToken {
  const snapshot = useSyncExternalStore(
    subscribeMintRegistry,
    getMintRegistrySnapshot,
    getMintRegistrySnapshot,
  );
  return useMemo(() => (mint: string) => resolveTokenMeta(mint, snapshot), [snapshot]);
}
