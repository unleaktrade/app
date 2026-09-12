import { AnimatePresence, motion } from "motion/react";
import type { RFQ } from "@/types/rfq";
import {
  getStateSectionGradient,
  getStateTitleColor,
  getStateSubtitle,
} from "@/app/lib/rfq-visuals";
import { RFQMarketplaceCard } from "@/app/components/marketplace/RFQMarketplaceCard";
import { ALL_STATES, type MarketplaceState } from "@/app/hooks/useMarketplaceFilters";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface HorizontalGroupsViewProps {
  rfqsByState: Record<MarketplaceState, RFQ[]>;
  expandedStates: Set<string>;
  onToggleState: (state: string) => void;
  currentUser: string | null;
  onQuoteRFQ: (rfq: RFQ) => void;
  onViewRFQ: (rfqId: string) => void;
  onEditRFQ?: (rfq: RFQ) => void;
}

export function HorizontalGroupsView({
  rfqsByState,
  expandedStates,
  onToggleState,
  currentUser,
  onQuoteRFQ,
  onViewRFQ,
  onEditRFQ,
}: HorizontalGroupsViewProps) {
  return (
    <div className="space-y-6">
      {ALL_STATES.map((state) => {
        const stateRFQs = rfqsByState[state];
        const stateCount = stateRFQs.length;

        // Skip empty states in horizontal view
        if (stateCount === 0) return null;

        return (
          <motion.div
            key={state}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-gradient-to-br ${getStateSectionGradient(state)} backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden`}
          >
            {/* Section Header - Clickable */}
            <button
              onClick={() => onToggleState(state)}
              aria-expanded={expandedStates.has(state)}
              className="w-full p-5 flex items-center justify-between transition-all group/header border-b border-white/5"
            >
              <div>
                <h3
                  className={`text-lg font-semibold ${getStateTitleColor(state)} mb-1 text-left group-hover/header:text-opacity-80 transition-all`}
                >
                  {state} ({stateCount})
                </h3>
                <p className="text-sm text-white/50 text-left">{getStateSubtitle(state)}</p>
              </div>
              <div className="flex-shrink-0 ml-4">
                {expandedStates.has(state) ? (
                  <ChevronUp className="h-5 w-5 text-white/60 group-hover/header:text-white/80 transition-colors" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-white/60 group-hover/header:text-white/80 transition-colors" />
                )}
              </div>
            </button>

            {/* Horizontal scrolling cards - Collapsible */}
            {/* AnimatePresence keeps the panel mounted through its exit
                animation; without it the `exit` below never played. */}
            <AnimatePresence initial={false}>
              {expandedStates.has(state) && (
                <motion.div
                  key="cards"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="overflow-x-auto snap-x snap-proximity px-5 pb-5 pt-4">
                    <div className="flex gap-3 pb-2">
                      {stateRFQs.map((rfq) => (
                        <div key={rfq.publicKey} className="flex-shrink-0 snap-start w-72 sm:w-80">
                          <RFQMarketplaceCard
                            rfq={rfq}
                            currentUser={currentUser}
                            onQuote={() => onQuoteRFQ(rfq)}
                            onView={() => onViewRFQ(rfq.publicKey)}
                            onEdit={onEditRFQ ? () => onEditRFQ(rfq) : undefined}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
