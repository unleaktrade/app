import { useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useOutletContext } from "react-router";
import { useWallet } from "@solana/wallet-adapter-react";
import type { FacilitatorReward, Quote, RFQ, RFQState } from "@/types/rfq";
import {
  useRfqAccounts,
  useQuoteAccountsByTaker,
  useFacilitatorRewardTrackersByFacilitator,
} from "@/chain/accounts/lists";
import {
  toRfqViewModel,
  toQuoteViewModel,
  toFacilitatorRewardViewModel,
} from "@/app/lib/rfq-view-model";
import { resolveTokenMeta } from "@/app/lib/tokens";
import { Button } from "@/app/components/ui/button";
import { StatusBadge } from "@/app/components/StatusBadge";
import { SkeletonList } from "@/app/components/SkeletonList";
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
  Lock,
  MousePointerClick,
  Plus,
  Sparkles,
  Unlock,
  Zap,
} from "lucide-react";

const TERMINAL_STATES = new Set<RFQState>(["Settled", "Expired", "Ignored", "Incomplete"]);

function quoteSymbol(rfq: RFQ | undefined): string {
  if (!rfq) return "";
  const parts = rfq.pair.split("/");
  return parts[1] ?? "";
}

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
  const me = publicKey ?? null;
  const meStr = me?.toBase58() ?? null;

  // All RFQs (small at seed scale) → map by pubkey; my quotes/rewards point at
  // RFQs I may not have posted, so we need the full set to resolve their pair.
  const rfqQuery = useRfqAccounts();
  const quoteQuery = useQuoteAccountsByTaker(me);
  const rewardQuery = useFacilitatorRewardTrackersByFacilitator(me);

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

  const myRewards = useMemo(
    () => (rewardQuery.data ?? []).map((row) => toFacilitatorRewardViewModel(row)),
    [rewardQuery.data],
  );

  // Reward trackers exist only post-claim, so "Rewards history" is all claimed.
  // Claimable = Settled RFQs I facilitated, non-zero share, with no tracker yet.
  // The precise amount + claim action arrive in #15 (instruction wiring).
  const claimedRfqKeys = useMemo(() => new Set(myRewards.map((r) => r.rfq)), [myRewards]);
  const claimableRFQs = useMemo(
    () =>
      meStr === null
        ? []
        : allRFQs.filter(
            (r) =>
              r.state === "Settled" &&
              r.facilitator === meStr &&
              r.feeAmount > 0 &&
              !claimedRfqKeys.has(r.publicKey),
          ),
    [allRFQs, meStr, claimedRfqKeys],
  );

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
          onClick: () => viewRFQ(rfq.publicKey),
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
            onClick: () => viewRFQ(rfq.publicKey),
          });
        }
      });
    // Claimable rewards (Settled RFQs I facilitated, not yet withdrawn)
    claimableRFQs.forEach((rfq) => {
      items.push({
        id: `claim:${rfq.publicKey}`,
        kind: "claim",
        label: `Claim reward — ${rfq.pair}`,
        sublabel: "Facilitator share ready to withdraw",
        cta: "Claim",
        tone: "reward",
        onClick: () => viewRFQ(rfq.publicKey),
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
  }, [myRFQs, myQuotes, claimableRFQs, rfqByKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasAnyActivity =
    myRFQs.length > 0 || myQuotes.length > 0 || myRewards.length > 0 || claimableRFQs.length > 0;

  const scrollToRewards = () => {
    document
      .getElementById("rewards-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading || isError) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-20 lg:pt-24 pb-16 sm:pb-32">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8"
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">My Activity</h1>
          </motion.div>
          {isError ? (
            <ErrorRetry
              message="Couldn't load your activity from the chain."
              onRetry={refetchAll}
            />
          ) : (
            <SkeletonList count={4} />
          )}
        </div>
      </div>
    );
  }

  if (!hasAnyActivity) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-20 lg:pt-24 pb-16 sm:pb-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="absolute top-60 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8"
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">My Activity</h1>
          </motion.div>
          <EmptyState onCreateRFQ={() => setIsCreateModalOpen(true)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20 lg:pt-24 pb-16 sm:pb-32">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute top-60 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
          unclaimedCount={claimableRFQs.length}
          activeRFQs={activeRFQs.length}
          activeQuotes={activeQuotes.length}
          settled={settledRFQs.length}
          onClaim={scrollToRewards}
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
                  onView={() => viewRFQ(rfq.publicKey)}
                  onEdit={rfq.state === "Draft" ? () => editRFQ(rfq) : undefined}
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
                {myQuotes.map((quote) => (
                  <SubmittedQuoteCard
                    key={quote.publicKey}
                    quote={quote}
                    rfq={rfqByKey.get(quote.rfq)}
                    onView={() => viewRFQ(quote.rfq)}
                  />
                ))}
              </HorizontalStrip>
            </CollapsibleSection>
          )}

          {myRewards.length > 0 && (
            <CollapsibleSection
              id="rewards-section"
              title="Rewards history"
              count={myRewards.length}
              needsAttentionCount={0}
              icon={HandCoins}
              defaultOpen={false}
            >
              <div className="space-y-3">
                {myRewards.map((reward) => (
                  <RewardRow
                    key={reward.publicKey}
                    reward={reward}
                    rfq={rfqByKey.get(reward.rfq)}
                    onView={() => viewRFQ(reward.rfq)}
                  />
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}

interface PinnedSummaryProps {
  unclaimedCount: number;
  activeRFQs: number;
  activeQuotes: number;
  settled: number;
  onClaim: () => void;
}

function PinnedSummary({
  unclaimedCount,
  activeRFQs,
  activeQuotes,
  settled,
  onClaim,
}: PinnedSummaryProps) {
  return (
    <div className="sticky top-16 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-[#0a0a0f]/80 backdrop-blur-xl border-y border-white/10 py-3 sm:py-4 mb-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 items-stretch">
        <RewardsTile count={unclaimedCount} onClaim={onClaim} />
        <StatTile label="Active RFQs" value={activeRFQs} tone="cyan" />
        <StatTile label="Active quotes" value={activeQuotes} tone="blue" />
        <StatTile label="Settled" value={settled} tone="teal" />
      </div>
    </div>
  );
}

function RewardsTile({ count, onClaim }: { count: number; onClaim: () => void }) {
  const hasUnclaimed = count > 0;
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
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-xl sm:text-2xl font-bold ${hasUnclaimed ? "text-green-400" : "text-white/70"}`}
          >
            {count}
          </span>
          <span className="text-xs sm:text-sm text-white/60">to claim</span>
        </div>
      </div>
      {hasUnclaimed ? (
        <Button
          onClick={onClaim}
          size="sm"
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/20"
        >
          <HandCoins className="mr-1.5 h-3.5 w-3.5" />
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
    teal: "text-teal-400",
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
      <FileText className="h-12 w-12 text-white/20 mx-auto mb-4" />
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
  onView,
  onEdit,
}: {
  rfq: RFQ;
  onView: () => void;
  onEdit?: () => void;
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

      {onEdit && (
        <Button
          onClick={onEdit}
          size="sm"
          className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-semibold shadow-lg shadow-purple-500/20 mt-2"
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
}: {
  quote: Quote;
  rfq: RFQ | undefined;
  onView: () => void;
}) {
  const isRevealed = quote.revealedAt !== null;

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
        View RFQ
      </Button>
    </div>
  );
}

function RewardRow({
  reward,
  rfq,
  onView,
}: {
  reward: FacilitatorReward;
  rfq: RFQ | undefined;
  onView: () => void;
}) {
  const isClaimed = reward.claimedAt !== null;
  const symbol = quoteSymbol(rfq);

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all flex items-center justify-between gap-3">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`p-3 rounded-lg ${isClaimed ? "bg-teal-500/20" : "bg-green-500/20"}`}>
          {isClaimed ? (
            <CheckCircle2 className="h-5 w-5 text-teal-400" />
          ) : (
            <HandCoins className="h-5 w-5 text-green-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-sm">
            <span className="text-white/50">From</span>
            <button onClick={onView} className="text-cyan-400 hover:text-cyan-300 truncate">
              {rfq ? rfq.pair : reward.rfq.substring(0, 12)}
            </button>
          </div>
          {isClaimed && reward.claimedAt !== null && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Clock className="h-3 w-3" />
              <span>Claimed {new Date(reward.claimedAt * 1000).toLocaleDateString()}</span>
            </div>
          )}
          {!isClaimed && <div className="text-xs text-green-400">Unclaimed — tap to view</div>}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div
          className={`text-lg sm:text-xl font-bold ${isClaimed ? "text-white/60" : "text-green-400"}`}
        >
          {reward.amount.toLocaleString()}
        </div>
        <div className="text-xs text-white/40">{symbol}</div>
      </div>
    </div>
  );
}
