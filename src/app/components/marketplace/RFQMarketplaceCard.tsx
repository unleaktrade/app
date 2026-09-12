import { motion } from "motion/react";
import type { RFQ } from "@/types/rfq";
import { Button } from "@/app/components/ui/button";
import { StatusBadge } from "@/app/components/StatusBadge";
import { useRfqCardModel } from "@/app/components/marketplace/RfqCardModel";
import { Activity, Clock, Shield, Coins, MousePointerClick, BadgeCheck, Edit3 } from "lucide-react";

export interface RFQMarketplaceCardProps {
  rfq: RFQ;
  currentUser: string | null;
  onQuote: () => void;
  onView: () => void;
  onEdit?: () => void;
  /** Position in the rendered list — drives the capped entrance stagger. */
  index?: number;
}

export function RFQMarketplaceCard({
  rfq,
  currentUser,
  onQuote,
  onView,
  onEdit,
  index = 0,
}: RFQMarketplaceCardProps) {
  const { base, quote, isCommitted, canQuote, isMyRFQ, cardGradient, cardBorder, myRFQStyles } =
    useRfqCardModel(rfq, currentUser);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: Math.min(index, 12) * 0.04 }}
      className={`group relative ${cardGradient} backdrop-blur-sm border ${
        isMyRFQ ? `${myRFQStyles.border} animate-pulse-glow` : cardBorder
      } rounded-lg sm:rounded-xl p-4 sm:p-5 transition-all`}
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
            {/* Triangle for ribbon effect */}
            <div
              className={`absolute -bottom-1 left-0 w-0 h-0 border-l-[6px] border-l-transparent border-t-[4px] ${myRFQStyles.triangle} border-r-[6px] border-r-transparent`}
            ></div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
          <span className="font-semibold text-base sm:text-lg text-white">{rfq.pair}</span>
        </div>
        <StatusBadge status={rfq.state} />
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="bg-white/5 rounded-lg p-2 sm:p-3">
          <div className="text-xs text-white/50 mb-1">Base Amount</div>
          <div className="text-xs sm:text-sm font-bold text-white truncate">
            {rfq.baseAmount.toLocaleString()}
          </div>
          <div className="text-xs text-white/40">{base}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 sm:p-3">
          <div className="text-xs text-white/50 mb-1">Min Quote</div>
          <div className="text-xs sm:text-sm font-bold text-white truncate">
            {rfq.minQuoteAmount.toLocaleString()}
          </div>
          <div className="text-xs text-white/40">{quote}</div>
        </div>
      </div>

      {/* Bond & Expiry */}
      <div className="space-y-2 mb-3 sm:mb-4">
        <div className="flex items-center justify-between text-xs bg-white/5 rounded p-2">
          <div className="flex items-center gap-2 text-white/50">
            <Shield className="h-3 w-3 text-cyan-400" />
            <span>Bond Required</span>
          </div>
          <span className="font-semibold text-white">{rfq.bondAmount.toLocaleString()} USDC</span>
        </div>

        {rfq.expiresIn && (
          <div className="flex items-center justify-between text-xs bg-orange-500/10 border border-orange-500/20 rounded p-2">
            <div className="flex items-center gap-2 text-orange-400">
              <Clock className="h-3 w-3" />
              <span>Expires in</span>
            </div>
            <span className="font-semibold text-orange-400">{rfq.expiresIn}</span>
          </div>
        )}

        {isCommitted && (
          <div className="flex items-center justify-between text-xs bg-blue-500/10 border border-blue-500/20 rounded p-2">
            <div className="flex items-center gap-2 text-blue-400">
              <Activity className="h-3 w-3" />
              <span>Commitments</span>
            </div>
            <span className="font-semibold text-blue-400">{rfq.committedCount}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={onView}
          variant="outline"
          size="sm"
          className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 text-xs sm:text-sm"
        >
          View
        </Button>
        {isMyRFQ && rfq.state === "Draft" && onEdit && (
          <Button
            onClick={onEdit}
            size="sm"
            className="flex-1 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-semibold shadow-lg shadow-purple-500/20 text-xs sm:text-sm"
          >
            <Edit3 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Edit
          </Button>
        )}
        {canQuote && !isMyRFQ && (
          <Button
            onClick={onQuote}
            size="sm"
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/20 text-xs sm:text-sm"
          >
            <MousePointerClick className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Quote
          </Button>
        )}
      </div>
    </motion.div>
  );
}
