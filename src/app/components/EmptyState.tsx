import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/app/components/ui/utils";

interface EmptyStateProps {
  title: string;
  hint?: string;
  icon?: LucideIcon;
  /** Themed inline-SVG illustration (see illustrations.tsx). Replaces the
   * icon when provided. */
  illustration?: ReactNode;
  /** Optional call-to-action (e.g. a Button). */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  hint,
  icon: Icon = Inbox,
  illustration,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-6 py-10 text-center",
        className,
      )}
    >
      {illustration ?? <Icon className="h-8 w-8 text-white/20" />}
      <div className="text-sm font-medium text-white/70">{title}</div>
      {hint && <div className="max-w-sm text-xs text-white/40">{hint}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
