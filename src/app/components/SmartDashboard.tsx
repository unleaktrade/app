import { motion, AnimatePresence } from "motion/react";
import { RFQ } from "@/app/App";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { mockRFQs } from "@/app/data/mockRFQs";
import { StatusBadge } from "@/app/components/StatusBadge";
import { 
  Plus, Search, Clock, Coins, Eye, 
  Activity, Shield, CheckCircle2, 
  AlertCircle, ArrowRight, FileText, Edit, X,
  Zap, DollarSign, TrendingUp, Lock, Unlock
} from "lucide-react";
import { useState } from "react";

interface SmartDashboardProps {
  onCreateRFQ: () => void;
  onViewRFQ: (rfqId: string) => void;
  onQuoteRFQ: (rfq: RFQ) => void;
}

type ViewMode = "maker" | "taker" | "facilitator";

// Simulated user address for demo
const CURRENT_USER_ADDRESS = "7Xg9...K3pQ";

// Mock data: RFQs where current user is maker
const myMakerRFQs = mockRFQs.filter(rfq => 
  rfq.maker === CURRENT_USER_ADDRESS || rfq.id === "HbwB8p...rXzfiF" // Include the Draft one
);

// Mock data: RFQs where current user has quoted (taker perspective)
const myTakerQuotes = [
  { rfq: mockRFQs.find(r => r.id === "RFQ-003")!, myQuoteAmount: 624, selected: false }, // Committed
  { rfq: mockRFQs.find(r => r.id === "RFQ-004")!, myQuoteAmount: 10738000, selected: false }, // Revealed
  { rfq: mockRFQs.find(r => r.id === "A7kpMn...Zy9qWx")!, myQuoteAmount: 898, selected: true }, // Selected (I won!)
  { rfq: mockRFQs.find(r => r.id === "RFQ-005")!, myQuoteAmount: 500100, selected: true }, // Settled
];

// Mock data: RFQs where current user is facilitator
const myFacilitatorRFQs = mockRFQs.filter(rfq => 
  rfq.state === "Settled" || rfq.state === "Selected"
).slice(0, 3); // Mock: I'm facilitator on these

export function SmartDashboard({ onCreateRFQ, onViewRFQ, onQuoteRFQ }: SmartDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("maker");
  const [searchQuery, setSearchQuery] = useState("");

  // Open RFQs available for takers to quote on (excluding ones I've already quoted)
  const openRFQsForQuoting = mockRFQs.filter(r => 
    r.state === "Open" && 
    !myTakerQuotes.some(q => q.rfq.id === r.id)
  );

  // Group maker RFQs by state
  const makerRFQsByState = {
    draft: myMakerRFQs.filter(r => r.state === "Draft"),
    open: myMakerRFQs.filter(r => r.state === "Open"),
    committed: myMakerRFQs.filter(r => r.state === "Committed"),
    revealed: myMakerRFQs.filter(r => r.state === "Revealed"),
    selected: myMakerRFQs.filter(r => r.state === "Selected"),
    settled: myMakerRFQs.filter(r => r.state === "Settled"),
  };

  // Group taker quotes by RFQ state
  const takerQuotesByState = {
    committed: myTakerQuotes.filter(q => q.rfq.state === "Committed"),
    revealed: myTakerQuotes.filter(q => q.rfq.state === "Revealed"),
    selected: myTakerQuotes.filter(q => q.rfq.state === "Selected"),
    settled: myTakerQuotes.filter(q => q.rfq.state === "Settled"),
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-16">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1.5 w-fit">
          <button
            onClick={() => setViewMode("maker")}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              viewMode === "maker"
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              My RFQs
            </div>
          </button>
          <button
            onClick={() => setViewMode("taker")}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              viewMode === "taker"
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Browse & Quote
            </div>
          </button>
          <button
            onClick={() => setViewMode("facilitator")}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              viewMode === "facilitator"
                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/20"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Facilitator
            </div>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* MAKER VIEW */}
          {viewMode === "maker" && (
            <motion.div
              key="maker"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Header with primary CTA */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">My RFQs</h1>
                  <p className="text-white/60">Create and manage your RFQ requests</p>
                </div>
                <Button
                  onClick={onCreateRFQ}
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/20"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Create RFQ
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Total RFQs"
                  value={myMakerRFQs.length.toString()}
                  subtext="All time"
                  icon={FileText}
                  gradient="from-purple-500 to-pink-500"
                />
                <StatCard
                  label="Active"
                  value={myMakerRFQs.filter(r => !["Settled", "Incomplete", "Expired", "Ignored"].includes(r.state)).length.toString()}
                  subtext="In progress"
                  icon={Activity}
                  gradient="from-cyan-500 to-blue-500"
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
                {/* Draft RFQs */}
                {makerRFQsByState.draft.length > 0 && (
                  <MakerStateSection
                    title="Draft"
                    subtitle="Complete and open these RFQs"
                    color="text-gray-400"
                    rfqs={makerRFQsByState.draft}
                    onViewRFQ={onViewRFQ}
                  />
                )}

                {/* Open RFQs */}
                {makerRFQsByState.open.length > 0 && (
                  <MakerStateSection
                    title="Open"
                    subtitle="Waiting for takers to commit"
                    color="text-green-400"
                    rfqs={makerRFQsByState.open}
                    onViewRFQ={onViewRFQ}
                  />
                )}

                {/* Committed RFQs */}
                {makerRFQsByState.committed.length > 0 && (
                  <MakerStateSection
                    title="Committed"
                    subtitle="Takers committed, waiting for reveals"
                    color="text-blue-400"
                    rfqs={makerRFQsByState.committed}
                    onViewRFQ={onViewRFQ}
                  />
                )}

                {/* Revealed RFQs */}
                {makerRFQsByState.revealed.length > 0 && (
                  <MakerStateSection
                    title="Revealed"
                    subtitle="Choose the best quote"
                    color="text-purple-400"
                    rfqs={makerRFQsByState.revealed}
                    onViewRFQ={onViewRFQ}
                  />
                )}

                {/* Selected RFQs */}
                {makerRFQsByState.selected.length > 0 && (
                  <MakerStateSection
                    title="Selected"
                    subtitle="Waiting for taker to settle"
                    color="text-cyan-400"
                    rfqs={makerRFQsByState.selected}
                    onViewRFQ={onViewRFQ}
                  />
                )}

                {/* Settled RFQs */}
                {makerRFQsByState.settled.length > 0 && (
                  <MakerStateSection
                    title="Settled"
                    subtitle="Completed RFQs"
                    color="text-teal-400"
                    rfqs={makerRFQsByState.settled}
                    onViewRFQ={onViewRFQ}
                    collapsed
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* TAKER VIEW */}
          {viewMode === "taker" && (
            <motion.div
              key="taker"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Header */}
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Browse & Quote</h1>
                <p className="text-white/60">Find open RFQs and manage your quotes</p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="My Quotes"
                  value={myTakerQuotes.length.toString()}
                  subtext="All time"
                  icon={FileText}
                  gradient="from-cyan-500 to-blue-500"
                />
                <StatCard
                  label="Active"
                  value={myTakerQuotes.filter(q => !["Settled", "Incomplete", "Expired", "Ignored"].includes(q.rfq.state)).length.toString()}
                  subtext="In progress"
                  icon={Activity}
                  gradient="from-blue-500 to-purple-500"
                />
                <StatCard
                  label="Win Rate"
                  value="42%"
                  subtext="Selected quotes"
                  icon={CheckCircle2}
                  gradient="from-green-500 to-emerald-500"
                />
                <StatCard
                  label="Avg Response"
                  value="3m"
                  subtext="Quote time"
                  icon={Clock}
                  gradient="from-orange-500 to-red-500"
                />
              </div>

              {/* Open RFQs Marketplace */}
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-1">Open RFQs</h2>
                    <p className="text-sm text-white/50">{openRFQsForQuoting.length} available to quote</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      placeholder="Search pairs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white w-64"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {openRFQsForQuoting.slice(0, 6).map((rfq) => (
                    <RFQMarketplaceCard
                      key={rfq.id}
                      rfq={rfq}
                      onQuote={() => onQuoteRFQ(rfq)}
                    />
                  ))}
                </div>
              </div>

              {/* My Quotes by State */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">My Quotes</h2>

                {/* Committed Quotes */}
                {takerQuotesByState.committed.length > 0 && (
                  <TakerQuotesSection
                    title="Committed"
                    subtitle="Reveal your quotes before the deadline"
                    color="text-blue-400"
                    quotes={takerQuotesByState.committed}
                    onViewRFQ={onViewRFQ}
                    actionLabel="Reveal Quote"
                  />
                )}

                {/* Revealed Quotes */}
                {takerQuotesByState.revealed.length > 0 && (
                  <TakerQuotesSection
                    title="Revealed"
                    subtitle="Waiting for maker to select"
                    color="text-purple-400"
                    quotes={takerQuotesByState.revealed}
                    onViewRFQ={onViewRFQ}
                    actionLabel="View Status"
                  />
                )}

                {/* Selected Quotes */}
                {takerQuotesByState.selected.length > 0 && (
                  <TakerQuotesSection
                    title="Selected"
                    subtitle="Complete settlement or request bond refund"
                    color="text-cyan-400"
                    quotes={takerQuotesByState.selected}
                    onViewRFQ={onViewRFQ}
                    actionLabel={(quote) => quote.selected ? "Complete Settlement" : "Request Bond Refund"}
                  />
                )}

                {/* Settled Quotes */}
                {takerQuotesByState.settled.length > 0 && (
                  <TakerQuotesSection
                    title="Settled"
                    subtitle="Completed quotes"
                    color="text-teal-400"
                    quotes={takerQuotesByState.settled}
                    onViewRFQ={onViewRFQ}
                    actionLabel="View Details"
                    collapsed
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* FACILITATOR VIEW */}
          {viewMode === "facilitator" && (
            <motion.div
              key="facilitator"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Facilitator Dashboard</h1>
                <p className="text-white/60">Monitor RFQs and claim rewards</p>
              </div>

              {/* Facilitator Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="My RFQs"
                  value={myFacilitatorRFQs.length.toString()}
                  subtext="As facilitator"
                  icon={Shield}
                  gradient="from-green-500 to-emerald-500"
                />
                <StatCard
                  label="Pending Rewards"
                  value="$1,245"
                  subtext="Ready to claim"
                  icon={DollarSign}
                  gradient="from-cyan-500 to-blue-500"
                />
                <StatCard
                  label="Total Earned"
                  value="$8,420"
                  subtext="All time"
                  icon={TrendingUp}
                  gradient="from-purple-500 to-pink-500"
                />
                <StatCard
                  label="Success Rate"
                  value="96.2%"
                  subtext="Settlements"
                  icon={CheckCircle2}
                  gradient="from-orange-500 to-red-500"
                />
              </div>

              {/* RFQs where I can claim rewards */}
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-6">RFQs Ready for Reward Claim</h2>
                <div className="space-y-3">
                  {myFacilitatorRFQs.map((rfq) => (
                    <FacilitatorRFQCard
                      key={rfq.id}
                      rfq={rfq}
                      onViewRFQ={onViewRFQ}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
    <div className="relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 group hover:border-white/20 transition-all">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
      <div className="relative">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} w-fit mb-3`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        <div className="text-xs text-white/50 mb-1">{label}</div>
        <div className="text-xs text-white/40">{subtext}</div>
      </div>
    </div>
  );
}

interface MakerStateSectionProps {
  title: string;
  subtitle: string;
  color: string;
  rfqs: RFQ[];
  onViewRFQ: (id: string) => void;
  collapsed?: boolean;
}

function MakerStateSection({ title, subtitle, color, rfqs, onViewRFQ, collapsed }: MakerStateSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed || false);

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className={`text-xl font-semibold ${color}`}>{title}</h2>
            <span className="text-sm text-white/50">({rfqs.length})</span>
          </div>
          <p className="text-sm text-white/50">{subtitle}</p>
        </div>
        {collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white/60 hover:text-white"
          >
            {isCollapsed ? "Show" : "Hide"}
          </Button>
        )}
      </div>

      {!isCollapsed && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rfqs.map((rfq) => (
            <MakerRFQCard
              key={rfq.id}
              rfq={rfq}
              onView={() => onViewRFQ(rfq.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MakerRFQCard({ rfq, onView }: { rfq: RFQ; onView: () => void }) {
  const [base, quote] = rfq.pair.split('/');

  const getActionButton = () => {
    switch (rfq.state) {
      case "Draft":
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10">
              <Edit className="mr-1 h-3 w-3" />
              Edit
            </Button>
            <Button size="sm" variant="outline" className="flex-1 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20">
              <X className="mr-1 h-3 w-3" />
              Cancel
            </Button>
          </div>
        );
      case "Open":
        return (
          <Button onClick={onView} size="sm" className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white">
            <Clock className="mr-2 h-4 w-4" />
            Monitor
          </Button>
        );
      case "Revealed":
        return (
          <Button onClick={onView} size="sm" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
            <Eye className="mr-2 h-4 w-4" />
            Select Quote
          </Button>
        );
      default:
        return (
          <Button onClick={onView} size="sm" variant="outline" className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10">
            View Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        );
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-cyan-400" />
          <span className="font-semibold text-white">{rfq.pair}</span>
        </div>
        <StatusBadge status={rfq.state} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-xs text-white/50">Base</div>
          <div className="text-sm font-semibold text-white">{rfq.baseAmount.toLocaleString()}</div>
          <div className="text-xs text-white/40">{base}</div>
        </div>
        <div>
          <div className="text-xs text-white/50">Quote Target</div>
          <div className="text-sm font-semibold text-white">{rfq.quoteAmount.toLocaleString()}</div>
          <div className="text-xs text-white/40">{quote}</div>
        </div>
      </div>

      {rfq.expires && (
        <div className="flex items-center gap-2 mb-4 text-xs">
          <Clock className="h-3 w-3 text-orange-400" />
          <span className="text-white/50">Expires in </span>
          <span className="text-orange-400 font-medium">{rfq.expires}</span>
        </div>
      )}

      {getActionButton()}
    </div>
  );
}

function RFQMarketplaceCard({ rfq, onQuote }: { rfq: RFQ; onQuote: () => void }) {
  const [base, quote] = rfq.pair.split('/');

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-green-500/30 hover:bg-green-500/5 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-cyan-400" />
          <span className="font-semibold text-white">{rfq.pair}</span>
        </div>
        <StatusBadge status={rfq.state} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-white/50">Base</div>
          <div className="text-sm font-semibold text-white">{rfq.baseAmount.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-white/50">Target</div>
          <div className="text-sm font-semibold text-white">{rfq.quoteAmount.toLocaleString()}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 text-xs bg-white/5 rounded p-2">
        <Shield className="h-3 w-3 text-cyan-400" />
        <span className="text-white/50">Bond: </span>
        <span className="text-white font-medium">{rfq.bondAmount?.toLocaleString() || "N/A"} USDC</span>
      </div>

      <div className="flex items-center gap-2 mb-4 text-xs">
        <Clock className="h-3 w-3 text-orange-400" />
        <span className="text-orange-400 font-medium">{rfq.expires}</span>
      </div>

      <Button onClick={onQuote} size="sm" className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
        <Lock className="mr-2 h-4 w-4" />
        Commit Quote
      </Button>
    </div>
  );
}

interface TakerQuotesSectionProps {
  title: string;
  subtitle: string;
  color: string;
  quotes: Array<{ rfq: RFQ; myQuoteAmount: number; selected: boolean }>;
  onViewRFQ: (id: string) => void;
  actionLabel: string | ((quote: any) => string);
  collapsed?: boolean;
}

function TakerQuotesSection({ title, subtitle, color, quotes, onViewRFQ, actionLabel, collapsed }: TakerQuotesSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed || false);

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className={`text-xl font-semibold ${color}`}>{title}</h3>
            <span className="text-sm text-white/50">({quotes.length})</span>
          </div>
          <p className="text-sm text-white/50">{subtitle}</p>
        </div>
        {collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white/60 hover:text-white"
          >
            {isCollapsed ? "Show" : "Hide"}
          </Button>
        )}
      </div>

      {!isCollapsed && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quotes.map((quote) => (
            <TakerQuoteCard
              key={quote.rfq.id}
              quote={quote}
              onView={() => onViewRFQ(quote.rfq.id)}
              actionLabel={typeof actionLabel === "function" ? actionLabel(quote) : actionLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TakerQuoteCard({ quote, onView, actionLabel }: { quote: any; onView: () => void; actionLabel: string }) {
  const [base, quoteToken] = quote.rfq.pair.split('/');

  const getButtonStyle = () => {
    if (quote.rfq.state === "Selected") {
      if (quote.selected) {
        return "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600";
      } else {
        return "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600";
      }
    }
    return "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600";
  };

  return (
    <div className={`bg-white/5 border rounded-lg p-4 hover:border-white/20 transition-all ${
      quote.selected && quote.rfq.state === "Selected" ? "border-green-500/30 bg-green-500/5" : "border-white/10"
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-cyan-400" />
          <span className="font-semibold text-white">{quote.rfq.pair}</span>
        </div>
        <StatusBadge status={quote.rfq.state} />
      </div>

      {quote.selected && quote.rfq.state === "Selected" && (
        <div className="mb-3 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-xs text-green-400 font-medium">
          🎉 Your quote won!
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-xs text-white/50">My Quote</div>
          <div className="text-sm font-semibold text-white">{quote.myQuoteAmount.toLocaleString()}</div>
          <div className="text-xs text-white/40">{quoteToken}</div>
        </div>
        <div>
          <div className="text-xs text-white/50">Base Amount</div>
          <div className="text-sm font-semibold text-white">{quote.rfq.baseAmount.toLocaleString()}</div>
          <div className="text-xs text-white/40">{base}</div>
        </div>
      </div>

      <Button onClick={onView} size="sm" className={`w-full ${getButtonStyle()} text-white`}>
        {actionLabel === "Reveal Quote" && <Unlock className="mr-2 h-4 w-4" />}
        {actionLabel === "Complete Settlement" && <CheckCircle2 className="mr-2 h-4 w-4" />}
        {actionLabel}
      </Button>
    </div>
  );
}

function FacilitatorRFQCard({ rfq, onViewRFQ }: { rfq: RFQ; onViewRFQ: (id: string) => void }) {
  const estimatedReward = (rfq.takerFee || 0) * 0.1; // Mock: 10% of taker fee

  return (
    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-4 hover:border-green-500/30 hover:bg-green-500/5 transition-all">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Coins className="h-4 w-4 text-cyan-400" />
            <span className="font-semibold text-white">{rfq.pair}</span>
            <StatusBadge status={rfq.state} />
          </div>
          <div className="text-sm text-white/60">RFQ ID: {rfq.id}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-xs text-white/50">Reward</div>
          <div className="text-lg font-bold text-green-400">${estimatedReward.toFixed(2)}</div>
        </div>
        {rfq.state === "Settled" ? (
          <Button size="sm" className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white">
            <DollarSign className="mr-2 h-4 w-4" />
            Claim Reward
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onViewRFQ(rfq.id)} className="bg-white/5 border-white/20 text-white hover:bg-white/10">
            Monitor
          </Button>
        )}
      </div>
    </div>
  );
}
