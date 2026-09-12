import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { persistCluster, readPersistedCluster } from "@/chain/cluster";
import { env, type Cluster } from "@/chain/env";

interface ClusterContextValue {
  cluster: Cluster;
  setCluster: (c: Cluster) => void;
}

const ClusterContext = createContext<ClusterContextValue | null>(null);

/**
 * Single owner of the active cluster. The state lives here (not in a reusable
 * hook) so no component can accidentally fork its own copy — every consumer
 * goes through useCluster(). Persistence happens in the setter, not an effect,
 * so the stored value is only ever written on an actual change.
 */
export function ClusterProvider({ children }: { children: ReactNode }) {
  const [cluster, setClusterState] = useState<Cluster>(
    () => readPersistedCluster() ?? env.defaultCluster,
  );
  const setCluster = useCallback((c: Cluster) => {
    persistCluster(c);
    setClusterState(c);
  }, []);
  const value = useMemo(() => ({ cluster, setCluster }), [cluster, setCluster]);
  return <ClusterContext.Provider value={value}>{children}</ClusterContext.Provider>;
}

export function useCluster(): ClusterContextValue {
  const ctx = useContext(ClusterContext);
  if (!ctx) throw new Error("useCluster must be used inside <ClusterProvider>");
  return ctx;
}
