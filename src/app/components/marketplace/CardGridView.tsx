import type { RFQ } from "@/types/rfq";
import { RFQMarketplaceCard } from "@/app/components/marketplace/RFQMarketplaceCard";

export interface CardGridViewProps {
  rfqs: RFQ[];
  currentUser: string | null;
  onQuoteRFQ: (rfq: RFQ) => void;
  onViewRFQ: (rfqId: string) => void;
  onEditRFQ?: (rfq: RFQ) => void;
}

export function CardGridView({
  rfqs,
  currentUser,
  onQuoteRFQ,
  onViewRFQ,
  onEditRFQ,
}: CardGridViewProps) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {rfqs.map((rfq, index) => (
        <RFQMarketplaceCard
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
