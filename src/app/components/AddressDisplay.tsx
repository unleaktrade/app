import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useClusterState } from "@/chain/cluster";
import { truncateAddress } from "@/app/lib/format";
import { cn } from "@/app/components/ui/utils";

interface AddressDisplayProps {
  address: string;
  /** Visible characters on each side of the ellipsis. */
  visible?: number;
  className?: string;
}

/**
 * Truncated mono address with copy-to-clipboard and a cluster-aware Solscan
 * link (devnet adds ?cluster=devnet; localnet gets no explorer link).
 */
export function AddressDisplay({ address, visible = 4, className }: AddressDisplayProps) {
  const { cluster } = useClusterState();
  const [copied, setCopied] = useState(false);

  const solscanUrl =
    cluster === "localnet"
      ? null
      : `https://solscan.io/account/${address}${cluster === "devnet" ? "?cluster=devnet" : ""}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy address");
    }
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="font-mono text-sm text-white/70" title={address}>
        {truncateAddress(address, visible)}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy address"
        className="-m-1.5 rounded p-1.5 text-white/40 transition-colors hover:text-white/80"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-state-settled" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      {solscanUrl && (
        <a
          href={solscanUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on Solscan"
          className="-m-1.5 rounded p-1.5 text-white/40 transition-colors hover:text-white/80"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </span>
  );
}
