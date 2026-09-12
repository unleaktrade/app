import type { QueryKey } from "@tanstack/react-query";

// Query-key builders for every on-chain read. All keys start with
// [account, programId] — the prefix the write-path invalidation in
// instructions/shared.ts matches on — followed by the RPC endpoint. The
// program id is identical on devnet and localnet, so without the endpoint a
// cluster switch served the previous cluster's accounts straight from cache.

/** Single-account read: [account, programId, endpoint, address]. */
export function accountKey(
  account: string,
  programId: string,
  endpoint: string,
  address: string | null,
): QueryKey {
  return [account, programId, endpoint, address];
}

/** getProgramAccounts list: [account, programId, endpoint, "all", ...facets]. */
export function listKey(
  account: string,
  programId: string,
  endpoint: string,
  ...facets: (string | null)[]
): QueryKey {
  return [account, programId, endpoint, "all", ...facets];
}

/**
 * fetchMultiple read: [account, programId, endpoint, "byKeys", ...sorted].
 * Sorting makes the key order-insensitive so the same set of addresses hits
 * the same cache entry however the caller assembled the array.
 */
export function byKeysKey(
  account: string,
  programId: string,
  endpoint: string,
  keys: string[],
): QueryKey {
  return [account, programId, endpoint, "byKeys", ...[...keys].sort()];
}
