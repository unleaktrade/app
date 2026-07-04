import { cn } from "@/app/components/ui/utils";

type SkeletonVariant = "cards" | "detail" | "stats" | "table";

interface SkeletonListProps {
  /** Number of placeholder cards / rows (ignored by the `detail` variant). */
  count?: number;
  /** Geometry preset — each mirrors its real component so swapping in live
   * content causes no layout shift. */
  variant?: SkeletonVariant;
  className?: string;
}

function CardSkeleton() {
  return (
    <div className="skeleton-shimmer rounded-xl border border-white/10 bg-white/[0.03] p-5">
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
  );
}

/** Mirrors AdaptiveRFQDetail: header row + state pipeline rail + metric grid. */
function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton-shimmer rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-40 rounded bg-white/10" />
            <div className="h-3 w-64 rounded bg-white/5" />
          </div>
          <div className="h-16 w-16 rounded-full bg-white/5" />
        </div>
        <div className="mb-6 flex items-center gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-8 w-8 rounded-full bg-white/5" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-16 rounded-lg bg-white/5" />
          ))}
        </div>
      </div>
      <div className="skeleton-shimmer h-24 rounded-xl border border-white/10 bg-white/[0.03]" />
    </div>
  );
}

function StatTileSkeleton() {
  return (
    <div className="skeleton-shimmer rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 h-3 w-20 rounded bg-white/10" />
      <div className="h-7 w-16 rounded bg-white/10" />
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div className="skeleton-shimmer flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="h-4 w-28 rounded bg-white/10" />
      <div className="h-4 w-20 rounded bg-white/5" />
      <div className="ml-auto h-4 w-24 rounded bg-white/10" />
    </div>
  );
}

/** Shimmering placeholders matching each screen's real geometry. */
export function SkeletonList({ count = 3, variant = "cards", className }: SkeletonListProps) {
  if (variant === "detail") {
    return (
      <div className={className} aria-busy="true">
        <DetailSkeleton />
      </div>
    );
  }
  if (variant === "stats") {
    return (
      <div
        className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", className)}
        aria-busy="true"
      >
        {Array.from({ length: count }, (_, index) => (
          <StatTileSkeleton key={index} />
        ))}
      </div>
    );
  }
  if (variant === "table") {
    return (
      <div className={cn("space-y-2", className)} aria-busy="true">
        {Array.from({ length: count }, (_, index) => (
          <TableRowSkeleton key={index} />
        ))}
      </div>
    );
  }
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)} aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}
