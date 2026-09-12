import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { useSettlementProgram } from "@/chain/program";
import { buildWithdrawRewardTx } from "@/chain/instructions/maker";
import { useSubmitRfqTx } from "@/app/hooks/useSubmitRfqTx";
import type { PendingReward } from "@/app/lib/rewards";

export interface RewardClaims {
  /** Claim one reward; per-row busy state via `busyId`. Never throws. */
  claim: (reward: PendingReward) => Promise<void>;
  /** Claim every pending reward sequentially, one tx each; keeps going on failures. */
  claimAll: () => Promise<void>;
  /** The RFQ key of the reward currently being claimed by `claim`, else null. */
  busyId: string | null;
  /** Progress of an in-flight `claimAll`, else null. */
  batch: { done: number; total: number } | null;
}

/**
 * Claim a reward (withdraw_reward). The PendingReward already carries the
 * winning quote PDA + quote mint, so nothing is re-derived from view models.
 * Every write goes through useSubmitRfqTx; `busyId` is derived from the
 * mutation's in-flight variables (tagged with the RFQ key) for single claims,
 * while claimAll keeps its own sequential progress counter.
 */
export function useRewardClaims({
  pendingRewards,
  onBatchDone,
}: {
  pendingRewards: PendingReward[];
  /** Runs after a `claimAll` pass completes (used to refetch the trackers). */
  onBatchDone: () => void;
}): RewardClaims {
  const { publicKey } = useWallet();
  const program = useSettlementProgram();
  const submit = useSubmitRfqTx();
  const me = publicKey ?? null;

  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  // Per-row busy state only for single claims — during a batch the progress
  // counter is the indicator, exactly as before.
  const busyId = batch === null && submit.isPending ? (submit.variables?.tag ?? null) : null;

  const sendClaim = async (reward: PendingReward) => {
    if (!program || !me) {
      toast.error("Connect a wallet to claim");
      throw new Error("wallet not ready");
    }
    const rfq = new PublicKey(reward.rfq);
    await submit.mutateAsync({
      rfq,
      tag: reward.rfq,
      build: () =>
        buildWithdrawRewardTx({
          program,
          facilitator: me,
          rfq,
          quote: new PublicKey(reward.quote),
          quoteMint: new PublicKey(reward.quoteMint),
        }),
      pendingMessage: "Claiming reward…",
      successMessage: "Reward claimed to your wallet",
    });
  };

  const claim = async (reward: PendingReward) => {
    try {
      await sendClaim(reward);
    } catch {
      // toast already surfaced
    }
  };

  const claimAll = async () => {
    const rewards = pendingRewards;
    if (!program || !me || rewards.length === 0 || batch !== null) return;
    setBatch({ done: 0, total: rewards.length });
    let succeeded = 0;
    for (const [index, reward] of rewards.entries()) {
      try {
        await sendClaim(reward);
        succeeded += 1;
      } catch {
        // per-tx toast already surfaced — keep claiming the rest
      }
      setBatch({ done: index + 1, total: rewards.length });
    }
    setBatch(null);
    toast.success(`Claimed ${succeeded} of ${rewards.length} rewards`);
    onBatchDone();
  };

  return { claim, claimAll, busyId, batch };
}
