import type { ProgramAccount } from "@/chain/accounts/lists";
import type { QuoteAccount } from "@/chain/accounts/quote";

/** Finds the quote row matching a PDA (base58), or null if absent/no PDA. */
export function findQuoteByPda(
  rows: readonly ProgramAccount<QuoteAccount>[],
  pda: string | null,
): ProgramAccount<QuoteAccount> | null {
  if (pda === null) return null;
  return rows.find((row) => row.publicKey.toBase58() === pda) ?? null;
}
