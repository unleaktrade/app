import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSettlementProgram } from "@/chain/program";
import { buildWithdrawRewardTx } from "@/chain/instructions/maker";
import { submitRfqTx } from "@/chain/instructions/shared";
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
 * sendClaim is the shared submit path; claim wraps it with per-row busy
 * state, claimAll loops it sequentially and keeps going on failures.
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
  const { connection } = useConnection();
  const program = useSettlementProgram();
  const queryClient = useQueryClient();
  const wallet = useWallet();
  const me = publicKey ?? null;

  const [busyId, setBusyId] = useState<string | null>(null);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);

  const sendClaim = async (reward: PendingReward) => {
    if (!program || !me) {
      toast.error("Connect a wallet to claim");
      throw new Error("wallet not ready");
    }
    const rfq = new PublicKey(reward.rfq);
    await submitRfqTx({
      connection,
      wallet,
      queryClient,
      rfq,
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
    setBusyId(reward.rfq);
    try {
      await sendClaim(reward);
    } catch {
      // toast already surfaced
    } finally {
      setBusyId(null);
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
