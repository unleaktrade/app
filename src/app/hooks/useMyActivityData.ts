import { useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { Quote, RFQ } from "@/types/rfq";
import {
  useRfqAccounts,
  useQuoteAccountsByTaker,
  useFacilitatorRewardTrackersByFacilitator,
} from "@/chain/accounts/lists";
import { useQuoteAccountsByKeys, useSettlementAccountsByKeys } from "@/chain/accounts/byKeys";
import { toRfqViewModel, toQuoteViewModel } from "@/app/lib/rfq-view-model";
import { useResolveTokenMeta } from "@/app/hooks/useResolveTokenMeta";
import { useNowSecs } from "@/app/hooks/useNowSecs";
import {
  derivePendingRewards,
  groupByMint,
  toClaimedRewards,
  type ClaimedReward,
  type MintRewardTotals,
  type PendingReward,
} from "@/app/lib/rewards";

export interface MyActivityData {
  /** RFQs the connected wallet posted, as view models. */
  myRFQs: RFQ[];
  /** Quotes the connected wallet submitted, as view models. */
  myQuotes: Quote[];
  pendingRewards: PendingReward[];
  claimedRewards: ClaimedReward[];
  /** Pending rewards grouped per mint (never summed across mints). */
  pendingMintGroups: MintRewardTotals[];
  /** Every RFQ by pubkey — quotes/rewards point at RFQs I may not have posted. */
  rfqByKey: Map<string, RFQ>;
  /** Raw decoded RFQ rows, for writes that need on-chain fields (bond mint/amount). */
  rfqRows: ReturnType<typeof useRfqAccounts>["data"];
  isLoading: boolean;
  isError: boolean;
  refetchAll: () => void;
  refetchRewards: () => void;
}

/**
 * Everything My Activity reads: the three list queries, the view-model
 * mapping and the rewards join. Pure reads — the writes live in
 * useRewardClaims / the screen.
 */
export function useMyActivityData(): MyActivityData {
  const { publicKey } = useWallet();
  const me = publicKey ?? null;
  const meStr = me?.toBase58() ?? null;

  // All RFQs (small at seed scale) → map by pubkey; my quotes/rewards point at
  // RFQs I may not have posted, so we need the full set to resolve their pair.
  const rfqQuery = useRfqAccounts();
  const quoteQuery = useQuoteAccountsByTaker(me);
  const rewardQuery = useFacilitatorRewardTrackersByFacilitator(me);

  const nowSecs = useNowSecs(60_000);
  const resolveToken = useResolveTokenMeta();

  const allRFQs = useMemo(
    () => (rfqQuery.data ?? []).map((row) => toRfqViewModel(row, nowSecs, resolveToken)),
    [rfqQuery.data, nowSecs, resolveToken],
  );
  const rfqByKey = useMemo(() => new Map(allRFQs.map((r) => [r.publicKey, r])), [allRFQs]);

  const myRFQs = useMemo(
    () => (meStr === null ? [] : allRFQs.filter((r) => r.maker === meStr)),
    [allRFQs, meStr],
  );

  const myQuotes = useMemo(
    () =>
      (quoteQuery.data ?? []).map((row) => {
        const parent = rfqByKey.get(row.account.rfq.toBase58());
        const decimals = parent ? resolveToken(parent.quoteMint).decimals : 0;
        return toQuoteViewModel(row, decimals);
      }),
    [quoteQuery.data, rfqByKey, resolveToken],
  );

  // Rewards (Phase 5 #15). Candidates are Settled RFQs where I'm the recorded
  // facilitator; their settlement + winning-quote accounts are bulk-fetched and
  // joined in derivePendingRewards, which mirrors withdraw_reward's on-chain
  // guards (settlement completed, quote facilitator matches, share > 0 from the
  // RFQ's facilitatorFeeBps snapshot). Trackers exist only post-claim.
  const rewardCandidates = useMemo(
    () =>
      meStr === null
        ? []
        : (rfqQuery.data ?? []).filter(
            (row) =>
              row.account.state === "Settled" && row.account.facilitator?.toBase58() === meStr,
          ),
    [rfqQuery.data, meStr],
  );
  const settlementKeys = useMemo(
    () =>
      rewardCandidates.flatMap((row) => (row.account.settlement ? [row.account.settlement] : [])),
    [rewardCandidates],
  );
  const winningQuoteKeys = useMemo(
    () =>
      rewardCandidates.flatMap((row) =>
        row.account.selectedQuote ? [row.account.selectedQuote] : [],
      ),
    [rewardCandidates],
  );
  const settlementsQuery = useSettlementAccountsByKeys(settlementKeys);
  const winningQuotesQuery = useQuoteAccountsByKeys(winningQuoteKeys);

  const pendingRewards = useMemo(
    () =>
      meStr === null
        ? []
        : derivePendingRewards({
            rfqRows: rfqQuery.data ?? [],
            settlements: settlementsQuery.data ?? new Map(),
            quotes: winningQuotesQuery.data ?? new Map(),
            trackers: rewardQuery.data ?? [],
            me: meStr,
            resolve: resolveToken,
          }),
    [
      meStr,
      rfqQuery.data,
      settlementsQuery.data,
      winningQuotesQuery.data,
      rewardQuery.data,
      resolveToken,
    ],
  );
  const claimedRewards = useMemo(
    () => toClaimedRewards(rewardQuery.data ?? [], rfqQuery.data),
    [rewardQuery.data, rfqQuery.data],
  );
  const pendingMintGroups: MintRewardTotals[] = useMemo(
    () => groupByMint(pendingRewards, []),
    [pendingRewards],
  );

  const isLoading = rfqQuery.isLoading || quoteQuery.isLoading || rewardQuery.isLoading;
  const isError = rfqQuery.isError || quoteQuery.isError || rewardQuery.isError;
  const refetchAll = () => {
    void rfqQuery.refetch();
    void quoteQuery.refetch();
    void rewardQuery.refetch();
  };
  const refetchRewards = () => {
    void rewardQuery.refetch();
  };

  return {
    myRFQs,
    myQuotes,
    pendingRewards,
    claimedRewards,
    pendingMintGroups,
    rfqByKey,
    rfqRows: rfqQuery.data,
    isLoading,
    isError,
    refetchAll,
    refetchRewards,
  };
}
