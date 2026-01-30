import { RFQState } from "@/app/App";
import { getStatusConfig } from "@/app/data/mockRFQs";

interface StatusBadgeProps {
  status: RFQState;
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({ status, showIcon = false, className = "" }: StatusBadgeProps) {
  const statusConfig = getStatusConfig(status);
  
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} border border-current/20 transition-all ${className}`}
    >
      {statusConfig.label}
    </div>
  );
}
