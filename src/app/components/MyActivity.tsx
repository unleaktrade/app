import { motion } from "motion/react";
import { useNavigate, useOutletContext } from "react-router";
import {
  CURRENT_USER_FULL,
  getMyFacilitatorRewards,
  getMyQuotes,
  getMyRFQs,
  getRFQById,
} from "@/data/mock";
import type { FacilitatorReward, Quote, RFQ } from "@/types/rfq";
import { Button } from "@/app/components/ui/button";
import { StatusBadge } from "@/app/components/StatusBadge";
import {
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Edit,
  Eye,
  FileText,
  HandCoins,
  Lock,
  MousePointerClick,
  Plus,
  Unlock,
} from "lucide-react";
import type { DashboardOutletContext } from "@/app/components/DashboardLayout";

export function MyActivity() {
  const navigate = useNavigate();
  const { setIsCreateModalOpen, setIsUpdateModalOpen, setUpdateRFQ } =
    useOutletContext<DashboardOutletContext>();

  const myRFQs = getMyRFQs(CURRENT_USER_FULL);
  const myQuotes = getMyQuotes(CURRENT_USER_FULL);
  const myRewards = getMyFacilitatorRewards(CURRENT_USER_FULL);

  const viewRFQ = (publicKey: string) => navigate(`/dashboard/rfq/${publicKey}`);
  const editRFQ = (rfq: RFQ) => {
    setUpdateRFQ(rfq);
    setIsUpdateModalOpen(true);
  };

  const hasAnyActivity = myRFQs.length > 0 || myQuotes.length > 0 || myRewards.length > 0;

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
          <p className="text-base sm:text-lg text-white/60">
            Everything you've posted, quoted, and earned.
          </p>
        </motion.div>

        {!hasAnyActivity && <EmptyState onCreateRFQ={() => setIsCreateModalOpen(true)} />}

        <div className="space-y-6">
          {myRFQs.length > 0 && (
            <Section
              title="RFQs I posted"
              count={myRFQs.length}
              icon={FileText}
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
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {myRFQs.map((rfq) => (
                  <PostedRFQCard
                    key={rfq.publicKey}
                    rfq={rfq}
                    onView={() => viewRFQ(rfq.publicKey)}
                    onEdit={rfq.state === "Draft" ? () => editRFQ(rfq) : undefined}
                  />
                ))}
              </div>
            </Section>
          )}

          {myQuotes.length > 0 && (
            <Section title="Quotes I submitted" count={myQuotes.length} icon={MousePointerClick}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {myQuotes.map((quote) => (
                  <SubmittedQuoteCard
                    key={quote.publicKey}
                    quote={quote}
                    onView={() => viewRFQ(quote.rfq)}
                  />
                ))}
              </div>
            </Section>
          )}

          {myRewards.length > 0 && (
            <Section title="Rewards" count={myRewards.length} icon={HandCoins}>
              <div className="space-y-3">
                {myRewards.map((reward) => (
                  <RewardRow
                    key={reward.publicKey}
                    reward={reward}
                    onView={() => viewRFQ(reward.rfq)}
                  />
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
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

interface SectionProps {
  title: string;
  count: number;
  icon: typeof FileText;
  action?: React.ReactNode;
  children: React.ReactNode;
}

function Section({ title, count, icon: Icon, action, children }: SectionProps) {
  return (
    <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/10">
            <Icon className="h-4 w-4 text-white/80" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              {title} <span className="text-white/40">({count})</span>
            </h3>
          </div>
        </div>
        {action}
      </div>
      {children}
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
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-cyan-400" />
          <span className="font-semibold text-sm sm:text-base text-white">{rfq.pair}</span>
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
        View Details
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

function SubmittedQuoteCard({ quote, onView }: { quote: Quote; onView: () => void }) {
  const rfq = getRFQById(quote.rfq);
  const isRevealed = quote.revealedAt !== null;

  return (
    <div
      className={`bg-white/5 border rounded-lg p-4 hover:border-white/20 transition-all group ${
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
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-cyan-400" />
          <span className="font-semibold text-sm sm:text-base text-white">
            {rfq ? rfq.pair : "—"}
          </span>
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

function RewardRow({ reward, onView }: { reward: FacilitatorReward; onView: () => void }) {
  const isClaimed = reward.claimedAt !== null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all group flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`p-3 rounded-lg ${isClaimed ? "bg-teal-500/20" : "bg-green-500/20"}`}>
          {isClaimed ? (
            <CheckCircle2 className="h-5 w-5 text-teal-400" />
          ) : (
            <DollarSign className="h-5 w-5 text-green-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-white/50">RFQ</span>
            <button
              onClick={onView}
              className="text-sm text-cyan-400 hover:text-cyan-300 font-mono truncate"
            >
              {reward.rfq.substring(0, 8)}...{reward.rfq.substring(reward.rfq.length - 6)}
            </button>
          </div>
          {isClaimed && reward.claimedAt !== null && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Clock className="h-3 w-3" />
              <span>Claimed {new Date(reward.claimedAt * 1000).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      <div className="text-right">
        <div className={`text-xl font-bold ${isClaimed ? "text-white/60" : "text-green-400"}`}>
          ${(reward.amount / 100).toFixed(2)}
        </div>
        <div className="text-xs text-white/40">USDC</div>
      </div>
    </div>
  );
}
