import { useNavigate, useOutletContext } from "react-router";
import { MyRFQs } from "@/app/components/MyRFQs";

interface OutletContext {
  setIsCreateModalOpen: (open: boolean) => void;
}

export function MyRFQsWrapper() {
  const navigate = useNavigate();
  const { setIsCreateModalOpen } = useOutletContext<OutletContext>();

  const handleCreateRFQ = () => {
    setIsCreateModalOpen(true);
  };

  const handleViewRFQ = (rfqId: string) => {
    navigate(`/dashboard/rfq/${rfqId}`);
  };

  return <MyRFQs onCreateRFQ={handleCreateRFQ} onViewRFQ={handleViewRFQ} />;
}