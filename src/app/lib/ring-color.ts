export const RING_GREEN = "#34d399"; // emerald-400
export const RING_AMBER = "#fbbf24"; // amber-400
export const RING_RED = "#f87171"; // red-400

/** Pure threshold → color mapping for DeadlineRing: green → amber (≤ ⅓ of the
 * window left) → red (≤ ⅒ left). Unit-tested against these boundaries. */
export function ringColor(fraction: number): string {
  return fraction <= 0.1 ? RING_RED : fraction <= 1 / 3 ? RING_AMBER : RING_GREEN;
}
