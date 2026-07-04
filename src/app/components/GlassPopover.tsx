import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/app/components/ui/utils";

interface GlassPopoverProps {
  /** Accessible name for the dialog. */
  label: string;
  onClose: () => void;
  children: ReactNode;
  /** Extra classes on the panel (width, padding overrides). */
  className?: string;
}

/**
 * Anchored glass panel for navbar controls (notification inbox, guard
 * status). Renders absolutely below its `relative` parent; dismisses on
 * Escape or outside pointer-down. The enter animation is CSS-driven
 * (tw-animate-css) on purpose — a compositor animation always completes, so
 * a stalled JS tween can never leave the panel stuck invisible. Deliberately
 * not a new Radix dep — the focus/dismiss surface is small enough to own.
 */
export function GlassPopover({ label, onClose, children, className }: GlassPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onPointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", onKey);
    // Defer so the opening click doesn't immediately dismiss.
    const t = setTimeout(() => document.addEventListener("pointerdown", onPointerDown), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={label}
      className={cn(
        "glass-panel absolute right-0 top-full z-50 mt-2 w-96 max-w-[90vw] rounded-xl p-3",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:slide-in-from-top-1 motion-safe:duration-150",
        className,
      )}
    >
      {children}
    </div>
  );
}
