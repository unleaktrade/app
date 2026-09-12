import type { PublicKey, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitRfqTx } from "@/chain/instructions/shared";

export interface SubmitRfqTxInput {
  /** The RFQ this write touches, for the targeted single-account invalidation. */
  rfq?: PublicKey;
  build: () => Promise<Transaction>;
  pendingMessage: string;
  successMessage: string;
  /** Free-form tag so per-row UIs can tell which item is in flight (`variables.tag`). */
  tag?: string;
}

/**
 * The one way screens run a settlement-engine write. Wraps submitRfqTx
 * (build → toast → confirm → invalidate) in a TanStack mutation so callers get
 * `isPending` / `variables` for free instead of hand-rolling a busy flag with
 * try/finally. Errors are already toasted by sendAndConfirmWithToast and are
 * rethrown by `mutateAsync` so a caller can stop its flow.
 */
export function useSubmitRfqTx() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitRfqTxInput) =>
      submitRfqTx({
        connection,
        wallet,
        queryClient,
        rfq: input.rfq,
        build: input.build,
        pendingMessage: input.pendingMessage,
        successMessage: input.successMessage,
      }),
  });
}
