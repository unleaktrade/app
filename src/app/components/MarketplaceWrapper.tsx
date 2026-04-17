import { useOutletContext, useNavigate } from "react-router";
import { Marketplace } from "@/app/components/Marketplace";
import type { RFQ } from "@/types/rfq";
import type { DashboardOutletContext } from "@/app/components/DashboardLayout";

export function MarketplaceWrapper() {
  const navigate = useNavigate();
  const { setIsQuoteModalOpen, setQuoteRFQ, setIsUpdateModalOpen, setUpdateRFQ } =
    useOutletContext<DashboardOutletContext>();

  const handleQuoteRFQ = (rfq: RFQ) => {
    setQuoteRFQ(rfq);
    setIsQuoteModalOpen(true);
  };

  const handleViewRFQ = (rfqId: string) => {
    navigate(`/dashboard/rfq/${rfqId}`);
  };

  const handleEditRFQ = (rfq: RFQ) => {
    setUpdateRFQ(rfq);
    setIsUpdateModalOpen(true);
  };

  return (
    <Marketplace onQuoteRFQ={handleQuoteRFQ} onViewRFQ={handleViewRFQ} onEditRFQ={handleEditRFQ} />
  );
}
