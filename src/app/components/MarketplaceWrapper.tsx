import { useOutletContext, useNavigate } from "react-router";
import { Marketplace } from "@/app/components/Marketplace";
import { RFQ as EnhancedRFQ } from "@/app/data/enhancedMockData";
import { RFQ } from "@/app/App";

interface OutletContext {
  setIsQuoteModalOpen: (open: boolean) => void;
  setQuoteRFQ: (rfq: RFQ | null) => void;
  setIsUpdateModalOpen: (open: boolean) => void;
  setUpdateRFQ: (rfq: EnhancedRFQ | null) => void;
}

export function MarketplaceWrapper() {
  const navigate = useNavigate();
  const { setIsQuoteModalOpen, setQuoteRFQ, setIsUpdateModalOpen, setUpdateRFQ } = useOutletContext<OutletContext>();

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

  const handleEditRFQ = (rfq: EnhancedRFQ) => {
    setUpdateRFQ(rfq);
    setIsUpdateModalOpen(true);
  };

  return <Marketplace onQuoteRFQ={handleQuoteRFQ} onViewRFQ={handleViewRFQ} onEditRFQ={handleEditRFQ} />;
}
