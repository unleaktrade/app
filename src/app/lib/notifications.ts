import type { RFQState } from "@/types/rfq";

// In-app notification store (issue #16 notification center). Pure functions +
// localStorage persistence so the whole thing is node-unit-testable. State
// transitions are detected by diffing successive TanStack-Query snapshots of
// the RFQs the wallet is involved in — no polling, no extra websockets.

export interface AppNotification {
  /** Stable identity: one notification per (rfq, arrived-at state). */
  id: string;
  /** Base58 RFQ address. */
  rfq: string;
  /** Trading pair label for the row copy (e.g. "wSOL/USDC"). */
  pair: string;
  from: RFQState;
  to: RFQState;
  /** Unix ms when the transition was observed locally. */
  at: number;
  read: boolean;
}

export interface RfqStateSnapshot {
  rfq: string;
  pair: string;
  state: RFQState;
}

/** Cap: the inbox is a recency window, not an archive. */
export const MAX_NOTIFICATIONS = 50;

export function notificationId(rfq: string, to: RFQState, at: number): string {
  return `${rfq}:${to}:${at}`;
}

/**
 * Diff two snapshots of the relevant RFQ set. Only RFQs present in BOTH maps
 * with a different state produce a transition — an RFQ appearing for the first
 * time is a seed, not news (prevents backlog spam on first load), and one
 * disappearing (closed account) has no destination state to report.
 */
export function diffRfqStates(
  prev: ReadonlyMap<string, RfqStateSnapshot>,
  next: ReadonlyMap<string, RfqStateSnapshot>,
  at: number,
): AppNotification[] {
  const out: AppNotification[] = [];
  for (const [key, snapshot] of next) {
    const before = prev.get(key);
    if (!before || before.state === snapshot.state) continue;
    out.push({
      id: notificationId(key, snapshot.state, at),
      rfq: key,
      pair: snapshot.pair,
      from: before.state,
      to: snapshot.state,
      at,
      read: false,
    });
  }
  return out;
}

/** Prepend fresh items, dedupe by id, enforce the cap (newest kept). */
export function mergeNotifications(
  existing: AppNotification[],
  fresh: AppNotification[],
): AppNotification[] {
  const seen = new Set<string>();
  const merged: AppNotification[] = [];
  for (const n of [...fresh, ...existing]) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    merged.push(n);
    if (merged.length >= MAX_NOTIFICATIONS) break;
  }
  return merged;
}

export function unreadCount(items: AppNotification[]): number {
  return items.reduce((acc, n) => acc + (n.read ? 0 : 1), 0);
}

export function markAllRead(items: AppNotification[]): AppNotification[] {
  return items.map((n) => (n.read ? n : { ...n, read: true }));
}

// --- persistence (best-effort; storage disabled ⇒ in-memory only) ----------

function storageKey(wallet: string): string {
  return `unleak.notifications.${wallet}`;
}

export function loadNotifications(wallet: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(storageKey(wallet));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isNotification).slice(0, MAX_NOTIFICATIONS);
  } catch {
    return [];
  }
}

export function saveNotifications(wallet: string, items: AppNotification[]): void {
  try {
    localStorage.setItem(storageKey(wallet), JSON.stringify(items.slice(0, MAX_NOTIFICATIONS)));
  } catch {
    // storage full / disabled — the in-memory list still works this session.
  }
}

function isNotification(value: unknown): value is AppNotification {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.rfq === "string" &&
    typeof v.pair === "string" &&
    typeof v.from === "string" &&
    typeof v.to === "string" &&
    typeof v.at === "number" &&
    typeof v.read === "boolean"
  );
}

/** "3m ago" style relative time — coarse on purpose. */
export function timeAgo(atMs: number, nowMs: number = Date.now()): string {
  const s = Math.max(0, Math.floor((nowMs - atMs) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
