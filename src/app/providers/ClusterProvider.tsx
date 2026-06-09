import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useClusterState } from "@/chain/cluster";
import type { Cluster } from "@/chain/env";

interface ClusterContextValue {
  cluster: Cluster;
  setCluster: (c: Cluster) => void;
}

const ClusterContext = createContext<ClusterContextValue | null>(null);

export function ClusterProvider({ children }: { children: ReactNode }) {
  const { cluster, setCluster } = useClusterState();
  const value = useMemo(() => ({ cluster, setCluster }), [cluster, setCluster]);
  return <ClusterContext.Provider value={value}>{children}</ClusterContext.Provider>;
}

export function useCluster(): ClusterContextValue {
  const ctx = useContext(ClusterContext);
  if (!ctx) throw new Error("useCluster must be used inside <ClusterProvider>");
  return ctx;
}
