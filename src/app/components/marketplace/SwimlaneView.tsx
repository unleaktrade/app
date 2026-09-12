import { motion } from "motion/react";
import type { RFQ } from "@/types/rfq";
import { getCardGradient, getCardBorder } from "@/app/lib/rfq-visuals";
import { StatusBadge } from "@/app/components/StatusBadge";
import { RFQMarketplaceCard } from "@/app/components/marketplace/RFQMarketplaceCard";
import { ALL_STATES, type MarketplaceState } from "@/app/hooks/useMarketplaceFilters";

export interface SwimlaneViewProps {
  rfqsByState: Record<MarketplaceState, RFQ[]>;
  currentUser: string | null;
  onQuoteRFQ: (rfq: RFQ) => void;
  onViewRFQ: (rfqId: string) => void;
  onEditRFQ?: (rfq: RFQ) => void;
}

export function SwimlaneView({
  rfqsByState,
  currentUser,
  onQuoteRFQ,
  onViewRFQ,
  onEditRFQ,
}: SwimlaneViewProps) {
  return (
    <div className="md:overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row gap-4 pb-4 md:min-w-max">
        {ALL_STATES.map((state) => {
          const stateRFQs = rfqsByState[state];
          const stateCount = stateRFQs.length;

          // Skip empty states in swimlane view
          if (stateCount === 0) return null;

          return (
            <motion.div
              key={state}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-shrink-0 w-full md:w-80"
            >
              {/* Column Header */}
              <div
                className={`${getCardGradient(state)} border ${getCardBorder(state)} rounded-t-xl p-4 backdrop-blur-sm`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-white">{state}</h3>
                  <span className="text-sm text-white/60">{stateCount}</span>
                </div>
                <StatusBadge status={state} />
              </div>

              {/* Column Content */}
              <div className="bg-white/5 border-x border-b border-white/10 rounded-b-xl p-3 space-y-3 max-h-[600px] overflow-y-auto">
                {stateRFQs.map((rfq) => (
                  <RFQMarketplaceCard
                    key={rfq.publicKey}
                    rfq={rfq}
                    currentUser={currentUser}
                    onQuote={() => onQuoteRFQ(rfq)}
                    onView={() => onViewRFQ(rfq.publicKey)}
                    onEdit={onEditRFQ ? () => onEditRFQ(rfq) : undefined}
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
