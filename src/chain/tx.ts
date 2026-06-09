import type { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { toast } from "sonner";

function explorerLink(signature: string): string {
  return `https://solscan.io/tx/${signature}?cluster=devnet`;
}

export async function sendAndConfirmWithToast(
  connection: Connection,
  wallet: WalletContextState,
  tx: Transaction | VersionedTransaction,
  opts?: { pendingMessage?: string; successMessage?: string },
): Promise<string> {
  if (!wallet.sendTransaction) {
    throw new Error("Wallet does not support sendTransaction");
  }
  const toastId = toast.loading(opts?.pendingMessage ?? "Sending transaction…");
  try {
    const signature = await wallet.sendTransaction(tx, connection);
    const latest = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
      "confirmed",
    );
    toast.success(opts?.successMessage ?? "Transaction confirmed", {
      id: toastId,
      action: { label: "View", onClick: () => window.open(explorerLink(signature), "_blank") },
    });
    return signature;
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Transaction failed", { id: toastId });
    throw err;
  }
}
