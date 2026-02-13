import { useParams, useNavigate, useOutletContext } from "react-router";
import { AdaptiveRFQDetail } from "@/app/components/AdaptiveRFQDetail";
import { RFQ } from "@/app/App";
import { RFQ as EnhancedRFQ } from "@/app/data/enhancedMockData";

interface OutletContext {
  setIsQuoteModalOpen: (open: boolean) => void;
  setQuoteRFQ: (rfq: RFQ | null) => void;
}

export function RFQDetailWrapper() {
  const { rfqId } = useParams<{ rfqId: string }>();
  const navigate = useNavigate();
  const { setIsQuoteModalOpen, setQuoteRFQ } = useOutletContext<OutletContext>();

  const handleBack = () => {
    navigate(-1);
  };

  const handleQuoteRFQ = (rfq: RFQ) => {
    setQuoteRFQ(rfq);
    setIsQuoteModalOpen(true);
  };

  if (!rfqId) {
    navigate("/dashboard");
    return null;
  }

  return (
    <AdaptiveRFQDetail
      rfqId={rfqId}
      onBack={handleBack}
      onQuoteRFQ={handleQuoteRFQ}
    />
  );
}
