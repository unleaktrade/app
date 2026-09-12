import type { RFQ } from "@/types/rfq";
import { RFQMarketplaceListItem } from "@/app/components/marketplace/RFQMarketplaceListItem";

export interface ListViewProps {
  rfqs: RFQ[];
  currentUser: string | null;
  onQuoteRFQ: (rfq: RFQ) => void;
  onViewRFQ: (rfqId: string) => void;
  onEditRFQ?: (rfq: RFQ) => void;
}

export function ListView({ rfqs, currentUser, onQuoteRFQ, onViewRFQ, onEditRFQ }: ListViewProps) {
  return (
    <div className="space-y-3">
      {rfqs.map((rfq, index) => (
        <RFQMarketplaceListItem
          key={rfq.publicKey}
          index={index}
          rfq={rfq}
          currentUser={currentUser}
          onQuote={() => onQuoteRFQ(rfq)}
          onView={() => onViewRFQ(rfq.publicKey)}
          onEdit={onEditRFQ ? () => onEditRFQ(rfq) : undefined}
        />
      ))}
    </div>
  );
}
