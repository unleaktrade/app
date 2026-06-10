import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import type { RFQState } from "@/types/rfq";
import { getStatusConfig } from "@/app/lib/rfq-visuals";
import { cn } from "@/app/components/ui/utils";

// Happy path through the 9-state lifecycle; the three failure states branch
// off it (mirrors state/rfq.rs):  Open|Committed → Expired,
// Revealed → Ignored, Selected → Incomplete.
const HAPPY_PATH: RFQState[] = ["Draft", "Open", "Committed", "Revealed", "Selected", "Settled"];

const FAILURE_BRANCH: Partial<Record<RFQState, RFQState>> = {
  Committed: "Expired",
  Revealed: "Ignored",
  Selected: "Incomplete",
};

// For a failure state, how far along the happy path the RFQ travelled.
const FAILURE_PROGRESS: Record<string, number> = {
  Expired: HAPPY_PATH.indexOf("Committed"),
  Ignored: HAPPY_PATH.indexOf("Revealed"),
  Incomplete: HAPPY_PATH.indexOf("Selected"),
};

interface RFQStatePipelineProps {
  state: RFQState;
  className?: string;
}

function NodeCircle({
  status,
  active,
  failure,
}: {
  status: "done" | "current" | "todo";
  active: boolean;
  failure: boolean;
}) {
  return (
    <motion.div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px]",
        failure
          ? active
            ? "border-red-400 bg-red-500/30 text-red-300"
            : "border-red-500/20 bg-red-500/5 text-red-500/40"
          : status === "done"
            ? "border-teal-400/60 bg-teal-500/20 text-teal-300"
            : status === "current"
              ? "border-cyan-400 bg-cyan-500/25 text-cyan-200"
              : "border-white/15 bg-white/5 text-white/30",
      )}
      animate={
        active
          ? {
              boxShadow: [
                `0 0 0px 0px ${failure ? "rgba(248,113,113,0.0)" : "rgba(34,211,238,0.0)"}`,
                `0 0 14px 3px ${failure ? "rgba(248,113,113,0.45)" : "rgba(34,211,238,0.45)"}`,
                `0 0 0px 0px ${failure ? "rgba(248,113,113,0.0)" : "rgba(34,211,238,0.0)"}`,
              ],
            }
          : { boxShadow: "0 0 0px 0px rgba(0,0,0,0)" }
      }
      transition={active ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      {failure ? (
        <X className="h-3.5 w-3.5" />
      ) : status === "done" ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
    </motion.div>
  );
}

/**
 * Horizontal 9-node lifecycle stepper. The 6 happy-path states form the rail;
 * Expired / Ignored / Incomplete hang beneath their branch points in red. The
 * current state pulses. Scrolls horizontally below md.
 */
export function RFQStatePipeline({ state, className }: RFQStatePipelineProps) {
  const isFailure = state in FAILURE_PROGRESS;
  const progress = isFailure ? (FAILURE_PROGRESS[state] ?? 0) : HAPPY_PATH.indexOf(state);

  return (
    <div
      className={cn(
        "flex items-start gap-0 overflow-x-auto pb-1 snap-x snap-mandatory md:snap-none",
        className,
      )}
      aria-label={`Lifecycle: ${getStatusConfig(state).label}`}
    >
      {HAPPY_PATH.map((node, index) => {
        const branch = FAILURE_BRANCH[node];
        const nodeStatus: "done" | "current" | "todo" = isFailure
          ? index <= progress
            ? "done"
            : "todo"
          : index < progress
            ? "done"
            : index === progress
              ? "current"
              : "todo";
        const branchActive = isFailure && branch === state;
        const config = getStatusConfig(node);

        return (
          <div key={node} className="flex snap-start items-start">
            {index > 0 && (
              <div
                className={cn(
                  "mt-3.5 h-px w-5 sm:w-8",
                  nodeStatus === "todo" ? "bg-white/10" : "bg-teal-400/40",
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <NodeCircle status={nodeStatus} active={nodeStatus === "current"} failure={false} />
              <span
                className={cn(
                  "text-[10px] leading-tight",
                  nodeStatus === "current" ? config.color : "text-white/40",
                )}
                title={config.description}
              >
                {config.label}
              </span>

              {branch && (
                <>
                  <div className={cn("h-3 w-px", branchActive ? "bg-red-400/60" : "bg-white/10")} />
                  <NodeCircle status="todo" active={branchActive} failure />
                  <span
                    className={cn(
                      "text-[10px] leading-tight",
                      branchActive ? "text-red-400" : "text-red-500/40",
                    )}
                    title={getStatusConfig(branch).description}
                  >
                    {getStatusConfig(branch).label}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
