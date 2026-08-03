// Token-balance read model (#67). Pure derivation + the imperative fetch used
// by useTokenBalanceState (src/app/hooks/useTokenBalanceState.ts) — kept in
// lib/ so the node Vitest project can unit-test the state matrix without a DOM.
//
// The load-bearing distinction: an RPC/read failure is `error`, NEVER `zero`
// or `no-ata`. An empty balance may mean a pending waitlist distribution; a
// failed read means we simply don't know — the two must never be conflated.

import {
  getAccount,
  getAssociatedTokenAddressSync,
  TokenAccountNotFoundError,
} from "@solana/spl-token";
import type { Connection, PublicKey } from "@solana/web3.js";

export type TokenBalanceState =
  | { status: "no-wallet" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "no-ata" }
  | { status: "zero" }
  | { status: "insufficient"; balance: bigint; required: bigint }
  | { status: "ok"; balance: bigint };

/** Raw read result: does the ATA exist, and what does it hold (base units). */
export interface RawTokenBalance {
  exists: boolean;
  amount: bigint;
}

/**
 * Pure state derivation. `balance === required` is `ok` (meeting the bar is
 * enough — a threshold is a requirement, not a gate with headroom).
 */
export function deriveTokenBalanceState(
  raw: RawTokenBalance | undefined,
  opts: { hasWallet: boolean; isLoading: boolean; isError: boolean },
  required?: bigint,
): TokenBalanceState {
  if (!opts.hasWallet) return { status: "no-wallet" };
  if (opts.isError) return { status: "error" };
  if (opts.isLoading || raw === undefined) return { status: "loading" };
  if (!raw.exists) return { status: "no-ata" };
  if (raw.amount === 0n) return { status: "zero" };
  if (required !== undefined && raw.amount < required) {
    return { status: "insufficient", balance: raw.amount, required };
  }
  return { status: "ok", balance: raw.amount };
}

/**
 * Imperative one-shot read of the owner's ATA for `mint`. A missing token
 * account resolves `{exists: false}`; every other failure (RPC down, bad
 * response) rethrows so callers surface `error` instead of a false "empty".
 */
export async function fetchTokenBalance(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
): Promise<RawTokenBalance> {
  const ata = getAssociatedTokenAddressSync(mint, owner);
  try {
    const account = await getAccount(connection, ata);
    return { exists: true, amount: account.amount };
  } catch (err) {
    if (err instanceof TokenAccountNotFoundError) return { exists: false, amount: 0n };
    throw err;
  }
}
