// Shared plumbing for the instruction-builder modules (maker.ts, and the
// taker/facilitator modules that follow). Builders return an unsigned
// `Transaction`; screens submit it through `sendAndConfirmWithToast`
// (src/chain/tx.ts), which lets the wallet adapter set the fee payer + recent
// blockhash. Keeping build and submit separate means the same builder works for
// single-instruction sends and for composed transactions (compute-budget
// preinstruction, the taker Ed25519 preinstruction) without special-casing.

import type { Connection, PublicKey, Transaction } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import type { QueryClient } from "@tanstack/react-query";
import { PublicKey as Web3PublicKey } from "@solana/web3.js";
import { v4 as uuidv4, parse as uuidParse } from "uuid";
import { env } from "@/chain/env";
import { sendAndConfirmWithToast } from "@/chain/tx";
import type { FacilitatorUpdate as ChainFacilitatorUpdate } from "@/types/rfq";

/** Fresh 16-byte RFQ uuid seed (mirrors scripts/seed.ts `uuidBytes`). */
export function newRfqUuid(): Uint8Array {
  return Uint8Array.from(uuidParse(uuidv4()));
}

/**
 * The on-chain `FacilitatorUpdate` enum, in the shape Anchor expects for an
 * instruction arg: `{ clear: {} }` or `{ set: [PublicKey] }`.
 */
export type FacilitatorUpdateArg = { clear: Record<string, never> } | { set: [PublicKey] };

/**
 * Bridge the UI-level facilitator edit (clear, or set to a base58 string) to
 * the Anchor arg. Throws on a malformed pubkey so the caller surfaces a
 * client-side validation error before building the transaction.
 */
export function toFacilitatorUpdateArg(update: ChainFacilitatorUpdate): FacilitatorUpdateArg {
  if (update.kind === "clear") return { clear: {} };
  return { set: [new Web3PublicKey(update.pubkey)] };
}

/**
 * Refetch the list + single-account reads touched by a write. Single-account
 * reads also refresh via their websocket subscription, but the getProgramAccounts
 * lists (Marketplace / My Activity) are refetch-on-focus only — invalidating
 * here is what makes a freshly created / opened / settled RFQ appear without a
 * manual refresh, and without a polling loop. Prefix-matched, so passing no
 * `rfq` still busts every list.
 */
export function invalidateRfqQueries(queryClient: QueryClient, rfq?: PublicKey): void {
  const programId = env.programId.toBase58();
  // Prefix invalidation covers both the ["<acct>", programId, "all", …] lists
  // and the ["<acct>", programId, <address>] single reads.
  for (const account of [
    "rfq",
    "quote",
    "settlement",
    "facilitatorRewardTracker",
    "slashedBondsTracker",
    "feesTracker",
  ]) {
    void queryClient.invalidateQueries({ queryKey: [account, programId] });
  }
  if (rfq) {
    void queryClient.invalidateQueries({ queryKey: ["rfq", programId, rfq.toBase58()] });
  }
}

export interface SubmitRfqTxArgs {
  connection: Connection;
  wallet: WalletContextState;
  queryClient: QueryClient;
  /** The RFQ this write touches, for the targeted single-account invalidation. */
  rfq?: PublicKey;
  build: () => Promise<Transaction>;
  pendingMessage: string;
  successMessage: string;
}

/**
 * Build → submit (toast + Solscan link) → invalidate. The one place screens go
 * to run a settlement-engine write, so every CTA gets the same optimistic
 * refresh and error surface. Rethrows on failure (toast already shown) so the
 * caller can keep its button disabled / not advance the flow.
 */
export async function submitRfqTx(args: SubmitRfqTxArgs): Promise<string> {
  const tx = await args.build();
  const signature = await sendAndConfirmWithToast(args.connection, args.wallet, tx, {
    pendingMessage: args.pendingMessage,
    successMessage: args.successMessage,
  });
  invalidateRfqQueries(args.queryClient, args.rfq);
  return signature;
}
