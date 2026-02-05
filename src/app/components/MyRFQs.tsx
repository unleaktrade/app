import { motion } from "motion/react";
import { RFQ as LegacyRFQ } from "@/app/App";
import { getMyRFQs, CURRENT_USER_FULL, getRFQById } from "@/app/data/enhancedMockData";
import { mockRFQs as legacyMockRFQs } from "@/app/data/mockRFQs";
import { Button } from "@/app/components/ui/button";
import { StatusBadge } from "@/app/components/StatusBadge";
import {
  Plus, FileText, Activity, CheckCircle2, Clock,
  Coins, Eye, Edit
} from "lucide-react";
import { useState } from "react";

interface MyRFQsProps {
  onCreateRFQ: () => void;
  onViewRFQ: (rfqId: string) => void;
}

// Use legacy mock data for now (simulates user's RFQs)
const CURRENT_USER_ADDRESS = "7Xg9...K3pQ";
const myMakerRFQs = legacyMockRFQs.filter(rfq => 
  rfq.maker === CURRENT_USER_ADDRESS || rfq.id === "HbwB8p...rXzfiF"
);

export function MyRFQs({ onCreateRFQ, onViewRFQ }: MyRFQsProps) {
  // Group RFQs by state
  const rfqsByState = {
    draft: myMakerRFQs.filter(r => r.state === "Draft"),
    open: myMakerRFQs.filter(r => r.state === "Open"),
    committed: myMakerRFQs.filter(r => r.state === "Committed"),
    revealed: myMakerRFQs.filter(r => r.state === "Revealed"),
    selected: myMakerRFQs.filter(r => r.state === "Selected"),
    settled: myMakerRFQs.filter(r => r.state === "Settled"),
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20 lg:pt-24 pb-16 sm:pb-32">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute top-60 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header with CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">My RFQs</h1>
            <p className="text-base sm:text-lg text-white/60">Create and manage your RFQ requests</p>
          </div>
          <Button
            onClick={onCreateRFQ}
            size="lg"
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg shadow-cyan-500/20 w-full sm:w-auto"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create RFQ
          </Button>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard
            label="Total RFQs"
            value={myMakerRFQs.length.toString()}
            subtext="All time"
            icon={FileText}
            gradient="from-cyan-500 to-blue-500"
          />
          <StatCard
            label="Active"
            value={myMakerRFQs.filter(r => !["Settled", "Incomplete", "Expired", "Ignored"].includes(r.state)).length.toString()}
            subtext="In progress"
            icon={Activity}
            gradient="from-blue-500 to-purple-500"
          />
          <StatCard
            label="Success Rate"
            value="87%"
            subtext="Last 30 days"
            icon={CheckCircle2}
            gradient="from-green-500 to-emerald-500"
          />
          <StatCard
            label="Avg Time"
            value="14m"
            subtext="To settlement"
            icon={Clock}
            gradient="from-orange-500 to-red-500"
          />
        </div>

        {/* RFQs by State */}
        <div className="space-y-6">
          {rfqsByState.draft.length > 0 && (
            <StateSection
              title="Draft"
              subtitle="Complete and open these RFQs"
              color="text-slate-400"
              rfqs={rfqsByState.draft}
              onViewRFQ={onViewRFQ}
            />
          )}

          {rfqsByState.open.length > 0 && (
            <StateSection
              title="Open"
              subtitle="Waiting for takers to commit"
              color="text-cyan-400"
              rfqs={rfqsByState.open}
              onViewRFQ={onViewRFQ}
            />
          )}

          {rfqsByState.committed.length > 0 && (
            <StateSection
              title="Committed"
              subtitle="Takers committed, waiting for reveals"
              color="text-purple-400"
              rfqs={rfqsByState.committed}
              onViewRFQ={onViewRFQ}
            />
          )}

          {rfqsByState.revealed.length > 0 && (
            <StateSection
              title="Revealed"
              subtitle="Choose the best quote"
              color="text-indigo-400"
              rfqs={rfqsByState.revealed}
              onViewRFQ={onViewRFQ}
            />
          )}

          {rfqsByState.selected.length > 0 && (
            <StateSection
              title="Selected"
              subtitle="Waiting for taker to settle"
              color="text-blue-400"
              rfqs={rfqsByState.selected}
              onViewRFQ={onViewRFQ}
            />
          )}

          {rfqsByState.settled.length > 0 && (
            <StateSection
              title="Settled"
              subtitle="Completed RFQs"
              color="text-teal-400"
              rfqs={rfqsByState.settled}
              onViewRFQ={onViewRFQ}
              collapsed
            />
          )}

          {myMakerRFQs.length === 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 sm:p-12 text-center">
              <FileText className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No RFQs Yet</h3>
              <p className="text-sm text-white/50 mb-6">
                Create your first RFQ to start trading
              </p>
              <Button
                onClick={onCreateRFQ}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create RFQ
              </Button>
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

interface StateSectionProps {
  title: string;
  subtitle: string;
  color: string;
  rfqs: LegacyRFQ[];
  onViewRFQ: (rfqId: string) => void;
  collapsed?: boolean;
}

function StateSection({ title, subtitle, color, rfqs, onViewRFQ, collapsed }: StateSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed || false);

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-lg sm:text-xl font-bold ${color} mb-1`}>
            {title} ({rfqs.length})
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {rfqs.map((rfq) => (
            <RFQCard key={rfq.id} rfq={rfq} onView={() => onViewRFQ(rfq.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

interface RFQCardProps {
  rfq: LegacyRFQ;
  onView: () => void;
}

function RFQCard({ rfq, onView }: RFQCardProps) {
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
          <div className="text-xs text-white/50 mb-1">Quote</div>
          <div className="text-sm font-bold text-white truncate">
            {rfq.quoteAmount.toLocaleString()}
          </div>
        </div>
      </div>

      {rfq.expires && (
        <div className="flex items-center gap-2 text-xs text-orange-400 mb-3 bg-orange-500/10 rounded p-2">
          <Clock className="h-3 w-3" />
          <span>Expires in {rfq.expires}</span>
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
    </div>
  );
}