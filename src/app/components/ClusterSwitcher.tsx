import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { useCluster } from "@/app/providers/ClusterProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import { CLUSTER_LABELS } from "@/chain/cluster";
import type { Cluster } from "@/chain/env";

const CLUSTER_DOT_CLASSES: Record<Cluster, string> = {
  devnet: "bg-emerald-400",
  "mainnet-beta": "bg-amber-400",
  localnet: "bg-white/40",
};

export function ClusterSwitcher() {
  const { cluster, setCluster } = useCluster();
  const { signOut } = useAuth();

  const handleChange = async (next: string) => {
    if (next === cluster) return;
    if (next !== "devnet" && next !== "mainnet-beta" && next !== "localnet") return;
    // Invalidate the sig first so a devnet signature can't leak onto mainnet.
    await signOut();
    setCluster(next);
  };

  return (
    <Select value={cluster} onValueChange={(v) => void handleChange(v)}>
      <SelectTrigger
        size="sm"
        aria-label="Select Solana cluster"
        className="h-9 gap-2 rounded-xl border-white/10 bg-white/5 px-3 text-xs font-medium text-white/70 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white data-[state=open]:bg-white/10"
      >
        <span className={`inline-block h-2 w-2 rounded-full ${CLUSTER_DOT_CLASSES[cluster]}`} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-white/10 bg-surface-raised/90 text-white shadow-2xl backdrop-blur-xl">
        {(Object.keys(CLUSTER_LABELS) as Cluster[]).map((c) => (
          <SelectItem
            key={c}
            value={c}
            className="rounded-lg text-white/80 focus:bg-white/10 focus:text-white"
          >
            <span className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${CLUSTER_DOT_CLASSES[c]}`} />
              {CLUSTER_LABELS[c]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
