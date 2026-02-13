import { motion } from "motion/react";
import { getMyFacilitatorRewards, CURRENT_USER_FULL } from "@/app/data/enhancedMockData";
import { Button } from "@/app/components/ui/button";
import {
  DollarSign, Shield, TrendingUp, Activity,
  CheckCircle2, Clock
} from "lucide-react";
import { useState } from "react";

interface MyEarningsProps {
  onViewRFQ: (rfqId: string) => void;
}

export function MyEarnings({ onViewRFQ }: MyEarningsProps) {
  const rewards = getMyFacilitatorRewards(CURRENT_USER_FULL);
  const unclaimedRewards = rewards.filter(r => !r.claimedAt);
  const claimedRewards = rewards.filter(r => r.claimedAt);

  const totalUnclaimed = unclaimedRewards.reduce((sum, r) => sum + r.amount, 0);
  const totalClaimed = claimedRewards.reduce((sum, r) => sum + r.amount, 0);
  const totalEarned = totalUnclaimed + totalClaimed;

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20 lg:pt-24 pb-16 sm:pb-32">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute top-60 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">My Earnings</h1>
          <p className="text-base sm:text-lg text-white/60">Track your facilitator rewards and claim your earnings</p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard
            label="Total Earned"
            value={`$${(totalEarned / 100).toFixed(2)}`}
            subtext="All time"
            icon={DollarSign}
            gradient="from-green-500 to-emerald-500"
          />
          <StatCard
            label="Unclaimed"
            value={`$${(totalUnclaimed / 100).toFixed(2)}`}
            subtext="Available now"
            icon={TrendingUp}
            gradient="from-cyan-500 to-blue-500"
          />
          <StatCard
            label="RFQs Facilitated"
            value={rewards.length.toString()}
            subtext="Total count"
            icon={Shield}
            gradient="from-blue-500 to-purple-500"
          />
          <StatCard
            label="Avg Fee"
            value={`$${rewards.length > 0 ? ((totalEarned / rewards.length) / 100).toFixed(2) : '0.00'}`}
            subtext="Per RFQ"
            icon={Activity}
            gradient="from-purple-500 to-indigo-500"
          />
        </div>

        {/* Claim Section */}
        {unclaimedRewards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30 rounded-xl p-6 mb-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Ready to Claim: ${(totalUnclaimed / 100).toFixed(2)} USDC
                </h3>
                <p className="text-sm text-white/60">
                  You have {unclaimedRewards.length} reward{unclaimedRewards.length !== 1 ? 's' : ''} available to claim
                </p>
              </div>
              <Button
                size="lg"
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg w-full sm:w-auto"
              >
                <DollarSign className="mr-2 h-5 w-5" />
                Claim All Rewards
              </Button>
            </div>
          </motion.div>
        )}

        {/* Rewards List */}
        <div className="space-y-6">
          {unclaimedRewards.length > 0 && (
            <RewardsSection
              title="Unclaimed Rewards"
              subtitle="Click to view RFQ details"
              color="text-green-400"
              rewards={unclaimedRewards}
              onViewRFQ={onViewRFQ}
            />
          )}

          {claimedRewards.length > 0 && (
            <RewardsSection
              title="Claimed Rewards"
              subtitle="Previously claimed earnings"
              color="text-teal-400"
              rewards={claimedRewards}
              onViewRFQ={onViewRFQ}
              collapsed
            />
          )}

          {rewards.length === 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 sm:p-12 text-center">
              <Shield className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Rewards Yet</h3>
              <p className="text-sm text-white/50">
                Facilitate RFQs to start earning rewards
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components

interface StatCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: any;
  gradient: string;
}

function StatCard({ label, value, subtext, icon: Icon, gradient }: StatCardProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-5 group hover:border-white/20 transition-all">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
      <div className="relative">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} w-fit mb-2 sm:mb-3`}>
          <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-white mb-1">{value}</div>
        <div className="text-xs text-white/50 mb-0.5 sm:mb-1">{label}</div>
        <div className="text-xs text-white/40">{subtext}</div>
      </div>
    </div>
  );
}

interface RewardsSectionProps {
  title: string;
  subtitle: string;
  color: string;
  rewards: any[];
  onViewRFQ: (rfqId: string) => void;
  collapsed?: boolean;
}

function RewardsSection({ title, subtitle, color, rewards, onViewRFQ, collapsed }: RewardsSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed || false);

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-lg sm:text-xl font-bold ${color} mb-1`}>
            {title} ({rewards.length})
          </h3>
          <p className="text-xs sm:text-sm text-white/50">{subtitle}</p>
        </div>
        {collapsed && (
          <Button
            onClick={() => setIsCollapsed(!isCollapsed)}
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white"
          >
            {isCollapsed ? "Show" : "Hide"}
          </Button>
        )}
      </div>

      {!isCollapsed && (
        <div className="space-y-3">
          {rewards.map((reward) => (
            <RewardCard
              key={reward.publicKey}
              reward={reward}
              onViewRFQ={onViewRFQ}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RewardCardProps {
  reward: any;
  onViewRFQ: (rfqId: string) => void;
}

function RewardCard({ reward, onViewRFQ }: RewardCardProps) {
  const isClaimed = reward.claimedAt !== null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all group flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
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
              onClick={() => onViewRFQ(reward.rfq)}
              className="text-sm text-cyan-400 hover:text-cyan-300 font-mono truncate"
            >
              {reward.rfq.substring(0, 8)}...{reward.rfq.substring(reward.rfq.length - 6)}
            </button>
          </div>
          {isClaimed && (
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
