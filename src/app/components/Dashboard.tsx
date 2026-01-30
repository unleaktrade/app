import { UserRole } from "@/app/App";
import { motion } from "motion/react";
import { RFQCard } from "@/app/components/RFQCard";
import { mockRFQs } from "@/app/data/mockData";
import { TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface DashboardProps {
  userRole: UserRole;
  onViewRFQ: (rfqId: string) => void;
}

export function Dashboard({ userRole, onViewRFQ }: DashboardProps) {
  const userRFQs = userRole === "maker" 
    ? mockRFQs.filter(rfq => ["Open", "Revealed", "Selected", "Settled"].includes(rfq.state))
    : mockRFQs.filter(rfq => rfq.state === "Open" || rfq.state === "Committed");

  const stats = {
    maker: {
      active: mockRFQs.filter(rfq => ["Open", "Committed", "Revealed"].includes(rfq.state)).length,
      pending: mockRFQs.filter(rfq => rfq.state === "Selected").length,
      completed: mockRFQs.filter(rfq => rfq.state === "Settled").length,
      totalVolume: "524.3K",
    },
    taker: {
      available: mockRFQs.filter(rfq => rfq.state === "Open").length,
      active: mockRFQs.filter(rfq => rfq.state === "Committed").length,
      completed: 12,
      totalVolume: "342.1K",
    },
  };

  const currentStats = userRole === "maker" ? stats.maker : stats.taker;

  return (
    <div className="min-h-screen bg-black">
      {/* Gradient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            {userRole === "maker" ? "Maker Dashboard" : "Taker Dashboard"}
          </h1>
          <p className="text-white/60">
            {userRole === "maker" 
              ? "Create and manage your RFQs, review quotes from takers"
              : "Browse available RFQs and submit competitive quotes"}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">
                {userRole === "maker" ? "Active" : "Available"}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {userRole === "maker" ? currentStats.active : currentStats.available}
            </div>
            <div className="text-xs text-white/60 mt-1">
              {userRole === "maker" ? "RFQs" : "Opportunities"}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-blue-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">
                {userRole === "maker" ? "Pending" : "Active"}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {userRole === "maker" ? currentStats.pending : currentStats.active}
            </div>
            <div className="text-xs text-white/60 mt-1">
              {userRole === "maker" ? "Selections" : "Quotes"}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Completed</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {currentStats.completed}
            </div>
            <div className="text-xs text-white/60 mt-1">Settlements</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Volume</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">
              ${currentStats.totalVolume}
            </div>
            <div className="text-xs text-white/60 mt-1">USDC</div>
          </div>
        </motion.div>

        {/* RFQ List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              {userRole === "maker" ? "Your RFQs" : "Available RFQs"}
            </h2>
            <div className="text-sm text-white/60">
              {userRFQs.length} {userRFQs.length === 1 ? "RFQ" : "RFQs"}
            </div>
          </div>

          {userRFQs.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
              <div className="text-white/40 text-lg mb-2">No RFQs available</div>
              <div className="text-white/30 text-sm">
                {userRole === "maker" 
                  ? "Create your first RFQ to get started"
                  : "Check back later for new opportunities"}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {userRFQs.map((rfq, index) => (
                <motion.div
                  key={rfq.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <RFQCard rfq={rfq} onView={() => onViewRFQ(rfq.id)} userRole={userRole} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}