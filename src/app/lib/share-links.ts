import type { RfqActionId } from "@/app/lib/rfq-actions";

// Deep-link URLs (issue #16): /dashboard/rfq/:id?action=<id> preloads the
// matching modal/flow — but only when that action is legal for the connected
// wallet × current state (RFQActionBar gates on deriveRfqActions), so a
// foreign or stale link degrades to the plain detail page.

/** Action ids that make sense to arrive from a shared URL. */
export const SHAREABLE_ACTIONS: ReadonlySet<string> = new Set<RfqActionId>([
  "commit",
  "edit",
  "open",
  "reveal",
  "settle",
  "refundBond",
  "claimReward",
]);

export function parseRequestedAction(raw: string | null): RfqActionId | null {
  return raw !== null && SHAREABLE_ACTIONS.has(raw) ? (raw as RfqActionId) : null;
}

/** Path (origin-less, router-friendly) for an RFQ detail deep link. */
export function rfqDeepLinkPath(rfqPda: string, action?: RfqActionId): string {
  const base = `/dashboard/rfq/${rfqPda}`;
  return action ? `${base}?action=${action}` : base;
}

/** Absolute URL for sharing outside the app (clipboard, QR). */
export function rfqDeepLinkUrl(origin: string, rfqPda: string, action?: RfqActionId): string {
  return `${origin}${rfqDeepLinkPath(rfqPda, action)}`;
}
