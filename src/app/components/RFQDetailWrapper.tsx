import { useParams, useNavigate, useOutletContext } from "react-router";
import { AdaptiveRFQDetail } from "@/app/components/AdaptiveRFQDetail";
import type { RFQ } from "@/types/rfq";
import type { DashboardOutletContext } from "@/app/components/DashboardLayout";

export function RFQDetailWrapper() {
  const { rfqId } = useParams<{ rfqId: string }>();
  const navigate = useNavigate();
  const { setIsQuoteModalOpen, setQuoteRFQ } = useOutletContext<DashboardOutletContext>();

  if (!rfqId) {
    navigate("/dashboard");
    return null;
  }

  const handleQuoteRFQ = (rfq: RFQ) => {
    setQuoteRFQ(rfq);
    setIsQuoteModalOpen(true);
  };

  return (
    <AdaptiveRFQDetail rfqId={rfqId} onBack={() => navigate(-1)} onQuoteRFQ={handleQuoteRFQ} />
  );
}
