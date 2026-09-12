import { Clock, Edit, HandCoins, Zap } from "lucide-react";
import type { AttentionItem } from "@/app/lib/attention";
import { Button } from "@/app/components/ui/button";

export function AttentionChip({ item, onAction }: { item: AttentionItem; onAction: () => void }) {
  const toneClasses = {
    urgent: "from-orange-500/15 to-red-500/10 border-orange-500/30",
    primary: "from-purple-500/15 to-violet-500/10 border-purple-500/30",
    reward: "from-green-500/15 to-emerald-500/10 border-green-500/30",
  }[item.tone];

  const ctaClasses = {
    urgent: "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600",
    primary:
      "bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600",
    reward:
      "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600",
  }[item.tone];

  const Icon = {
    urgent: Zap,
    primary: Edit,
    reward: HandCoins,
  }[item.tone];

  return (
    <div
      className={`flex-shrink-0 w-64 sm:w-72 rounded-xl border bg-gradient-to-br ${toneClasses} backdrop-blur-sm p-3 flex flex-col justify-between gap-3`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-white/80 flex-shrink-0" />
          <div className="text-sm font-semibold text-white truncate">{item.label}</div>
        </div>
        {item.sublabel && (
          <div className="text-xs text-white/50 truncate pl-6">{item.sublabel}</div>
        )}
        {item.expiresIn && (
          <div className="flex items-center gap-1 text-xs text-orange-300 pl-6 mt-1">
            <Clock className="h-3 w-3" />
            <span>{item.expiresIn}</span>
          </div>
        )}
      </div>
      <Button onClick={onAction} size="sm" className={`${ctaClasses} text-white shadow-lg w-full`}>
        {item.cta}
      </Button>
    </div>
  );
}
