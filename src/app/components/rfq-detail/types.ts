import type { ProgramAccount } from "@/chain/accounts/lists";
import type { QuoteAccount } from "@/chain/accounts/quote";

/** The connected wallet's relation to this RFQ. Role is internal — never copy. */
export interface Relation {
  isMaker: boolean;
  isFacilitator: boolean;
  myQuote: ProgramAccount<QuoteAccount> | null;
}
