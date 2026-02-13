import { useNavigate } from "react-router";
import { MyEarnings } from "@/app/components/MyEarnings";

export function MyEarningsWrapper() {
  const navigate = useNavigate();

  const handleViewRFQ = (rfqId: string) => {
    navigate(`/dashboard/rfq/${rfqId}`);
  };

  return <MyEarnings onViewRFQ={handleViewRFQ} />;
}
