// Waitlist → beta handoff guidance (#67). Explains why a wallet may hold no
// Unleak USDC (uUSDC — the devnet-only test token) (registered a different
// wallet, distribution still pending, wrong cluster) and where to check
// status — instead of a generic "insufficient balance" dead end.
//
// Copy rules (locked by #67, naming by PR #71): role-free, no USD aggregation,
// never present a size threshold as a gate, and NEVER claim a distribution
// "failed" — an empty balance can always still mean RPC lag or a pending
// transaction. The token is "Unleak USDC (uUSDC)" on first mention, "uUSDC"
// after, and the brand name never stands alone as the fake-token signal — the
// copy always pairs it with an explicit "not real USDC / no real-world value"
// qualifier. Long-form explanations live on the landing FAQ; this component
// only deep-links.

import { ExternalLink, Gift } from "lucide-react";
import type { Cluster } from "@/chain/env";
import { CLUSTER_LABELS } from "@/chain/cluster";
import type { TokenBalanceState } from "@/app/lib/token-balance-state";
import { formatTokenAmount } from "@/app/lib/format";
import { FAQ_DEVNET_USDC } from "@/app/lib/links";
import { EmptyState } from "@/app/components/EmptyState";
import { GiftIllustration } from "@/app/components/illustrations";

interface BetaTokenNoticeProps {
  state: TokenBalanceState;
  cluster: Cluster;
  symbol: string;
  decimals: number;
  /** Amount (base units) the attempted action needs; the `insufficient`
   * state's own `required` wins when both are present. */
  required?: bigint;
  variant: "empty-state" | "inline";
  className?: string;
}

const BASE_COPY =
  "This beta trades with Unleak USDC (uUSDC) — UnleakTrade's test version of USDC on Solana " +
  "devnet. Activated waitlist members receive 1000 uUSDC in the wallet they registered. " +
  "Connect that same wallet or check your distribution status. uUSDC is not real USDC and has " +
  "no real-world value.";

const WRONG_CLUSTER_COPY = (cluster: Cluster) =>
  `uUSDC lives on Solana devnet — you're connected to ${CLUSTER_LABELS[cluster]}. ` +
  "Switch clusters to use it.";

const NO_ATA_COPY =
  "This wallet has no account for uUSDC yet. If you registered a different wallet on " +
  "the waitlist, connect that one — or your distribution may still be on its way.";

const ZERO_COPY =
  "Your uUSDC balance is empty. Distribution may still be pending — check your status " +
  "before assuming anything went wrong.";

/** State-specific detail line. Balance claims are suppressed off-devnet — the
 * wrong-cluster message takes precedence over whatever the balance read said. */
function detailCopy(
  state: TokenBalanceState,
  cluster: Cluster,
  symbol: string,
  decimals: number,
  required?: bigint,
): string | null {
  if (cluster !== "devnet") return WRONG_CLUSTER_COPY(cluster);
  switch (state.status) {
    case "no-ata":
      return NO_ATA_COPY;
    case "zero":
      return ZERO_COPY;
    case "insufficient": {
      const need = state.required ?? required;
      return (
        `You need ${formatTokenAmount(need, decimals)} ${symbol} for this action — you have ` +
        `${formatTokenAmount(state.balance, decimals)}. There's no faucet for this mint; if ` +
        "you've run out, contact support."
      );
    }
    default:
      return null;
  }
}

function StatusLink({ className }: { className?: string }) {
  return (
    <a
      href={FAQ_DEVNET_USDC}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "inline-flex items-center gap-1.5 text-sm font-medium text-cyan-300 hover:text-cyan-200 underline underline-offset-4"
      }
    >
      Check distribution status
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </a>
  );
}

export function BetaTokenNotice({
  state,
  cluster,
  symbol,
  decimals,
  required,
  variant,
  className,
}: BetaTokenNoticeProps) {
  const detail = detailCopy(state, cluster, symbol, decimals, required);

  if (variant === "empty-state") {
    return (
      <EmptyState
        title="Unleak USDC comes from the waitlist"
        hint={detail ? `${BASE_COPY} ${detail}` : BASE_COPY}
        illustration={<GiftIllustration />}
        action={<StatusLink />}
        className={className}
      />
    );
  }

  // inline — compact bordered note matching the amber Note styling used on the
  // settle cockpit.
  return (
    <div
      className={`rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 ${className ?? ""}`}
    >
      <div className="flex items-start gap-2">
        <Gift className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="space-y-1.5">
          {detail && <p className="font-medium">{detail}</p>}
          <p className="text-amber-200/80">{BASE_COPY}</p>
          <StatusLink className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-100 hover:text-white underline underline-offset-4" />
        </div>
      </div>
    </div>
  );
}
