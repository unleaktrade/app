import { useEffect, useState } from "react";

/**
 * Unix seconds, re-evaluated on an interval so deadline-gated UI (action-bar
 * CTAs, the selection table's per-row buttons) flips live when a window
 * opens/closes instead of freezing at the value from the initial render.
 */
export function useNowSecs(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
