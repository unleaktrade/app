import { CheckCircle2, Clock, Coins, Eye, Lock, Unlock, Zap } from "lucide-react";
import type { Quote, RFQ } from "@/types/rfq";
import { Button } from "@/app/components/ui/button";
import { StatusBadge } from "@/app/components/StatusBadge";

export function SubmittedQuoteCard({
  quote,
  rfq,
  onView,
  onReveal,
  onSettle,
}: {
  quote: Quote;
  rfq: RFQ | undefined;
  onView: () => void;
  onReveal?: () => void;
  onSettle?: () => void;
}) {
  const isRevealed = quote.revealedAt !== null;
  const decided =
    rfq !== undefined &&
    (rfq.state === "Selected" || rfq.state === "Settled" || rfq.state === "Incomplete");
  const notSelected = decided && !quote.selected;

  return (
    <div
      className={`flex-shrink-0 w-72 bg-white/5 border rounded-lg p-4 hover:border-white/20 transition-all ${
        quote.selected ? "border-cyan-500/40 bg-cyan-500/5" : "border-white/10"
      }`}
    >
      {quote.selected && (
        <div className="flex items-center gap-2 text-xs text-cyan-400 mb-2 font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          <span>Selected</span>
        </div>
      )}
      {notSelected && (
        <div className="flex items-center gap-2 text-xs text-white/40 mb-2 font-semibold">
          <span>Not selected</span>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Coins className="h-4 w-4 text-cyan-400 flex-shrink-0" />
          <span className="font-semibold text-sm text-white truncate">{rfq ? rfq.pair : "—"}</span>
        </div>
        {rfq && <StatusBadge status={rfq.state} />}
      </div>

      <div className="space-y-2 mb-3">
        {rfq && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-white/50">RFQ Base</span>
            <span className="text-white font-medium">{rfq.baseAmount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-xs">
          <span className="text-white/50">Your Quote</span>
          <div className="flex items-center gap-2">
            {isRevealed ? (
              <Unlock className="h-3 w-3 text-cyan-400" />
            ) : (
              <Lock className="h-3 w-3 text-orange-400" />
            )}
            <span className={`font-bold ${isRevealed ? "text-cyan-400" : "text-orange-400"}`}>
              {quote.quoteAmount !== null ? quote.quoteAmount.toLocaleString() : "Hidden"}
            </span>
          </div>
        </div>
      </div>

      {rfq?.expiresIn && (
        <div className="flex items-center gap-2 text-xs text-orange-400 mb-3 bg-orange-500/10 rounded p-2">
          <Clock className="h-3 w-3" />
          <span>
            {rfq.state === "Committed" && !isRevealed
              ? `Reveal within ${rfq.expiresIn}`
              : rfq.state === "Selected" && quote.selected
                ? `Settle within ${rfq.expiresIn}`
                : `Expires in ${rfq.expiresIn}`}
          </span>
        </div>
      )}

      {quote.bondsRefundedAt !== null && (
        <div className="flex items-center gap-2 text-xs text-state-settled mb-3 bg-state-settled/10 rounded p-2">
          <CheckCircle2 className="h-3 w-3" />
          <span>Bond refunded</span>
        </div>
      )}

      <Button
        onClick={onView}
        size="sm"
        variant="outline"
        className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30"
      >
        <Eye className="mr-2 h-4 w-4" />
        View RFQ
      </Button>

      {onReveal && (
        <Button
          onClick={onReveal}
          size="sm"
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold mt-2"
        >
          <Unlock className="mr-2 h-4 w-4" />
          Reveal
        </Button>
      )}
      {onSettle && (
        <Button
          onClick={onSettle}
          size="sm"
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold mt-2"
        >
          <Zap className="mr-2 h-4 w-4" />
          Settle
        </Button>
      )}
    </div>
  );
}
