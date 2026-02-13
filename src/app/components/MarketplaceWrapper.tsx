import { useOutletContext, useNavigate } from "react-router";
import { Marketplace } from "@/app/components/Marketplace";
import { RFQ as EnhancedRFQ } from "@/app/data/enhancedMockData";
import { RFQ } from "@/app/App";

interface OutletContext {
  setIsQuoteModalOpen: (open: boolean) => void;
  setQuoteRFQ: (rfq: RFQ | null) => void;
}

export function MarketplaceWrapper() {
  const navigate = useNavigate();
  const { setIsQuoteModalOpen, setQuoteRFQ } = useOutletContext<OutletContext>();

  const handleQuoteRFQ = (rfq: EnhancedRFQ) => {
    // Convert enhanced RFQ to legacy format for modal
    const legacyRFQ: RFQ = {
      id: rfq.publicKey,
      pair: rfq.pair,
      baseMint: rfq.baseMint,
      quoteMint: rfq.quoteMint,
      baseAmount: rfq.baseAmount,
      quoteAmount: rfq.minQuoteAmount,
      price: rfq.minQuoteAmount / rfq.baseAmount,
      status: rfq.state,
      state: rfq.state,
      expires: rfq.expiresIn,
      maker: rfq.maker,
      facilitator: rfq.facilitator,
      bondAmount: rfq.bondAmount,
      takerFee: rfq.feeAmount,
      createdAt: rfq.createdAt,
    };
    setQuoteRFQ(legacyRFQ);
    setIsQuoteModalOpen(true);
  };

  const handleViewRFQ = (rfqId: string) => {
    navigate(`/dashboard/rfq/${rfqId}`);
  };

  return <Marketplace onQuoteRFQ={handleQuoteRFQ} onViewRFQ={handleViewRFQ} />;
}
