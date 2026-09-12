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
import { useResolveTokenMeta } from "@/app/hooks/useResolveTokenMeta";

/**
 * State-transition inbox for the RFQs the connected wallet is involved in:
 * posted by it, quoted by it, or naming it as reward recipient. Composes the
 * queries the app already runs (react-query dedupes on the shared keys), so
 * freshness comes from cache updates — focus refetches and the detail-page
 * account subscriptions — with NO new websockets and NO polling. The first
 * snapshot per wallet seeds the diff baseline silently (no backlog spam).
 */
interface Inbox {
  wallet: string | null;
  items: AppNotification[];
}

export function useNotifications() {
  const { publicKey } = useWallet();
  const me = publicKey?.toBase58() ?? null;

  const rfqsQuery = useRfqAccounts();
  const myQuotesQuery = useQuoteAccountsByTaker(publicKey ?? null);
  const rewardsQuery = useFacilitatorRewardTrackersByFacilitator(publicKey ?? null);
  const resolveToken = useResolveTokenMeta();

  // The inbox is keyed by wallet: switching wallets swaps to that wallet's
  // persisted items and drops the diff baseline in the same render (no
  // "reset on prop change" effect).
  const [inbox, setInbox] = useState<Inbox>(() => ({
    wallet: me,
    items: me === null ? [] : loadNotifications(me),
  }));
  if (inbox.wallet !== me) {
    setInbox({ wallet: me, items: me === null ? [] : loadNotifications(me) });
  }
  const items = inbox.wallet === me ? inbox.items : me === null ? [] : loadNotifications(me);
  // Diff baseline per wallet; `wallet` mismatch means "seed silently".
  const lastSeen = useRef<{ wallet: string | null; map: Map<string, RfqStateSnapshot> } | null>(
    null,
  );

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
        pair: `${resolveToken(account.baseMint.toBase58()).symbol}/${resolveToken(account.quoteMint.toBase58()).symbol}`,
        state: account.state,
      });
    }

    if (lastSeen.current === null || lastSeen.current.wallet !== me) {
      lastSeen.current = { wallet: me, map: snapshot };
      return;
    }
    const fresh = diffRfqStates(lastSeen.current.map, snapshot, Date.now());
    lastSeen.current = { wallet: me, map: snapshot };
    if (fresh.length === 0) return;
    setInbox((prev) => {
      const merged = mergeNotifications(prev.items, fresh);
      saveNotifications(me, merged);
      return { wallet: prev.wallet, items: merged };
    });
  }, [me, rfqsQuery.data, myQuotesQuery.data, rewardsQuery.data, resolveToken]);

  const markRead = useCallback(() => {
    setInbox((prev) => {
      const next = markAllRead(prev.items);
      if (me !== null) saveNotifications(me, next);
      return { wallet: prev.wallet, items: next };
    });
  }, [me]);

  return { items, unread: unreadCount(items), markAllRead: markRead };
}
