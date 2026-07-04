import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert, ShieldX, RefreshCw } from "lucide-react";
import { fetchHealth, type HealthResponse } from "@/chain/liquidityGuard";
import { useConfigAccount } from "@/chain/accounts/config";
import { useCluster } from "@/app/providers/ClusterProvider";
import { CLUSTER_LABELS } from "@/chain/cluster";
import type { Cluster } from "@/chain/env";
import { GlassPopover } from "@/app/components/GlassPopover";
import { AddressDisplay } from "@/app/components/AddressDisplay";
import { timeAgo } from "@/app/lib/notifications";
import { cn } from "@/app/components/ui/utils";

const NETWORK_MAP: Record<string, string> = {
  Devnet: "devnet",
  Mainnet: "mainnet-beta",
  Localnet: "localnet",
};

export type GuardState = "loading" | "ok" | "mismatch" | "down";

const STATE_META: Record<
  GuardState,
  { dot: string; text: string; label: string; Icon: typeof ShieldCheck }
> = {
  ok: {
    dot: "bg-state-settled",
    text: "text-state-settled",
    label: "Protected",
    Icon: ShieldCheck,
  },
  mismatch: {
    dot: "bg-state-selected",
    text: "text-state-selected",
    label: "Drift",
    Icon: ShieldAlert,
  },
  down: {
    dot: "bg-state-incomplete",
    text: "text-state-incomplete",
    label: "Offline",
    Icon: ShieldX,
  },
  loading: {
    dot: "bg-white/30 animate-pulse",
    text: "text-white/50",
    label: "Checking",
    Icon: RefreshCw,
  },
};

export interface GuardStatusViewProps {
  state: GuardState;
  health: HealthResponse | null;
  /** Base58 Config.liquidity_guard, or null while the wallet/Config is absent. */
  expectedPubkey: string | null;
  cluster: Cluster;
  /** Unix ms of the last successful/attempted check, or null. */
  checkedAt: number | null;
  /** Chip stretches full-width (mobile drawer). */
  block?: boolean;
}

/**
 * Presentational guard-status control: glass chip + details popover. Pure
 * props in, so /dev/stories and RTL can render every state without touching
 * the network. The wrapper below feeds it live data.
 */
export function GuardStatusView({
  state,
  health,
  expectedPubkey,
  cluster,
  checkedAt,
  block = false,
}: GuardStatusViewProps) {
  const [open, setOpen] = useState(false);
  const meta = STATE_META[state];
  const pubkeyDrift = !!expectedPubkey && !!health && expectedPubkey !== health.servicePubkey;
  const networkDrift = !!health && NETWORK_MAP[health.network] !== cluster;

  return (
    <div className={cn("relative", block ? "block" : "inline-block")}>
      <button
        type="button"
        aria-label={`Settlement guard: ${meta.label}`}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/70 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white",
          block && "w-full justify-center",
        )}
      >
        <span className="relative flex h-2 w-2">
          {state === "ok" && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-state-settled/50 motion-reduce:hidden" />
          )}
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", meta.dot)} />
        </span>
        <meta.Icon className={cn("h-3.5 w-3.5", meta.text)} />
        <span className="hidden xl:inline">Guard</span>
      </button>

      {open && (
        <GlassPopover
          label="Settlement guard status"
          onClose={() => setOpen(false)}
          className="w-80 p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <meta.Icon className={cn("h-4 w-4", meta.text)} />
            <span className="font-display text-sm font-semibold text-white">Settlement guard</span>
            <span className={cn("ml-auto text-xs font-medium", meta.text)}>{meta.label}</span>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-white/40">
            An attestation service signs a funds check before every sealed quote. Its key is
            published on-chain, so every proof is verifiable locally.
          </p>
          <div className="space-y-2 text-xs">
            <StatusRow label="Service" ok={state !== "down"}>
              {state === "down"
                ? "unreachable"
                : state === "loading"
                  ? "checking…"
                  : (health?.status ?? "—")}
            </StatusRow>
            <StatusRow label="Network" ok={!networkDrift} warn={networkDrift}>
              {health
                ? `${health.network}${networkDrift ? ` ≠ app (${CLUSTER_LABELS[cluster]})` : ""}`
                : CLUSTER_LABELS[cluster]}
            </StatusRow>
            <div className="flex items-start justify-between gap-3">
              <span className="text-white/40">Guard key</span>
              <span className="text-right">
                {health ? (
                  <AddressDisplay address={health.servicePubkey} />
                ) : (
                  <span className="text-white/30">—</span>
                )}
              </span>
            </div>
            <StatusRow
              label="On-chain match"
              ok={!!expectedPubkey && !pubkeyDrift}
              warn={pubkeyDrift}
            >
              {expectedPubkey === null
                ? "connect a wallet to verify"
                : pubkeyDrift
                  ? "KEY DRIFT vs on-chain Config"
                  : "matches Config.liquidity_guard"}
            </StatusRow>
            {health?.skipFundChecks && (
              <StatusRow label="Fund checks" warn>
                skipped (test mode)
              </StatusRow>
            )}
          </div>
          {checkedAt !== null && (
            <div className="mt-3 border-t border-white/10 pt-2 text-[10px] text-white/30">
              Checked {timeAgo(checkedAt)} · re-checks every 15s
            </div>
          )}
        </GlassPopover>
      )}
    </div>
  );
}

function StatusRow({
  label,
  children,
  ok = false,
  warn = false,
}: {
  label: string;
  children: React.ReactNode;
  ok?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-white/40">{label}</span>
      <span
        className={cn(
          "text-right",
          warn ? "text-state-selected" : ok ? "text-state-settled" : "text-white/60",
        )}
      >
        {children}
      </span>
    </div>
  );
}

/** Live wrapper: 15s health poll + on-chain Config cross-check (issue #16 —
 * production-visible since the control-rail redesign). */
export function HealthPill({ block = false }: { block?: boolean }) {
  const { cluster } = useCluster();
  const config = useConfigAccount();
  const query = useQuery({
    queryKey: ["lg-health", cluster],
    queryFn: ({ signal }) => fetchHealth(cluster, { signal }),
    refetchInterval: 15_000,
    retry: 0,
  });

  const expectedPubkey = config.data?.liquidityGuard.toBase58() ?? null;
  const health = query.data ?? null;
  const pubkeyDrift = !!expectedPubkey && !!health && expectedPubkey !== health.servicePubkey;
  const networkDrift = !!health && NETWORK_MAP[health.network] !== cluster;

  const state: GuardState = query.isError
    ? "down"
    : !health
      ? "loading"
      : pubkeyDrift || networkDrift
        ? "mismatch"
        : "ok";

  return (
    <GuardStatusView
      state={state}
      health={health}
      expectedPubkey={expectedPubkey}
      cluster={cluster}
      checkedAt={query.dataUpdatedAt || query.errorUpdatedAt || null}
      block={block}
    />
  );
}
