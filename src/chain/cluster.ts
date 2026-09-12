import { clusterApiUrl } from "@solana/web3.js";
import { env, type Cluster } from "@/chain/env";

export const CLUSTER_LABELS: Record<Cluster, string> = {
  devnet: "Devnet",
  "mainnet-beta": "Mainnet Beta",
  localnet: "Localnet",
};

const STORAGE_KEY = "unleak.cluster";

export function endpointFor(c: Cluster): string {
  const override = env.rpcUrl[c];
  if (override) return override;
  if (c === "localnet") return "http://localhost:8899";
  return clusterApiUrl(c);
}

/**
 * Inverse of endpointFor for the Connection actually in use: exact match on a
 * configured endpoint first, then host hints for keyed / custom URLs. Lets the
 * chain layer build cluster-aware explorer links and cache keys without
 * importing the app-level ClusterProvider.
 */
export function clusterFromEndpoint(endpoint: string): Cluster {
  for (const c of ["localnet", "devnet", "mainnet-beta"] as const) {
    if (endpointFor(c) === endpoint) return c;
  }
  if (/localhost|127\.0\.0\.1/.test(endpoint)) return "localnet";
  if (/devnet/.test(endpoint)) return "devnet";
  return "mainnet-beta";
}

/** Solscan transaction URL with the right cluster suffix (localnet = custom). */
export function solscanTxUrl(signature: string, cluster: Cluster): string {
  const suffix =
    cluster === "devnet" ? "?cluster=devnet" : cluster === "localnet" ? "?cluster=custom" : "";
  return `https://solscan.io/tx/${signature}${suffix}`;
}

/** Persisted cluster choice, or null when absent / invalid / storage blocked. */
export function readPersistedCluster(): Cluster | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "devnet" || raw === "mainnet-beta" || raw === "localnet") return raw;
    return null;
  } catch {
    return null;
  }
}

export function persistCluster(c: Cluster): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, c);
  } catch {
    // Storage blocked (private mode / policy) — the in-memory choice still applies.
  }
}
