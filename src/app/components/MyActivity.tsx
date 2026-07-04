import { useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useOutletContext } from "react-router";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Quote, RFQ, RFQState } from "@/types/rfq";
import {
  useRfqAccounts,
  useQuoteAccountsByTaker,
  useFacilitatorRewardTrackersByFacilitator,
} from "@/chain/accounts/lists";
import { useQuoteAccountsByKeys, useSettlementAccountsByKeys } from "@/chain/accounts/byKeys";
import { useConfigAccount } from "@/chain/accounts/config";
import { useSettlementProgram } from "@/chain/program";
import { buildOpenRfqTx, buildWithdrawRewardTx } from "@/chain/instructions/maker";
import { submitRfqTx } from "@/chain/instructions/shared";
import { toRfqViewModel, toQuoteViewModel } from "@/app/lib/rfq-view-model";
import { resolveTokenMeta } from "@/app/lib/tokens";
import { formatTokenAmount } from "@/app/lib/format";
import {
  derivePendingRewards,
  groupByMint,
  toClaimedRewards,
  type MintRewardTotals,
  type PendingReward,
} from "@/app/lib/rewards";
import { RewardsSection } from "@/app/components/RewardsSection";
import { Button } from "@/app/components/ui/button";
import { PageShell } from "@/app/components/PageShell";
import { StatusBadge } from "@/app/components/StatusBadge";
import { SkeletonList } from "@/app/components/SkeletonList";
import { SeedlingIllustration } from "@/app/components/illustrations";
import { ErrorRetry } from "@/app/components/ErrorRetry";
import type { DashboardOutletContext } from "@/app/components/DashboardLayout";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  Edit,
  Eye,
  FileText,
  HandCoins,
  Loader2,
  Lock,
  MousePointerClick,
  Plus,
  Sparkles,
  Unlock,
  Zap,
} from "lucide-react";

const TERMINAL_STATES = new Set<RFQState>(["Settled", "Expired", "Ignored", "Incomplete"]);

interface Attention {
  id: string;
  kind: "reveal" | "select" | "settle" | "open-draft" | "claim";
  label: string;
  sublabel?: string;
  cta: string;
  tone: "urgent" | "primary" | "reward";
  expiresIn?: string | null;
  onClick: () => void;
}

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
  const meStr = me?.toBase58() ?? null;

  // All RFQs (small at seed scale) → map by pubkey; my quotes/rewards point at
  // RFQs I may not have posted, so we need the full set to resolve their pair.
  const rfqQuery = useRfqAccounts();
  const quoteQuery = useQuoteAccountsByTaker(me);
  const rewardQuery = useFacilitatorRewardTrackersByFacilitator(me);
  const configQuery = useConfigAccount();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);

  const nowSecs = Math.floor(Date.now() / 1000);

  const allRFQs = useMemo(
    () => (rfqQuery.data ?? []).map((row) => toRfqViewModel(row, nowSecs)),
    // nowSecs intentionally excluded — re-deriving every second churns identity
    // for no benefit; expiresIn refreshes on the next data refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rfqQuery.data],
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
        const decimals = parent ? resolveTokenMeta(parent.quoteMint).decimals : 0;
        return toQuoteViewModel(row, decimals);
      }),
    [quoteQuery.data, rfqByKey],
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
          }),
    [meStr, rfqQuery.data, settlementsQuery.data, winningQuotesQuery.data, rewardQuery.data],
  );
  const claimedRewards = useMemo(
    () => toClaimedRewards(rewardQuery.data ?? [], rfqQuery.data),
    [rewardQuery.data, rfqQuery.data],
  );
  const pendingMintGroups: MintRewardTotals[] = useMemo(
    () => groupByMint(pendingRewards, []),
    [pendingRewards],
  );
  // busyId is shared with openDraft; only report it as a claim when it names a
  // pending reward's RFQ.
  const claimingRfq =
    busyId !== null && pendingRewards.some((r) => r.rfq === busyId) ? busyId : null;

  const isLoading = rfqQuery.isLoading || quoteQuery.isLoading || rewardQuery.isLoading;
  const isError = rfqQuery.isError || quoteQuery.isError || rewardQuery.isError;
  const refetchAll = () => {
    void rfqQuery.refetch();
    void quoteQuery.refetch();
    void rewardQuery.refetch();
  };

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
    setBusyId(rfq.publicKey);
    try {
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
      setBusyId(null);
    }
  };

  // Claim a reward (withdraw_reward). The PendingReward already carries the
  // winning quote PDA + quote mint, so nothing is re-derived from view models.
  // sendClaim is the shared submit path; claimReward wraps it with per-row busy
  // state, claimAllRewards loops it sequentially and keeps going on failures.
  const sendClaim = async (reward: PendingReward) => {
    if (!program || !me) {
      toast.error("Connect a wallet to claim");
      throw new Error("wallet not ready");
    }
    const rfq = new PublicKey(reward.rfq);
    await submitRfqTx({
      connection,
      wallet,
      queryClient,
      rfq,
      build: () =>
        buildWithdrawRewardTx({
          program,
          facilitator: me,
          rfq,
          quote: new PublicKey(reward.quote),
          quoteMint: new PublicKey(reward.quoteMint),
        }),
      pendingMessage: "Claiming reward…",
      successMessage: "Reward claimed to your wallet",
    });
  };

  const claimReward = async (reward: PendingReward) => {
    setBusyId(reward.rfq);
    try {
      await sendClaim(reward);
    } catch {
      // toast already surfaced
    } finally {
      setBusyId(null);
    }
  };

  const claimAllRewards = async () => {
    const rewards = pendingRewards;
    if (!program || !me || rewards.length === 0 || batch !== null) return;
    setBatch({ done: 0, total: rewards.length });
    let succeeded = 0;
    for (const [index, reward] of rewards.entries()) {
      try {
        await sendClaim(reward);
        succeeded += 1;
      } catch {
        // per-tx toast already surfaced — keep claiming the rest
      }
      setBatch({ done: index + 1, total: rewards.length });
    }
    setBatch(null);
    toast.success(`Claimed ${succeeded} of ${rewards.length} rewards`);
    void rewardQuery.refetch();
  };

  const attention: Attention[] = useMemo(() => {
    const items: Attention[] = [];
    // Drafts to open
    myRFQs
      .filter((r) => r.state === "Draft")
      .forEach((rfq) => {
        items.push({
          id: `open:${rfq.publicKey}`,
          kind: "open-draft",
          label: `Open draft ${rfq.pair}`,
          cta: "Open",
          tone: "primary",
          onClick: () => viewRFQ(rfq.publicKey),
        });
      });
    // Quotes to reveal
    myQuotes.forEach((q) => {
      const rfq = rfqByKey.get(q.rfq);
      if (rfq && rfq.state === "Committed" && !q.revealedAt) {
        items.push({
          id: `reveal:${q.publicKey}`,
          kind: "reveal",
          label: `Reveal quote on ${rfq.pair}`,
          cta: "Reveal",
          tone: "urgent",
          expiresIn: rfq.expiresIn,
          onClick: () => navigate(`/dashboard/quote/${q.publicKey}/reveal`),
        });
      }
    });
    // My Revealed RFQs → pick winner
    myRFQs
      .filter((r) => r.state === "Revealed")
      .forEach((rfq) => {
        items.push({
          id: `select:${rfq.publicKey}`,
          kind: "select",
          label: `Select winner on ${rfq.pair}`,
          cta: "Select",
          tone: "urgent",
          expiresIn: rfq.expiresIn,
          onClick: () => viewRFQ(rfq.publicKey),
        });
      });
    // My selected quotes → settle
    myQuotes
      .filter((q) => q.selected)
      .forEach((q) => {
        const rfq = rfqByKey.get(q.rfq);
        if (rfq && rfq.state === "Selected") {
          items.push({
            id: `settle:${q.publicKey}`,
            kind: "settle",
            label: `Settle ${rfq.pair}`,
            cta: "Settle",
            tone: "urgent",
            expiresIn: rfq.expiresIn,
            onClick: () => navigate(`/dashboard/quote/${q.publicKey}/settle`),
          });
        }
      });
    // Pending rewards (Settled RFQs I facilitated, not yet withdrawn)
    pendingRewards.forEach((reward) => {
      items.push({
        id: `claim:${reward.rfq}`,
        kind: "claim",
        label: `Claim reward — ${reward.pair}`,
        sublabel: `${formatTokenAmount(reward.amount, reward.decimals)} ${reward.symbol} ready`,
        cta: "Claim",
        tone: "reward",
        onClick: () => void claimReward(reward),
      });
    });
    // Urgent first, then everything else; within each, time-based first
    const order = { urgent: 0, primary: 1, reward: 2 };
    return items.sort((a, b) => {
      const ta = order[a.tone];
      const tb = order[b.tone];
      if (ta !== tb) return ta - tb;
      if (a.expiresIn && !b.expiresIn) return -1;
      if (!a.expiresIn && b.expiresIn) return 1;
      return 0;
    });
  }, [myRFQs, myQuotes, pendingRewards, rfqByKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <EmptyState onCreateRFQ={() => setIsCreateModalOpen(true)} />
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

      {attention.length > 0 && <AttentionRibbon items={attention} />}

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
                busy={busyId === rfq.publicKey}
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

interface PinnedSummaryProps {
  pendingRewards: PendingReward[];
  pendingMintGroups: MintRewardTotals[];
  activeRFQs: number;
  activeQuotes: number;
  settled: number;
  claiming: boolean;
  onClaim: () => void;
}

function PinnedSummary({
  pendingRewards,
  pendingMintGroups,
  activeRFQs,
  activeQuotes,
  settled,
  claiming,
  onClaim,
}: PinnedSummaryProps) {
  return (
    <div className="sticky top-(--nav-h) z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-surface-page/80 backdrop-blur-xl border-y border-white/10 py-3 sm:py-4 mb-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 items-stretch">
        <RewardsTile
          pending={pendingRewards}
          groups={pendingMintGroups}
          claiming={claiming}
          onClaim={onClaim}
        />
        <StatTile label="Active RFQs" value={activeRFQs} tone="cyan" />
        <StatTile label="Active quotes" value={activeQuotes} tone="blue" />
        <StatTile label="Settled" value={settled} tone="teal" />
      </div>
    </div>
  );
}

function RewardsTile({
  pending,
  groups,
  claiming,
  onClaim,
}: {
  pending: PendingReward[];
  groups: MintRewardTotals[];
  claiming: boolean;
  onClaim: () => void;
}) {
  const hasUnclaimed = pending.length > 0;
  // One mint pending → the exact amount; several mints → a count, with the
  // per-mint amounts in a title tooltip (never summed across mints).
  const singleMint = groups.length === 1 ? groups[0] : undefined;
  const perMintTooltip = groups
    .map((g) => `${formatTokenAmount(g.pendingTotal, g.decimals)} ${g.symbol}`)
    .join(", ");
  return (
    <div
      className={`col-span-2 sm:col-span-1 flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 sm:px-4 sm:py-3 ${
        hasUnclaimed
          ? "bg-gradient-to-br from-green-500/15 to-emerald-500/10 border-green-500/30"
          : "bg-white/5 border-white/10"
      }`}
    >
      <div className="min-w-0">
        <div className="text-[0.65rem] sm:text-xs uppercase tracking-wider text-white/50">
          Rewards
        </div>
        {hasUnclaimed && singleMint ? (
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-xl sm:text-2xl font-bold text-green-400 truncate">
              {formatTokenAmount(singleMint.pendingTotal, singleMint.decimals)}
            </span>
            <span className="text-xs sm:text-sm text-white/60 whitespace-nowrap">
              {singleMint.symbol} to claim
            </span>
          </div>
        ) : (
          <div
            className="flex items-baseline gap-1.5"
            title={hasUnclaimed ? perMintTooltip : undefined}
          >
            <span
              className={`text-xl sm:text-2xl font-bold ${hasUnclaimed ? "text-green-400" : "text-white/70"}`}
            >
              {pending.length}
            </span>
            <span className="text-xs sm:text-sm text-white/60">to claim</span>
          </div>
        )}
      </div>
      {hasUnclaimed ? (
        <Button
          onClick={onClaim}
          disabled={claiming}
          size="sm"
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/20 disabled:opacity-60"
        >
          {claiming ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <HandCoins className="mr-1.5 h-3.5 w-3.5" />
          )}
          Claim
        </Button>
      ) : (
        <CheckCircle2 className="h-5 w-5 text-white/30" />
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "cyan" | "blue" | "teal";
}) {
  const toneMap = {
    cyan: "text-cyan-400",
    blue: "text-blue-400",
    teal: "text-state-settled",
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="min-w-0">
        <div className="text-[0.65rem] sm:text-xs uppercase tracking-wider text-white/50">
          {label}
        </div>
        <div className={`text-xl sm:text-2xl font-bold ${toneMap[tone]}`}>{value}</div>
      </div>
    </div>
  );
}

function AttentionRibbon({ items }: { items: Attention[] }) {
  return (
    <div className="mt-4 sm:mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <h2 className="text-sm sm:text-base font-semibold text-white">
          Needs your attention <span className="text-white/40 font-normal">({items.length})</span>
        </h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 scrollbar-thin">
        {items.map((item) => (
          <AttentionChip key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function AttentionChip({ item }: { item: Attention }) {
  const toneClasses = {
    urgent: "from-orange-500/15 to-red-500/10 border-orange-500/30",
    primary: "from-purple-500/15 to-violet-500/10 border-purple-500/30",
    reward: "from-green-500/15 to-emerald-500/10 border-green-500/30",
  }[item.tone];

  const ctaClasses = {
    urgent: "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600",
    primary:
      "bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600",
    reward:
      "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600",
  }[item.tone];

  const Icon = {
    urgent: Zap,
    primary: Edit,
    reward: HandCoins,
  }[item.tone];

  return (
    <div
      className={`flex-shrink-0 w-64 sm:w-72 rounded-xl border bg-gradient-to-br ${toneClasses} backdrop-blur-sm p-3 flex flex-col justify-between gap-3`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-white/80 flex-shrink-0" />
          <div className="text-sm font-semibold text-white truncate">{item.label}</div>
        </div>
        {item.sublabel && (
          <div className="text-xs text-white/50 truncate pl-6">{item.sublabel}</div>
        )}
        {item.expiresIn && (
          <div className="flex items-center gap-1 text-xs text-orange-300 pl-6 mt-1">
            <Clock className="h-3 w-3" />
            <span>{item.expiresIn}</span>
          </div>
        )}
      </div>
      <Button
        onClick={item.onClick}
        size="sm"
        className={`${ctaClasses} text-white shadow-lg w-full`}
      >
        {item.cta}
      </Button>
    </div>
  );
}

interface CollapsibleSectionProps {
  id: string;
  title: string;
  count: number;
  needsAttentionCount?: number;
  icon: typeof FileText;
  defaultOpen: boolean;
  action?: ReactNode;
  children: ReactNode;
}

function CollapsibleSection({
  id,
  title,
  count,
  needsAttentionCount = 0,
  icon: Icon,
  defaultOpen,
  action,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      id={id}
      className="rounded-lg sm:rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.02] backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-3 min-w-0 flex-1 text-left group"
          aria-expanded={open}
          aria-controls={`${id}-body`}
        >
          <div className="p-2 rounded-lg bg-white/10 flex-shrink-0">
            <Icon className="h-4 w-4 text-white/80" />
          </div>
          <div className="flex items-baseline gap-2 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-white truncate group-hover:text-white/90">
              {title} <span className="text-white/40 font-normal">({count})</span>
            </h3>
            {needsAttentionCount > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                <AlertCircle className="h-3 w-3" />
                {needsAttentionCount} need action
              </span>
            )}
          </div>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="ml-2 flex-shrink-0"
          >
            <ChevronDown className="h-5 w-5 text-white/60" />
          </motion.div>
        </button>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            id={`${id}-body`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HorizontalStrip({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">{children}</div>
  );
}

function EmptyState({ onCreateRFQ }: { onCreateRFQ: () => void }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-8 sm:p-12 text-center">
      <SeedlingIllustration className="mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">Nothing here yet</h3>
      <p className="text-sm text-white/50 mb-6">
        Post an RFQ or quote on one to see activity here.
      </p>
      <Button
        onClick={onCreateRFQ}
        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
      >
        <Plus className="mr-2 h-4 w-4" />
        Create RFQ
      </Button>
    </div>
  );
}

function PostedRFQCard({
  rfq,
  busy,
  onView,
  onEdit,
  onOpen,
}: {
  rfq: RFQ;
  busy?: boolean;
  onView: () => void;
  onEdit?: () => void;
  onOpen?: () => void;
}) {
  return (
    <div className="flex-shrink-0 w-72 bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Coins className="h-4 w-4 text-cyan-400 flex-shrink-0" />
          <span className="font-semibold text-sm text-white truncate">{rfq.pair}</span>
        </div>
        <StatusBadge status={rfq.state} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <div className="text-xs text-white/50 mb-1">Base</div>
          <div className="text-sm font-bold text-white truncate">
            {rfq.baseAmount.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-white/50 mb-1">Min Quote</div>
          <div className="text-sm font-bold text-white truncate">
            {rfq.minQuoteAmount.toLocaleString()}
          </div>
        </div>
      </div>

      {rfq.expiresIn && (
        <div className="flex items-center gap-2 text-xs text-orange-400 mb-3 bg-orange-500/10 rounded p-2">
          <Clock className="h-3 w-3" />
          <span>Expires in {rfq.expiresIn}</span>
        </div>
      )}

      <Button
        onClick={onView}
        size="sm"
        variant="outline"
        className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30"
      >
        <Eye className="mr-2 h-4 w-4" />
        View
      </Button>

      {onOpen && (
        <Button
          onClick={onOpen}
          disabled={busy}
          size="sm"
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/20 mt-2 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Zap className="mr-2 h-4 w-4" />
          )}
          Open
        </Button>
      )}

      {onEdit && (
        <Button
          onClick={onEdit}
          disabled={busy}
          size="sm"
          variant="outline"
          className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 mt-2 disabled:opacity-60"
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit Draft
        </Button>
      )}
    </div>
  );
}

function SubmittedQuoteCard({
  quote,
  rfq,
  onView,
  onReveal,
  onSettle,
}: {
  quote: Quote;
  rfq: RFQ | undefined;
  onView: () => void;
  onReveal?: () => void;
  onSettle?: () => void;
}) {
  const isRevealed = quote.revealedAt !== null;
  const decided =
    rfq !== undefined &&
    (rfq.state === "Selected" || rfq.state === "Settled" || rfq.state === "Incomplete");
  const notSelected = decided && !quote.selected;

  return (
    <div
      className={`flex-shrink-0 w-72 bg-white/5 border rounded-lg p-4 hover:border-white/20 transition-all ${
        quote.selected ? "border-cyan-500/40 bg-cyan-500/5" : "border-white/10"
      }`}
    >
      {quote.selected && (
        <div className="flex items-center gap-2 text-xs text-cyan-400 mb-2 font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          <span>Selected</span>
        </div>
      )}
      {notSelected && (
        <div className="flex items-center gap-2 text-xs text-white/40 mb-2 font-semibold">
          <span>Not selected</span>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Coins className="h-4 w-4 text-cyan-400 flex-shrink-0" />
          <span className="font-semibold text-sm text-white truncate">{rfq ? rfq.pair : "—"}</span>
        </div>
        {rfq && <StatusBadge status={rfq.state} />}
      </div>

      <div className="space-y-2 mb-3">
        {rfq && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-white/50">RFQ Base</span>
            <span className="text-white font-medium">{rfq.baseAmount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-xs">
          <span className="text-white/50">Your Quote</span>
          <div className="flex items-center gap-2">
            {isRevealed ? (
              <Unlock className="h-3 w-3 text-cyan-400" />
            ) : (
              <Lock className="h-3 w-3 text-orange-400" />
            )}
            <span className={`font-bold ${isRevealed ? "text-cyan-400" : "text-orange-400"}`}>
              {quote.quoteAmount !== null ? quote.quoteAmount.toLocaleString() : "Hidden"}
            </span>
          </div>
        </div>
      </div>

      {rfq?.expiresIn && (
        <div className="flex items-center gap-2 text-xs text-orange-400 mb-3 bg-orange-500/10 rounded p-2">
          <Clock className="h-3 w-3" />
          <span>
            {rfq.state === "Committed" && !isRevealed
              ? `Reveal within ${rfq.expiresIn}`
              : rfq.state === "Selected" && quote.selected
                ? `Settle within ${rfq.expiresIn}`
                : `Expires in ${rfq.expiresIn}`}
          </span>
        </div>
      )}

      {quote.bondsRefundedAt !== null && (
        <div className="flex items-center gap-2 text-xs text-state-settled mb-3 bg-state-settled/10 rounded p-2">
          <CheckCircle2 className="h-3 w-3" />
          <span>Bond refunded</span>
        </div>
      )}

      <Button
        onClick={onView}
        size="sm"
        variant="outline"
        className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30"
      >
        <Eye className="mr-2 h-4 w-4" />
        View RFQ
      </Button>

      {onReveal && (
        <Button
          onClick={onReveal}
          size="sm"
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold mt-2"
        >
          <Unlock className="mr-2 h-4 w-4" />
          Reveal
        </Button>
      )}
      {onSettle && (
        <Button
          onClick={onSettle}
          size="sm"
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold mt-2"
        >
          <Zap className="mr-2 h-4 w-4" />
          Settle
        </Button>
      )}
    </div>
  );
}
