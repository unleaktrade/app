import confetti from "canvas-confetti";

/**
 * Celebration burst when a settlement completes. No-op under
 * prefers-reduced-motion (canvas-confetti is imperative, so the global
 * <MotionConfig reducedMotion="user"> cannot gate it).
 */
export function fireSettlementConfetti(): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const defaults = {
    disableForReducedMotion: true,
    colors: ["#22d3ee", "#a78bfa", "#34d399", "#e879f9", "#fbbf24"],
    zIndex: 2000,
  };
  void confetti({ ...defaults, particleCount: 90, spread: 70, origin: { x: 0.5, y: 0.6 } });
  // Two side bursts slightly later for depth.
  setTimeout(() => {
    void confetti({ ...defaults, particleCount: 45, angle: 60, spread: 55, origin: { x: 0 } });
    void confetti({ ...defaults, particleCount: 45, angle: 120, spread: 55, origin: { x: 1 } });
  }, 180);
}
