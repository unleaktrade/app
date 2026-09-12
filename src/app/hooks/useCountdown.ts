import { useNowSecs } from "./useNowSecs";

export interface Countdown {
  /** Seconds until the deadline, clamped at 0. 0 when deadlineSec is null. */
  remainingSec: number;
  /** True once a real deadline has passed (never true for null deadlines). */
  expired: boolean;
}

/**
 * 1-second ticking countdown to a unix-seconds deadline. Derived from a
 * ticking clock rather than stored, so a deadline change is reflected in the
 * same render (no stale frame) and there is no state to keep in sync.
 */
export function useCountdown(deadlineSec: number | null): Countdown {
  const now = useNowSecs(1_000);
  const remainingSec = deadlineSec === null ? 0 : Math.max(0, deadlineSec - now);
  return { remainingSec, expired: deadlineSec !== null && remainingSec <= 0 };
}
