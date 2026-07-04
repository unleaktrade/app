import { Globe, FlaskConical, TriangleAlert, TerminalSquare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/app/components/ui/select";
import { useCluster } from "@/app/providers/ClusterProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import { CLUSTER_LABELS } from "@/chain/cluster";
import type { Cluster } from "@/chain/env";
import { cn } from "@/app/components/ui/utils";

// Network identity is conveyed by icon + label, NOT a colored dot — dots are
// reserved for live status (the guard chip). Color appears only where it
// carries meaning: Mainnet Beta gets the amber warning treatment because real
// funds are at stake there.
const CLUSTER_META: Record<
  Cluster,
  { Icon: typeof Globe; iconClass: string; description: string; warn?: boolean }
> = {
  devnet: {
    Icon: FlaskConical,
    iconClass: "text-white/50",
    description: "test tokens, safe to experiment",
  },
  "mainnet-beta": {
    Icon: TriangleAlert,
    iconClass: "text-state-selected",
    description: "real funds",
    warn: true,
  },
  localnet: {
    Icon: TerminalSquare,
    iconClass: "text-white/50",
    description: "local validator",
  },
};

export function ClusterSwitcher() {
  const { cluster, setCluster } = useCluster();
  const { signOut } = useAuth();
  const meta = CLUSTER_META[cluster];

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
        aria-label="Select Solana network"
        className={cn(
          "h-9 gap-2 rounded-xl border-white/10 bg-white/5 px-3 text-xs font-medium text-white/70 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white data-[state=open]:bg-white/10",
          // Real-funds network: the whole chip warns, not just the icon.
          meta.warn && "border-state-selected/40 text-state-selected hover:text-state-selected",
        )}
      >
        {/* Trigger content is rendered directly (no SelectValue mirroring) so
            the chip and the dropdown rows can differ — rows carry
            descriptions the chip shouldn't repeat. */}
        <meta.Icon className={cn("h-3.5 w-3.5", meta.iconClass)} />
        {CLUSTER_LABELS[cluster]}
      </SelectTrigger>
      <SelectContent className="rounded-xl border-white/10 bg-surface-raised/90 text-white shadow-2xl backdrop-blur-xl">
        {(Object.keys(CLUSTER_LABELS) as Cluster[]).map((c) => {
          const m = CLUSTER_META[c];
          return (
            <SelectItem
              key={c}
              value={c}
              className="rounded-lg py-2 text-white/80 focus:bg-white/10 focus:text-white"
            >
              <span className="flex items-center gap-2.5">
                <m.Icon className={cn("h-4 w-4 shrink-0", m.iconClass)} />
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-sm">{CLUSTER_LABELS[c]}</span>
                  <span
                    className={cn(
                      "text-[10px]",
                      m.warn ? "text-state-selected/80" : "text-white/35",
                    )}
                  >
                    {m.description}
                  </span>
                </span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
