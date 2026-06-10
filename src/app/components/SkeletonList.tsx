import { cn } from "@/app/components/ui/utils";

interface SkeletonListProps {
  /** Number of placeholder cards. */
  count?: number;
  className?: string;
}

/** Pulsing card placeholders matching the RFQCard geometry. */
export function SkeletonList({ count = 3, className }: SkeletonListProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)} aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-white/10 bg-white/[0.03] p-5"
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="h-5 w-16 rounded-full bg-white/10" />
          </div>
          <div className="mb-4 h-5 w-32 rounded bg-white/10" />
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="h-8 rounded bg-white/5" />
            <div className="h-8 rounded bg-white/5" />
          </div>
          <div className="h-8 rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}
