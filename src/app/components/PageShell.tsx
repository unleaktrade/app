import { type ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
  /**
   * "list" pages breathe below the navbar (Marketplace, MyActivity);
   * "detail" pages sit flush and let their container add its own py
   * (RFQ detail, reveal/settle cockpits).
   */
  variant?: "list" | "detail";
  /** Accent of the two decorative blur orbs; false renders none. */
  orbs?: "blue" | "purple" | false;
  /** Max-width utility for the inner container. */
  containerClassName?: string;
}

/**
 * Shared page chrome for every dashboard screen: full-height page surface,
 * navbar-height-aware top padding (--nav-h), decorative orbs, and the
 * centered content container.
 */
export function PageShell({
  children,
  variant = "list",
  orbs = "blue",
  containerClassName = "max-w-7xl",
}: PageShellProps) {
  const padding =
    variant === "list"
      ? "pt-[calc(var(--nav-h)+1rem)] lg:pt-[calc(var(--nav-h)+2rem)] pb-16 sm:pb-32"
      : "pt-(--nav-h) pb-32";

  return (
    <div className={`min-h-screen bg-surface-page ${padding}`}>
      {orbs !== false && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
          <div
            className={`absolute top-60 right-1/4 w-96 h-96 rounded-full blur-3xl ${
              orbs === "purple" ? "bg-purple-500/5" : "bg-blue-500/5"
            }`}
          />
        </div>
      )}
      <div className={`relative mx-auto px-4 sm:px-6 lg:px-8 ${containerClassName}`}>
        {children}
      </div>
    </div>
  );
}
