import { RFQ, UserRole } from "@/app/App";
import { motion } from "motion/react";
import { Button } from "@/app/components/ui/button";
import { TrendingUp, Eye } from "lucide-react";
import { getCardGradient, getCardBorder, getCardGlow } from "@/app/data/mockRFQs";
import { StatusBadge } from "@/app/components/StatusBadge";

interface RFQCardProps {
  rfq: RFQ;
  onView: () => void;
  userRole: UserRole;
}

export function RFQCard({ rfq, onView, userRole }: RFQCardProps) {
  // Calculate pair and base/quote from the RFQ data
  const pair = `${rfq.baseMint}/${rfq.quoteMint}`;
  const base = rfq.baseMint;
  const quote = rfq.quoteMint;
  
  // Calculate exchange rate (price per base unit)
  const exchangeRate = rfq.minQuoteAmount / rfq.baseAmount;

  // Calculate time left
  const timeLeft = rfq.openedAt ? Math.max(0, rfq.commitTtl - (Date.now() - rfq.openedAt) / 1000) : 0;
  const hoursLeft = Math.floor(timeLeft / 3600);
  const minutesLeft = Math.floor((timeLeft % 3600) / 60);
  const expiresText = timeLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`relative overflow-hidden ${getCardGradient(rfq.state)} backdrop-blur-sm border ${getCardBorder(rfq.state)} rounded-xl p-5 transition-all group cursor-pointer`}
      onClick={onView}
    >
      {/* Glossy gradient overlay on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getCardGlow(rfq.state)} transition-all duration-300`} />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs font-mono text-white/40 mb-1">RFQ ID</div>
            <div className="text-sm font-mono text-white">{rfq.id}</div>
          </div>
          <StatusBadge status={rfq.state} />
        </div>

        {/* Pair */}
        <div className="mb-4">
          <div className="text-xs text-white/50 mb-1">Pair</div>
          <div className="flex items-center gap-1 text-lg font-semibold text-white">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            {pair}
          </div>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <div className="text-xs text-white/50 mb-1">Base Amount</div>
            <div className="text-sm font-semibold text-white">{rfq.baseAmount.toLocaleString()}</div>
            <div className="text-xs text-white/40">{base}</div>
          </div>
          <div>
            <div className="text-xs text-white/50 mb-1">Min Quote Amount</div>
            <div className="text-sm font-semibold text-white">{rfq.minQuoteAmount.toLocaleString()}</div>
            <div className="text-xs text-white/40">{quote}</div>
          </div>
        </div>

        {/* Exchange Rate */}
        <div className="mb-4 pb-4 border-b border-white/10">
          <div className="text-xs text-white/50 mb-1">Exchange Rate</div>
          <div className="text-sm text-white">1 {base} = {exchangeRate.toFixed(4)} {quote}</div>
        </div>

        {/* Expires */}
        {expiresText && (
          <div className="mb-4 text-xs">
            <span className="text-white/50">Expires in </span>
            <span className="text-cyan-400 font-medium">{expiresText}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="flex-1 border-white/20 text-white hover:bg-white/10"
          >
            <Eye className="mr-2 h-3.5 w-3.5" />
            View
          </Button>
          {rfq.state === "Open" && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            >
              {userRole === "maker" ? "View Details" : "Quote on this RFQ"}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
