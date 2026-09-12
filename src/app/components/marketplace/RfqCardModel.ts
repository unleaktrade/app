import type { RFQ } from "@/types/rfq";
import {
  getCardGradient,
  getCardBorder,
  getOwnedHighlight,
  type OwnedHighlight,
} from "@/app/lib/rfq-visuals";

export interface RfqCardModel {
  /** Base-side symbol of `rfq.pair` (`"SOL"` in `"SOL/USDC"`). */
  base: string | undefined;
  /** Quote-side symbol of `rfq.pair` (`"USDC"` in `"SOL/USDC"`). */
  quote: string | undefined;
  isCommitted: boolean;
  canQuote: boolean;
  /** Does the connected wallet own this RFQ? */
  isMyRFQ: boolean;
  cardGradient: string;
  cardBorder: string;
  /** State-coloured classes for the MY RFQ badge and border. */
  myRFQStyles: OwnedHighlight;
}

/**
 * Shared derivation for the marketplace card + list-item renderers: pair
 * symbols, state flags, ownership and the state-based styling classes.
 */
export function useRfqCardModel(rfq: RFQ, currentUser: string | null): RfqCardModel {
  const [base, quote] = rfq.pair.split("/");
  const isCommitted = rfq.state === "Committed";
  const canQuote = rfq.state === "Open" || rfq.state === "Committed";

  // Check if this RFQ belongs to current user
  const isMyRFQ = currentUser !== null && rfq.maker === currentUser;

  // Get state-based styling
  const cardGradient = getCardGradient(rfq.state);
  const cardBorder = getCardBorder(rfq.state);

  // Get state color classes for MY RFQ badge and border
  const myRFQStyles = getOwnedHighlight(rfq.state);

  return { base, quote, isCommitted, canQuote, isMyRFQ, cardGradient, cardBorder, myRFQStyles };
}
