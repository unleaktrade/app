import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useNavigate, useOutletContext } from "react-router";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RFQ, RFQState } from "@/types/rfq";
import { useConfigAccount } from "@/chain/accounts/config";
import { useSettlementProgram } from "@/chain/program";
import { buildOpenRfqTx } from "@/chain/instructions/maker";
import { submitRfqTx } from "@/chain/instructions/shared";
import { resolveTokenMeta } from "@/app/lib/tokens";
import { formatTokenAmount } from "@/app/lib/format";
import { fetchTokenBalance } from "@/app/lib/token-balance-state";
import { deriveAttentionItems, type AttentionItem } from "@/app/lib/attention";
import { useMyActivityData } from "@/app/hooks/useMyActivityData";
import { useRewardClaims } from "@/app/hooks/useRewardClaims";
import { RewardsSection } from "@/app/components/RewardsSection";
import { Button } from "@/app/components/ui/button";
import { PageShell } from "@/app/components/PageShell";
import { SkeletonList } from "@/app/components/SkeletonList";
import { CollapsibleSection } from "@/app/components/CollapsibleSection";
import { ErrorRetry } from "@/app/components/ErrorRetry";
import { PinnedSummary } from "@/app/components/my-activity/PinnedSummary";
import { AttentionRibbon } from "@/app/components/my-activity/AttentionRibbon";
import { HorizontalStrip } from "@/app/components/my-activity/HorizontalStrip";
import { ActivityEmptyState } from "@/app/components/my-activity/ActivityEmptyState";
import { PostedRFQCard } from "@/app/components/my-activity/PostedRFQCard";
import { SubmittedQuoteCard } from "@/app/components/my-activity/SubmittedQuoteCard";
import type { DashboardOutletContext } from "@/app/components/DashboardLayout";
import { FileText, HandCoins, MousePointerClick, Plus } from "lucide-react";

const TERMINAL_STATES = new Set<RFQState>(["Settled", "Expired", "Ignored", "Incomplete"]);

export function MyActivity() {
  const navigate = useNavigate();
  const { setIsCreateModalOpen, setIsUpdateModalOpen, setUpdateRFQ } =
    useOutletContext<DashboardOutletContext>();

  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const program = useSettlementProgram();
  const queryClient = useQueryClient();
  const wallet = useWallet();
  const me = publicKey ?? null;
  const configQuery = useConfigAccount();

  const {
    myRFQs,
    myQuotes,
    pendingRewards,
    claimedRewards,
    pendingMintGroups,
    rfqByKey,
    rfqRows,
    isLoading,
    isError,
    refetchAll,
    refetchRewards,
  } = useMyActivityData();

  const {
    claim: claimReward,
    claimAll: claimAllRewards,
    busyId,
    batch,
  } = useRewardClaims({ pendingRewards, onBatchDone: refetchRewards });
  // Only report busyId as a claim when it names a pending reward's RFQ.
  const claimingRfq =
    busyId !== null && pendingRewards.some((r) => r.rfq === busyId) ? busyId : null;

  const [openingId, setOpeningId] = useState<string | null>(null);

  const activeRFQs = myRFQs.filter((r) => !TERMINAL_STATES.has(r.state));
  const activeQuotes = myQuotes.filter((q) => {
    const rfq = rfqByKey.get(q.rfq);
    return rfq && !TERMINAL_STATES.has(rfq.state);
  });
  const settledRFQs = myRFQs.filter((r) => r.state === "Settled");

  const rfqsNeedAction = myRFQs.filter(
    (r) => r.state === "Draft" || r.state === "Revealed" || r.state === "Selected",
  ).length;
  const quotesNeedAction = myQuotes.filter((q) => {
    const rfq = rfqByKey.get(q.rfq);
    if (!rfq) return false;
    if (rfq.state === "Committed" && !q.revealedAt) return true;
    if (q.selected && rfq.state === "Selected") return true;
    return false;
  }).length;

  const viewRFQ = (publicKey: string) => navigate(`/dashboard/rfq/${publicKey}`);
  const editRFQ = (rfq: RFQ) => {
    setUpdateRFQ(rfq);
    setIsUpdateModalOpen(true);
  };

  // Quick-publish a draft (open_rfq) inline. Posts the maker bond, so the toast
  // pipeline surfaces pending/confirm state; usdcMint comes from on-chain Config.
  const openDraft = async (rfq: RFQ) => {
    const config = configQuery.data;
    if (!program || !me || !config) {
      toast.error("Wallet or config not ready — try again in a moment");
      return;
    }
    let pda: PublicKey;
    try {
      pda = new PublicKey(rfq.publicKey);
    } catch {
      return;
    }
    setOpeningId(rfq.publicKey);
    try {
      // Pre-signing gate (#67): opening posts the maker bond in the RFQ's USDC
      // mint — read the balance imperatively and don't build the tx on an
      // obvious shortfall. A read error never blocks (chain stays the arbiter),
      // and an empty balance is guidance, not proof anything went wrong.
      const raw = rfqRows?.find((row) => row.publicKey.toBase58() === rfq.publicKey);
      if (raw) {
        const bondMint = raw.account.usdcMint;
        const bondAmount = raw.account.bondAmount;
        let shortfall: string | null = null;
        try {
          const bal = await fetchTokenBalance(connection, bondMint, me);
          if (!bal.exists || bal.amount < bondAmount) {
            const meta = resolveTokenMeta(bondMint.toBase58());
            const current = bal.exists
              ? `${formatTokenAmount(bal.amount, meta.decimals)} ${meta.symbol}`
              : `no ${meta.symbol} token account yet`;
            shortfall =
              `Opening needs a ${formatTokenAmount(bondAmount, meta.decimals)} ${meta.symbol} ` +
              `bond — you have ${current}. Beta tokens go to activated waitlist wallets; ` +
              "connect the wallet you registered or check your distribution status.";
          }
        } catch {
          // Balance read unavailable — proceed; the transaction surfaces errors.
        }
        if (shortfall !== null) {
          toast.error("Not enough beta tokens to post the bond", { description: shortfall });
          setOpeningId(null);
          return;
        }
      }
      await submitRfqTx({
        connection,
        wallet,
        queryClient,
        rfq: pda,
        build: () => buildOpenRfqTx({ program, maker: me, rfq: pda, usdcMint: config.usdcMint }),
        pendingMessage: "Opening RFQ…",
        successMessage: "RFQ opened — the clock is running",
      });
    } catch {
      // toast already surfaced
    } finally {
      setOpeningId(null);
    }
  };

  const attention = useMemo(
    () => deriveAttentionItems({ myRFQs, myQuotes, pendingRewards, rfqByKey }),
    [myRFQs, myQuotes, pendingRewards, rfqByKey],
  );

  // Resolved at click time from the item's kind + keys, so the ribbon never
  // holds a navigate / claim closure that could go stale.
  const onAttentionAction = (item: AttentionItem) => {
    switch (item.kind) {
      case "open-draft":
      case "select":
        viewRFQ(item.rfqKey);
        return;
      case "reveal":
        navigate(`/dashboard/quote/${item.quoteKey}/reveal`);
        return;
      case "settle":
        navigate(`/dashboard/quote/${item.quoteKey}/settle`);
        return;
      case "claim": {
        const reward = pendingRewards.find((r) => r.rfq === item.rfqKey);
        if (reward) void claimReward(reward);
        return;
      }
    }
  };

  const hasAnyActivity =
    myRFQs.length > 0 ||
    myQuotes.length > 0 ||
    claimedRewards.length > 0 ||
    pendingRewards.length > 0;

  const scrollToRewards = () => {
    document
      .getElementById("rewards-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading || isError) {
    return (
      <PageShell orbs={false}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">My Activity</h1>
        </motion.div>
        {isError ? (
          <ErrorRetry message="Couldn't load your activity from the chain." onRetry={refetchAll} />
        ) : (
          <SkeletonList count={4} />
        )}
      </PageShell>
    );
  }

  if (!hasAnyActivity) {
    return (
      <PageShell>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">My Activity</h1>
        </motion.div>
        <ActivityEmptyState onCreateRFQ={() => setIsCreateModalOpen(true)} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 sm:mb-6"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">My Activity</h1>
        <p className="text-sm sm:text-base text-white/60">
          Your cockpit — what needs your attention, and everything you've done.
        </p>
      </motion.div>

      <PinnedSummary
        pendingRewards={pendingRewards}
        pendingMintGroups={pendingMintGroups}
        activeRFQs={activeRFQs.length}
        activeQuotes={activeQuotes.length}
        settled={settledRFQs.length}
        claiming={claimingRfq !== null || batch !== null}
        onClaim={() => {
          const only = pendingRewards.length === 1 ? pendingRewards[0] : undefined;
          if (only) void claimReward(only);
          else scrollToRewards();
        }}
      />

      {attention.length > 0 && <AttentionRibbon items={attention} onAction={onAttentionAction} />}

      <div className="space-y-4 sm:space-y-6 mt-6 sm:mt-8">
        <CollapsibleSection
          id="rfqs-section"
          title="RFQs I posted"
          count={myRFQs.length}
          needsAttentionCount={rfqsNeedAction}
          icon={FileText}
          defaultOpen={rfqsNeedAction > 0}
          action={
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
              className="bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:from-purple-600 hover:via-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/30"
            >
              <Plus className="mr-2 h-4 w-4" />
              New RFQ
            </Button>
          }
        >
          <HorizontalStrip>
            {myRFQs.map((rfq) => (
              <PostedRFQCard
                key={rfq.publicKey}
                rfq={rfq}
                busy={openingId === rfq.publicKey}
                onView={() => viewRFQ(rfq.publicKey)}
                onEdit={rfq.state === "Draft" ? () => editRFQ(rfq) : undefined}
                onOpen={rfq.state === "Draft" ? () => void openDraft(rfq) : undefined}
              />
            ))}
          </HorizontalStrip>
        </CollapsibleSection>

        {myQuotes.length > 0 && (
          <CollapsibleSection
            id="quotes-section"
            title="Quotes I submitted"
            count={myQuotes.length}
            needsAttentionCount={quotesNeedAction}
            icon={MousePointerClick}
            defaultOpen={quotesNeedAction > 0}
          >
            <HorizontalStrip>
              {myQuotes.map((quote) => {
                const parent = rfqByKey.get(quote.rfq);
                const canReveal = parent?.state === "Committed" && !quote.revealedAt;
                const canSettle = quote.selected && parent?.state === "Selected";
                return (
                  <SubmittedQuoteCard
                    key={quote.publicKey}
                    quote={quote}
                    rfq={parent}
                    onView={() => viewRFQ(quote.rfq)}
                    onReveal={
                      canReveal
                        ? () => navigate(`/dashboard/quote/${quote.publicKey}/reveal`)
                        : undefined
                    }
                    onSettle={
                      canSettle
                        ? () => navigate(`/dashboard/quote/${quote.publicKey}/settle`)
                        : undefined
                    }
                  />
                );
              })}
            </HorizontalStrip>
          </CollapsibleSection>
        )}

        {pendingRewards.length + claimedRewards.length > 0 && (
          <CollapsibleSection
            id="rewards-section"
            title="Rewards"
            count={pendingRewards.length + claimedRewards.length}
            needsAttentionCount={pendingRewards.length}
            icon={HandCoins}
            defaultOpen={pendingRewards.length > 0}
          >
            <RewardsSection
              pending={pendingRewards}
              claimed={claimedRewards}
              claimingRfq={claimingRfq}
              batch={batch}
              onClaim={(reward) => void claimReward(reward)}
              onClaimAll={() => void claimAllRewards()}
              onView={viewRFQ}
            />
          </CollapsibleSection>
        )}
      </div>
    </PageShell>
  );
}
