import { motion } from "motion/react";
import { RFQ as LegacyRFQ } from "@/app/App";
import { mockRFQs as legacyMockRFQs } from "@/app/data/mockRFQs";
import { Button } from "@/app/components/ui/button";
import { StatusBadge } from "@/app/components/StatusBadge";
import {
  FileText, Activity, CheckCircle2, Clock,
  Coins, Eye, Lock, Unlock, DollarSign
} from "lucide-react";
import { useState } from "react";

interface MyQuotesProps {
  onViewRFQ: (rfqId: string) => void;
}

// Mock data: RFQs where current user has quoted
const myTakerQuotes = [
  { rfq: legacyMockRFQs.find(r => r.id === "RFQ-003")!, myQuoteAmount: 624, selected: false },
  { rfq: legacyMockRFQs.find(r => r.id === "RFQ-004")!, myQuoteAmount: 10738000, selected: false },
  { rfq: legacyMockRFQs.find(r => r.id === "A7kpMn...Zy9qWx")!, myQuoteAmount: 898, selected: true },
  { rfq: legacyMockRFQs.find(r => r.id === "RFQ-005")!, myQuoteAmount: 500100, selected: true },
];

export function MyQuotes({ onViewRFQ }: MyQuotesProps) {
  // Group quotes by RFQ state
  const quotesByState = {
    committed: myTakerQuotes.filter(q => q.rfq.state === "Committed"),
    revealed: myTakerQuotes.filter(q => q.rfq.state === "Revealed"),
    selected: myTakerQuotes.filter(q => q.rfq.state === "Selected"),
    settled: myTakerQuotes.filter(q => q.rfq.state === "Settled"),
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20 lg:pt-24 pb-16 sm:pb-32">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute top-60 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">My Quotes</h1>
          <p className="text-base sm:text-lg text-white/60">Track your submitted quotes and win rate</p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
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

        {/* Quotes by State */}
        <div className="space-y-6">
          {quotesByState.committed.length > 0 && (
            <StateSection
              title="Committed"
              subtitle="Your quotes are locked, waiting for reveal phase"
              color="text-purple-400"
              quotes={quotesByState.committed}
              onViewRFQ={onViewRFQ}
            />
          )}

          {quotesByState.revealed.length > 0 && (
            <StateSection
              title="Revealed"
              subtitle="Your quotes are visible, maker is selecting"
              color="text-indigo-400"
              quotes={quotesByState.revealed}
              onViewRFQ={onViewRFQ}
            />
          )}

          {quotesByState.selected.length > 0 && (
            <StateSection
              title="Selected"
              subtitle="You won! Waiting for settlement"
              color="text-blue-400"
              quotes={quotesByState.selected}
              onViewRFQ={onViewRFQ}
            />
          )}

          {quotesByState.settled.length > 0 && (
            <StateSection
              title="Settled"
              subtitle="Completed trades"
              color="text-teal-400"
              quotes={quotesByState.settled}
              onViewRFQ={onViewRFQ}
              collapsed
            />
          )}

          {myTakerQuotes.length === 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 sm:p-12 text-center">
              <Lock className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Quotes Yet</h3>
              <p className="text-sm text-white/50">
                Browse the marketplace and submit your first quote
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

interface StateSectionProps {
  title: string;
  subtitle: string;
  color: string;
  quotes: { rfq: LegacyRFQ; myQuoteAmount: number; selected: boolean }[];
  onViewRFQ: (rfqId: string) => void;
  collapsed?: boolean;
}

function StateSection({ title, subtitle, color, quotes, onViewRFQ, collapsed }: StateSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed || false);

  // Get state background gradient based on title
  const getStateBgGradient = (state: string) => {
    switch (state) {
      case "Committed": return "from-purple-500/10 to-purple-600/5";
      case "Revealed": return "from-indigo-500/10 to-indigo-600/5";
      case "Selected": return "from-blue-500/10 to-blue-600/5";
      case "Settled": return "from-teal-500/10 to-teal-600/5";
      default: return "from-white/5 to-white/2";
    }
  };

  return (
    <div className={`bg-gradient-to-br ${getStateBgGradient(title)} backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-lg sm:text-xl font-bold ${color} mb-1`}>
            {title} ({quotes.length})
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
          {quotes.map((quote) => (
            <QuoteCard
              key={quote.rfq.id}
              quote={quote}
              onView={() => onViewRFQ(quote.rfq.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface QuoteCardProps {
  quote: { rfq: LegacyRFQ; myQuoteAmount: number; selected: boolean };
  onView: () => void;
}

function QuoteCard({ quote, onView }: QuoteCardProps) {
  const { rfq, myQuoteAmount, selected } = quote;
  const isRevealed = ["Revealed", "Selected", "Settled"].includes(rfq.state);

  return (
    <div className={`bg-white/5 border rounded-lg p-4 hover:border-white/20 transition-all group ${
      selected ? "border-cyan-500/40 bg-cyan-500/5" : "border-white/10"
    }`}>
      {selected && (
        <div className="flex items-center gap-2 text-xs text-cyan-400 mb-2 font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          <span>YOU WON!</span>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-cyan-400" />
          <span className="font-semibold text-sm sm:text-base text-white">{rfq.pair}</span>
        </div>
        <StatusBadge status={rfq.state} />
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-white/50">RFQ Base</span>
          <span className="text-white font-medium">{rfq.baseAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-white/50">Your Quote</span>
          <div className="flex items-center gap-2">
            {!isRevealed && <Lock className="h-3 w-3 text-orange-400" />}
            {isRevealed && <Unlock className="h-3 w-3 text-cyan-400" />}
            <span className={`font-bold ${isRevealed ? "text-cyan-400" : "text-orange-400"}`}>
              {myQuoteAmount.toLocaleString()}
            </span>
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
        View RFQ
      </Button>
    </div>
  );
}