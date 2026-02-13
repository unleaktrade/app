import { useNavigate } from "react-router";
import { MyQuotes } from "@/app/components/MyQuotes";

export function MyQuotesWrapper() {
  const navigate = useNavigate();

  const handleViewRFQ = (rfqId: string) => {
    navigate(`/dashboard/rfq/${rfqId}`);
  };

  return <MyQuotes onViewRFQ={handleViewRFQ} />;
}
