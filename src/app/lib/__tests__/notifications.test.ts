import { describe, expect, it } from "vitest";
import {
  diffRfqStates,
  mergeNotifications,
  markAllRead,
  unreadCount,
  timeAgo,
  MAX_NOTIFICATIONS,
  type AppNotification,
  type RfqStateSnapshot,
} from "../notifications";

function snap(rfq: string, state: RfqStateSnapshot["state"]): [string, RfqStateSnapshot] {
  return [rfq, { rfq, pair: "wSOL/USDC", state }];
}

function notif(id: string, at = 0, read = false): AppNotification {
  return { id, rfq: "r", pair: "wSOL/USDC", from: "Open", to: "Committed", at, read };
}

describe("diffRfqStates", () => {
  it("emits one transition per changed RFQ", () => {
    const prev = new Map([snap("a", "Open"), snap("b", "Open")]);
    const next = new Map([snap("a", "Committed"), snap("b", "Open")]);
    const out = diffRfqStates(prev, next, 1000);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      rfq: "a",
      from: "Open",
      to: "Committed",
      at: 1000,
      read: false,
    });
  });

  it("treats first-seen RFQs as a silent seed (no backlog spam)", () => {
    const out = diffRfqStates(new Map(), new Map([snap("a", "Settled")]), 0);
    expect(out).toEqual([]);
  });

  it("ignores RFQs that disappeared (closed accounts)", () => {
    const out = diffRfqStates(new Map([snap("a", "Draft")]), new Map(), 0);
    expect(out).toEqual([]);
  });
});

describe("mergeNotifications", () => {
  it("prepends fresh items and dedupes by id", () => {
    const merged = mergeNotifications([notif("x", 1)], [notif("y", 2), notif("x", 1)]);
    expect(merged.map((n) => n.id)).toEqual(["y", "x"]);
  });

  it("caps at MAX_NOTIFICATIONS, dropping the tail of the existing list", () => {
    // The store is newest-first by construction (fresh items are prepended),
    // so the cap keeps the head of [fresh, ...existing] and drops the tail.
    const existing = Array.from({ length: MAX_NOTIFICATIONS }, (_, i) => notif(`old-${i}`, -i));
    const merged = mergeNotifications(existing, [notif("fresh", 999)]);
    expect(merged).toHaveLength(MAX_NOTIFICATIONS);
    expect(merged[0]?.id).toBe("fresh");
    expect(merged.some((n) => n.id === "old-0")).toBe(true);
    expect(merged.some((n) => n.id === `old-${MAX_NOTIFICATIONS - 1}`)).toBe(false);
  });
});

describe("read state", () => {
  it("unreadCount counts only unread", () => {
    expect(unreadCount([notif("a", 0, true), notif("b"), notif("c")])).toBe(2);
  });

  it("markAllRead flips everything once", () => {
    const marked = markAllRead([notif("a"), notif("b", 0, true)]);
    expect(marked.every((n) => n.read)).toBe(true);
  });
});

describe("timeAgo", () => {
  it("buckets coarsely", () => {
    const now = 1_000_000_000_000;
    expect(timeAgo(now - 5_000, now)).toBe("just now");
    expect(timeAgo(now - 3 * 60_000, now)).toBe("3m ago");
    expect(timeAgo(now - 2 * 3_600_000, now)).toBe("2h ago");
    expect(timeAgo(now - 3 * 86_400_000, now)).toBe("3d ago");
  });
});
