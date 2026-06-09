import { useLocation } from "react-router";
import { useConfigAccount } from "@/chain/accounts/config";
import { useCluster } from "@/app/providers/ClusterProvider";
import { CLUSTER_LABELS } from "@/chain/cluster";
import { env } from "@/chain/env";
import { deriveConfigPda } from "@/chain/pda";

function formatPubkey(pk: { toBase58(): string }): string {
  const s = pk.toBase58();
  return `${s.slice(0, 8)}…${s.slice(-8)}`;
}

export function DevConfigPanel() {
  const location = useLocation();
  const { cluster } = useCluster();
  const query = useConfigAccount();
  const [configPda] = deriveConfigPda(env.programId);

  const params = new URLSearchParams(location.search);
  if (!import.meta.env.DEV || params.get("debug") !== "1") return null;

  const rows: Array<[string, string]> = query.data
    ? [
        ["admin", formatPubkey(query.data.admin)],
        ["usdcMint", formatPubkey(query.data.usdcMint)],
        ["treasuryWallet", formatPubkey(query.data.treasuryWallet)],
        ["liquidityGuard", formatPubkey(query.data.liquidityGuard)],
        ["facilitatorFeeBps", String(query.data.facilitatorFeeBps)],
        ["bump", String(query.data.bump)],
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-4">
      <details
        open
        className="bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-mono text-white/70"
      >
        <summary className="cursor-pointer text-white/80 select-none">
          dev · Config PDA {formatPubkey(configPda)}{" "}
          {query.isLoading
            ? "(loading…)"
            : query.isError
              ? `(error: ${(query.error as Error).message})`
              : query.data
                ? ""
                : `(not initialized on ${CLUSTER_LABELS[cluster]} — run init_config)`}
        </summary>
        <table className="mt-3 w-full">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-t border-white/5">
                <td className="py-1 pr-4 text-white/50">{k}</td>
                <td className="py-1">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
