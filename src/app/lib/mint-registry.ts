// Framework-free external store of on-chain mint decimals.
//
// resolveTokenMeta (tokens.ts) is synchronous and called from render in ~30
// places, so decimals discovered from the chain (getMultipleAccountsInfo on the
// mints of the loaded RFQs — see useMintRegistryWarmup) are published here and
// read synchronously. Components subscribe through useResolveTokenMeta
// (useSyncExternalStore) so they re-render once decimals arrive. Registrations
// are append-only and idempotent; identical data never notifies.

export interface MintInfo {
  decimals: number;
}

/** SPL Token `Mint` account: mintAuthorityOption(4) + mintAuthority(32) + supply(8) → decimals u8 at 44; total 82 bytes. */
const MINT_ACCOUNT_SIZE = 82;
const MINT_DECIMALS_OFFSET = 44;

// The snapshot is replaced (never mutated) on each change so it can serve as
// a useSyncExternalStore snapshot and a memo dependency.
let registry: ReadonlyMap<string, MintInfo> = new Map();
const listeners = new Set<() => void>();
let version = 0;

export type MintRegistrySnapshot = ReadonlyMap<string, MintInfo>;

export function getMintRegistrySnapshot(): MintRegistrySnapshot {
  return registry;
}

export function getMintInfo(mint: string): MintInfo | undefined {
  return registry.get(mint);
}

export function getMintRegistryVersion(): number {
  return version;
}

export function subscribeMintRegistry(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Publish decoded mint infos; notifies subscribers only when something new landed. */
export function registerMintInfos(entries: Record<string, MintInfo>): void {
  let next: Map<string, MintInfo> | null = null;
  for (const [mint, info] of Object.entries(entries)) {
    const existing = registry.get(mint);
    if (existing && existing.decimals === info.decimals) continue;
    next ??= new Map(registry);
    next.set(mint, info);
  }
  if (next === null) return;
  registry = next;
  version += 1;
  for (const listener of listeners) listener();
}

/** Decimals from raw Mint account bytes, or null when the data is not a Mint. */
export function decodeMintDecimals(data: Uint8Array): number | null {
  if (data.length < MINT_ACCOUNT_SIZE) return null;
  const decimals = data[MINT_DECIMALS_OFFSET];
  return decimals === undefined ? null : decimals;
}

export function __resetMintRegistryForTests(): void {
  registry = new Map();
  listeners.clear();
  version = 0;
}
