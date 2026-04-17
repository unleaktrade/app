import type { RFQState } from "@/types/rfq";
import { getStatusConfig } from "@/data/mock";

interface StatusBadgeProps {
  status: RFQState;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const statusConfig = getStatusConfig(status);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} border border-current/20 transition-all ${className}`}
    >
      {statusConfig.label}
    </div>
  );
}
