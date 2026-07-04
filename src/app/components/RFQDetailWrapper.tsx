import { useParams, useNavigate, useOutletContext, useSearchParams } from "react-router";
import { AdaptiveRFQDetail } from "@/app/components/AdaptiveRFQDetail";
import { parseRequestedAction } from "@/app/lib/share-links";
import type { RFQ } from "@/types/rfq";
import type { DashboardOutletContext } from "@/app/components/DashboardLayout";

export function RFQDetailWrapper() {
  const { rfqId } = useParams<{ rfqId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedAction = parseRequestedAction(searchParams.get("action"));
  const { setIsQuoteModalOpen, setQuoteRFQ, setUpdateRFQ, setIsUpdateModalOpen } =
    useOutletContext<DashboardOutletContext>();

  if (!rfqId) {
    navigate("/dashboard");
    return null;
  }

  const handleQuoteRFQ = (rfq: RFQ) => {
    setQuoteRFQ(rfq);
    setIsQuoteModalOpen(true);
  };

  const handleEditRFQ = (rfq: RFQ) => {
    setUpdateRFQ(rfq);
    setIsUpdateModalOpen(true);
  };

  return (
    <AdaptiveRFQDetail
      rfqId={rfqId}
      onBack={() => navigate(-1)}
      onQuoteRFQ={handleQuoteRFQ}
      onEditRFQ={handleEditRFQ}
      requestedAction={requestedAction}
      onRequestedActionConsumed={() => setSearchParams({}, { replace: true })}
    />
  );
}
