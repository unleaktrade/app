import { motion } from "motion/react";
import { useCountdown } from "@/app/hooks/useCountdown";
import { formatDuration } from "@/app/lib/format";
import { cn } from "@/app/components/ui/utils";

interface DeadlineRingProps {
  /** Unix-seconds deadline; null renders an idle (empty) ring. */
  deadlineSec: number | null;
  /** Full window length in seconds — defines 100% of the ring. */
  totalSec: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const GREEN = "#34d399"; // emerald-400
const AMBER = "#fbbf24"; // amber-400
const RED = "#f87171"; // red-400

/** Circular countdown: green → amber (≤ ⅓ left) → red (≤ ⅒ left). */
export function DeadlineRing({
  deadlineSec,
  totalSec,
  size = 64,
  strokeWidth = 5,
  className,
}: DeadlineRingProps) {
  const { remainingSec, expired } = useCountdown(deadlineSec);
  const fraction = totalSec > 0 ? Math.min(1, Math.max(0, remainingSec / totalSec)) : 0;
  const color = fraction <= 0.1 ? RED : fraction <= 1 / 3 ? AMBER : GREEN;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="timer"
      aria-label={expired ? "Deadline passed" : `${formatDuration(remainingSec)} remaining`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - fraction), stroke: color }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </svg>
      <span
        className={cn(
          "absolute text-[10px] font-medium tabular-nums",
          expired ? "text-red-400" : "text-white/80",
        )}
      >
        {deadlineSec === null ? "—" : expired ? "Ended" : formatDuration(remainingSec)}
      </span>
    </div>
  );
}
