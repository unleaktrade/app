import { useNavigate, useOutletContext } from "react-router";
import { MyRFQs } from "@/app/components/MyRFQs";
import { RFQ } from "@/app/App";
import { RFQ as EnhancedRFQ } from "@/app/data/enhancedMockData";

interface OutletContext {
  setIsCreateModalOpen: (open: boolean) => void;
  setIsUpdateModalOpen: (open: boolean) => void;
  setUpdateRFQ: (rfq: EnhancedRFQ | null) => void;
}

export function MyRFQsWrapper() {
  const navigate = useNavigate();
  const { setIsCreateModalOpen, setIsUpdateModalOpen, setUpdateRFQ } = useOutletContext<OutletContext>();

  const handleCreateRFQ = () => {
    setIsCreateModalOpen(true);
  };

  const handleViewRFQ = (rfqId: string) => {
    navigate(`/dashboard/rfq/${rfqId}`);
  };

  const handleEditRFQ = (rfq: RFQ) => {
    // Convert legacy RFQ to enhanced RFQ format for update modal
    const enhancedRFQ: EnhancedRFQ = {
      publicKey: rfq.id,
      maker: rfq.maker || "",
      baseMint: rfq.baseMint,
      quoteMint: rfq.quoteMint,
      pair: rfq.pair,
      baseAmount: rfq.baseAmount,
      minQuoteAmount: rfq.quoteAmount,
      bondAmount: rfq.bondAmount,
      feeAmount: rfq.takerFee || 0,
      state: rfq.state,
      commitTtlSecs: 3600,
      revealTtlSecs: 1800,
      selectionTtlSecs: 1800,
      fundTtlSecs: 3600,
      createdAt: rfq.createdAt,
      openedAt: null,
      selectedAt: null,
      completedAt: null,
      committedCount: 0,
      revealedCount: 0,
      selectedQuote: null,
      facilitator: rfq.facilitator || null,
      expiresIn: rfq.expires || null,
    };
    setUpdateRFQ(enhancedRFQ);
    setIsUpdateModalOpen(true);
  };

  return <MyRFQs onCreateRFQ={handleCreateRFQ} onViewRFQ={handleViewRFQ} onEditRFQ={handleEditRFQ} />;
}