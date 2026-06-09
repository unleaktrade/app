// Pure helpers for the cached sign-in session, kept out of AuthProvider.tsx so
// non-component modules (WalletProviders) can import them without pulling in a
// component module — and without tripping react-refresh/only-export-components.
//
// The signature cache lives in `sessionStorage` (NOT localStorage) keyed
// `unleak.auth.<pubkey>`. sessionStorage survives a page refresh but not a tab
// close, which is exactly the lifetime the #26 auth gate needs: "refresh stays
// signed in, close tab = re-prompt".

export const STORAGE_PREFIX = "unleak.auth.";

/** True when THIS tab session has a cached sign-in signature for any wallet. */
export function hasCachedAuthSession(): boolean {
  if (typeof window === "undefined") return false;
  const ss = window.sessionStorage;
  for (let i = 0; i < ss.length; i += 1) {
    if (ss.key(i)?.startsWith(STORAGE_PREFIX)) return true;
  }
  return false;
}

/**
 * Whether to eagerly reconnect (and block the UI) on load. Only worth it when
 * SWA has a wallet remembered (localStorage "walletName") AND this session was
 * already authenticated — otherwise we'd risk the locked-wallet wedge (#26).
 */
export function shouldAttemptRestore(): boolean {
  if (typeof window === "undefined") return false;
  const walletName = window.localStorage.getItem("walletName");
  return !!walletName && walletName !== "null" && hasCachedAuthSession();
}
