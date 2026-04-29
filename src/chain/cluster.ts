import { useCallback, useEffect, useState } from "react";
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

function readPersisted(): Cluster | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === "devnet" || raw === "mainnet-beta" || raw === "localnet") return raw;
  return null;
}

export function useClusterState(): { cluster: Cluster; setCluster: (c: Cluster) => void } {
  const [cluster, setClusterState] = useState<Cluster>(() => readPersisted() ?? env.defaultCluster);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, cluster);
  }, [cluster]);

  const setCluster = useCallback((c: Cluster) => setClusterState(c), []);
  return { cluster, setCluster };
}
