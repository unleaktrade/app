import { useCallback, useSyncExternalStore } from "react";

/**
 * True while `query` matches, live-updating via the matchMedia change event.
 * Pure SPA — no SSR fallback needed.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
