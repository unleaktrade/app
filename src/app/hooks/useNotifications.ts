import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  useFacilitatorRewardTrackersByFacilitator,
  useQuoteAccountsByTaker,
  useRfqAccounts,
} from "@/chain/accounts/lists";
import {
  diffRfqStates,
  loadNotifications,
  markAllRead,
  mergeNotifications,
  saveNotifications,
  unreadCount,
  type AppNotification,
  type RfqStateSnapshot,
} from "@/app/lib/notifications";
import { resolveTokenMeta } from "@/app/lib/tokens";

/**
 * State-transition inbox for the RFQs the connected wallet is involved in:
 * posted by it, quoted by it, or naming it as reward recipient. Composes the
 * queries the app already runs (react-query dedupes on the shared keys), so
 * freshness comes from cache updates — focus refetches and the detail-page
 * account subscriptions — with NO new websockets and NO polling. The first
 * snapshot per wallet seeds the diff baseline silently (no backlog spam).
 */
export function useNotifications() {
  const { publicKey } = useWallet();
  const me = publicKey?.toBase58() ?? null;

  const rfqsQuery = useRfqAccounts();
  const myQuotesQuery = useQuoteAccountsByTaker(publicKey ?? null);
  const rewardsQuery = useFacilitatorRewardTrackersByFacilitator(publicKey ?? null);

  const [items, setItems] = useState<AppNotification[]>([]);
  const lastSeen = useRef<Map<string, RfqStateSnapshot> | null>(null);
  const walletRef = useRef<string | null>(null);

  // Wallet switch: reload that wallet's persisted inbox, reset the baseline.
  useEffect(() => {
    if (me === walletRef.current) return;
    walletRef.current = me;
    lastSeen.current = null;
    setItems(me === null ? [] : loadNotifications(me));
  }, [me]);

  useEffect(() => {
    if (me === null || rfqsQuery.data === undefined) return;

    const quotedRfqs = new Set((myQuotesQuery.data ?? []).map((q) => q.account.rfq.toBase58()));
    const rewardRfqs = new Set((rewardsQuery.data ?? []).map((r) => r.account.rfq.toBase58()));

    const snapshot = new Map<string, RfqStateSnapshot>();
    for (const row of rfqsQuery.data) {
      const key = row.publicKey.toBase58();
      const account = row.account;
      const involved =
        account.maker.toBase58() === me ||
        account.facilitator?.toBase58() === me ||
        quotedRfqs.has(key) ||
        rewardRfqs.has(key);
      if (!involved) continue;
      snapshot.set(key, {
        rfq: key,
        pair: `${resolveTokenMeta(account.baseMint.toBase58()).symbol}/${resolveTokenMeta(account.quoteMint.toBase58()).symbol}`,
        state: account.state,
      });
    }

    if (lastSeen.current === null) {
      lastSeen.current = snapshot;
      return;
    }
    const fresh = diffRfqStates(lastSeen.current, snapshot, Date.now());
    lastSeen.current = snapshot;
    if (fresh.length === 0) return;
    setItems((prev) => {
      const merged = mergeNotifications(prev, fresh);
      saveNotifications(me, merged);
      return merged;
    });
  }, [me, rfqsQuery.data, myQuotesQuery.data, rewardsQuery.data]);

  const markRead = useCallback(() => {
    setItems((prev) => {
      const next = markAllRead(prev);
      if (me !== null) saveNotifications(me, next);
      return next;
    });
  }, [me]);

  return { items, unread: unreadCount(items), markAllRead: markRead };
}
