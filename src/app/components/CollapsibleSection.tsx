import { useState, type ComponentType, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, ChevronDown } from "lucide-react";

interface CollapsibleSectionProps {
  id: string;
  title: string;
  count: number;
  needsAttentionCount?: number;
  icon: ComponentType<{ className?: string }>;
  /**
   * Whether the section should be open when the user has not toggled it. It
   * is re-evaluated on every render, so a section that had nothing pending at
   * mount still auto-expands when a pending item arrives later; an explicit
   * user toggle always wins from then on.
   */
  defaultOpen: boolean;
  action?: ReactNode;
  children: ReactNode;
}

export function CollapsibleSection({
  id,
  title,
  count,
  needsAttentionCount = 0,
  icon: Icon,
  defaultOpen,
  action,
  children,
}: CollapsibleSectionProps) {
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? defaultOpen;

  return (
    <div
      id={id}
      className="rounded-lg sm:rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.02] backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setOverride(!open)}
          className="flex items-center gap-3 min-w-0 flex-1 text-left group"
          aria-expanded={open}
          aria-controls={`${id}-body`}
        >
          <div className="p-2 rounded-lg bg-white/10 flex-shrink-0">
            <Icon className="h-4 w-4 text-white/80" />
          </div>
          <div className="flex items-baseline gap-2 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-white truncate group-hover:text-white/90">
              {title} <span className="text-white/40 font-normal">({count})</span>
            </h3>
            {needsAttentionCount > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                <AlertCircle className="h-3 w-3" />
                {needsAttentionCount} need action
              </span>
            )}
          </div>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="ml-2 flex-shrink-0"
          >
            <ChevronDown className="h-5 w-5 text-white/60" />
          </motion.div>
        </button>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            id={`${id}-body`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
