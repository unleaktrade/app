import { Clock, Coins, Edit, Eye, Loader2, Zap } from "lucide-react";
import type { RFQ } from "@/types/rfq";
import { Button } from "@/app/components/ui/button";
import { StatusBadge } from "@/app/components/StatusBadge";

export function PostedRFQCard({
  rfq,
  busy,
  onView,
  onEdit,
  onOpen,
}: {
  rfq: RFQ;
  busy?: boolean;
  onView: () => void;
  onEdit?: () => void;
  onOpen?: () => void;
}) {
  return (
    <div className="flex-shrink-0 w-72 bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Coins className="h-4 w-4 text-cyan-400 flex-shrink-0" />
          <span className="font-semibold text-sm text-white truncate">{rfq.pair}</span>
        </div>
        <StatusBadge status={rfq.state} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <div className="text-xs text-white/50 mb-1">Base</div>
          <div className="text-sm font-bold text-white truncate">
            {rfq.baseAmount.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-white/50 mb-1">Min Quote</div>
          <div className="text-sm font-bold text-white truncate">
            {rfq.minQuoteAmount.toLocaleString()}
          </div>
        </div>
      </div>

      {rfq.expiresIn && (
        <div className="flex items-center gap-2 text-xs text-orange-400 mb-3 bg-orange-500/10 rounded p-2">
          <Clock className="h-3 w-3" />
          <span>Expires in {rfq.expiresIn}</span>
        </div>
      )}

      <Button
        onClick={onView}
        size="sm"
        variant="outline"
        className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30"
      >
        <Eye className="mr-2 h-4 w-4" />
        View
      </Button>

      {onOpen && (
        <Button
          onClick={onOpen}
          disabled={busy}
          size="sm"
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/20 mt-2 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Zap className="mr-2 h-4 w-4" />
          )}
          Open
        </Button>
      )}

      {onEdit && (
        <Button
          onClick={onEdit}
          disabled={busy}
          size="sm"
          variant="outline"
          className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 mt-2 disabled:opacity-60"
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit Draft
        </Button>
      )}
    </div>
  );
}
