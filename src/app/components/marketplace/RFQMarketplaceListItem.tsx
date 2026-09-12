import { motion } from "motion/react";
import type { RFQ } from "@/types/rfq";
import { Button } from "@/app/components/ui/button";
import { StatusBadge } from "@/app/components/StatusBadge";
import { useRfqCardModel } from "@/app/components/marketplace/RfqCardModel";
import { Coins, Eye, MousePointerClick, BadgeCheck, Edit3 } from "lucide-react";

export interface RFQMarketplaceListItemProps {
  rfq: RFQ;
  currentUser: string | null;
  onQuote: () => void;
  onView: () => void;
  onEdit?: () => void;
  /** Position in the rendered list — drives the capped entrance stagger. */
  index?: number;
}

export function RFQMarketplaceListItem({
  rfq,
  currentUser,
  onQuote,
  onView,
  onEdit,
  index = 0,
}: RFQMarketplaceListItemProps) {
  const { base, quote, isCommitted, canQuote, isMyRFQ, cardGradient, cardBorder, myRFQStyles } =
    useRfqCardModel(rfq, currentUser);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.005 }}
      transition={{ duration: 0.2, ease: "easeOut", delay: Math.min(index, 12) * 0.04 }}
      className={`relative ${cardGradient} backdrop-blur-sm border ${
        isMyRFQ ? `${myRFQStyles.border} animate-pulse-glow` : cardBorder
      } rounded-lg p-4 transition-all hover:border-opacity-60`}
    >
      {/* MY RFQ Badge Ribbon with state color */}
      {isMyRFQ && (
        <div className="absolute -top-2 -left-2 z-10">
          <div className="relative">
            <div
              className={`${myRFQStyles.badge} text-[10px] font-bold px-3 py-1 rounded-md flex items-center gap-1.5`}
            >
              <BadgeCheck className="h-3 w-3 animate-pulse" />
              <span>MY RFQ</span>
            </div>
            <div
              className={`absolute -bottom-1 left-0 w-0 h-0 border-l-[6px] border-l-transparent border-t-[4px] ${myRFQStyles.triangle} border-r-[6px] border-r-transparent`}
            ></div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Left: Pair + Status */}
        <div className="flex items-center gap-3 lg:w-48">
          <Coins className="h-5 w-5 text-cyan-400 flex-shrink-0" />
          <div>
            <div className="font-semibold text-base text-white">{rfq.pair}</div>
            <StatusBadge status={rfq.state} />
          </div>
        </div>

        {/* Amounts */}
        <div className="flex gap-4 lg:flex-1">
          <div className="flex-1">
            <div className="text-xs text-white/50 mb-1">Base Amount</div>
            <div className="text-sm font-semibold text-white">
              {rfq.baseAmount.toLocaleString()} {base}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs text-white/50 mb-1">Min Quote</div>
            <div className="text-sm font-semibold text-white">
              {rfq.minQuoteAmount.toLocaleString()} {quote}
            </div>
          </div>
        </div>

        {/* Bond & Expiry */}
        <div className="flex gap-4 lg:w-80">
          <div className="flex-1">
            <div className="text-xs text-white/50 mb-1">Bond Required</div>
            <div className="text-sm font-semibold text-white">
              {rfq.bondAmount.toLocaleString()} USDC
            </div>
          </div>
          {rfq.expiresIn && (
            <div className="flex-1">
              <div className="text-xs text-orange-400 mb-1">Expires In</div>
              <div className="text-sm font-semibold text-orange-400">{rfq.expiresIn}</div>
            </div>
          )}
          {isCommitted && (
            <div className="flex-1">
              <div className="text-xs text-blue-400 mb-1">Commitments</div>
              <div className="text-sm font-semibold text-blue-400">{rfq.committedCount}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 lg:w-48">
          <Button
            onClick={onView}
            variant="outline"
            size="sm"
            className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 text-sm"
          >
            <Eye className="mr-1 h-3 w-3" />
            View
          </Button>
          {isMyRFQ && rfq.state === "Draft" && onEdit && (
            <Button
              onClick={onEdit}
              size="sm"
              className="flex-1 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-semibold shadow-lg shadow-purple-500/20 text-sm"
            >
              <Edit3 className="mr-1 h-3 w-3" />
              Edit
            </Button>
          )}
          {canQuote && !isMyRFQ && (
            <Button
              onClick={onQuote}
              size="sm"
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/20 text-sm"
            >
              <MousePointerClick className="mr-1 h-3 w-3" />
              Quote
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
