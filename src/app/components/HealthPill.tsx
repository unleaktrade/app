import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "@/chain/liquidityGuard";
import { useConfigAccount } from "@/chain/accounts/config";
import { useCluster } from "@/app/providers/ClusterProvider";
import { CLUSTER_LABELS } from "@/chain/cluster";

const NETWORK_MAP: Record<string, string> = {
  Devnet: "devnet",
  Mainnet: "mainnet-beta",
  Localnet: "localnet",
};

type PillState = "loading" | "ok" | "mismatch" | "down";

export function HealthPill() {
  const { cluster } = useCluster();
  const config = useConfigAccount();
  const query = useQuery({
    queryKey: ["lg-health", cluster],
    queryFn: ({ signal }) => fetchHealth(cluster, { signal }),
    refetchInterval: 15_000,
    retry: 0,
  });

  const expectedPubkey = config.data?.liquidityGuard.toBase58() ?? null;
  const pubkeyDrift =
    !!expectedPubkey && !!query.data && expectedPubkey !== query.data.servicePubkey;
  const networkDrift = !!query.data && NETWORK_MAP[query.data.network] !== cluster;

  const state: PillState = (() => {
    if (query.isError) return "down";
    if (!query.data) return "loading";
    if (pubkeyDrift || networkDrift) return "mismatch";
    return "ok";
  })();

  const dotClass =
    state === "ok"
      ? "bg-emerald-400"
      : state === "mismatch"
        ? "bg-amber-400"
        : state === "down"
          ? "bg-red-500"
          : "bg-white/30 animate-pulse";

  const title = (() => {
    if (state === "down") return "liquidity-guard unreachable";
    if (state === "loading") return "checking liquidity-guard…";
    const data = query.data;
    if (!data) return "";
    const parts = [
      `service: ${data.status}`,
      `network: ${data.network}`,
      `service_pubkey: ${data.servicePubkey.slice(0, 6)}…${data.servicePubkey.slice(-4)}`,
      expectedPubkey
        ? `Config.liquidity_guard: ${expectedPubkey.slice(0, 6)}…${expectedPubkey.slice(-4)}`
        : "Config not loaded (connect wallet to verify)",
      data.skipFundChecks ? "skipFundChecks: true" : null,
      pubkeyDrift ? "PUBKEY DRIFT vs Config.liquidity_guard" : null,
      networkDrift ? `cluster mismatch (app: ${CLUSTER_LABELS[cluster]})` : null,
    ].filter(Boolean);
    return parts.join(" · ");
  })();

  const stateText =
    state === "ok" ? "ok" : state === "mismatch" ? "drift" : state === "down" ? "down" : "…";

  return (
    <span
      role="status"
      aria-label={title}
      title={title}
      className="hidden md:inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-white/60"
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
      lg · <span className="text-white/50 normal-case">{stateText}</span>
    </span>
  );
}
