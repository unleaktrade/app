import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";

interface ErrorRetryProps {
  message?: string;
  /** Typically a react-query refetch. */
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
}

export function ErrorRetry({
  message = "Something went wrong while loading this data.",
  onRetry,
  retrying = false,
  className,
}: ErrorRetryProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-8 text-center",
        className,
      )}
      role="alert"
    >
      <AlertTriangle className="h-7 w-7 text-red-400/70" />
      <div className="max-w-sm text-sm text-white/70">{message}</div>
      <Button
        size="sm"
        variant="outline"
        onClick={onRetry}
        disabled={retrying}
        className="border-white/20 bg-white/5 text-white/90 hover:bg-white/10"
      >
        <RotateCcw className={cn("mr-2 h-3.5 w-3.5", retrying && "animate-spin")} />
        {retrying ? "Retrying…" : "Retry"}
      </Button>
    </div>
  );
}
