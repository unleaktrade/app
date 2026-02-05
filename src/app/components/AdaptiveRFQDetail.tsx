import { motion } from "motion/react";
import { RFQ } from "@/app/App";
import { Button } from "@/app/components/ui/button";
import { StatusBadge } from "@/app/components/StatusBadge";
import { mockRFQs } from "@/app/data/mockRFQs";
import { toast } from "sonner";
import { 
  ArrowLeft, Clock, Shield, Coins, Eye, 
  CheckCircle2, Edit, AlertTriangle, Zap,
  Users, Lock, Unlock, TrendingUp, FileText, X
} from "lucide-react";
import { useState } from "react";

interface AdaptiveRFQDetailProps {
  rfqId: string;
  onBack: () => void;
  onQuoteRFQ?: (rfq: RFQ) => void;
}

export function AdaptiveRFQDetail({ rfqId, onBack, onQuoteRFQ }: AdaptiveRFQDetailProps) {
  // Get the actual RFQ from mockRFQs
  const rfq = mockRFQs.find(r => r.id === rfqId);
  
  if (!rfq) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pb-32 pt-16 flex items-center justify-center">
        <div className="text-white">RFQ not found</div>
      </div>
    );
  }

  // Determine user role in this RFQ
  const [userRole, setUserRole] = useState<"maker" | "taker" | "observer">("maker");
  const [isSelectedTaker, setIsSelectedTaker] = useState(rfq.state === "Selected");

  const [base, quote] = rfq.pair.split('/');

  // Mock committed takers
  const committedTakers = [
    { id: "taker1", bondAmount: 5000, timestamp: "2024-02-04T10:15:00Z" },
    { id: "taker2", bondAmount: 5000, timestamp: "2024-02-04T10:18:00Z" },
    { id: "taker3", bondAmount: 5000, timestamp: "2024-02-04T10:22:00Z" },
  ];

  // Mock revealed quotes (only visible in Revealed state)
  const revealedQuotes = [
    { takerId: "taker1", quoteAmount: rfq.quoteAmount * 0.99, price: rfq.price * 0.99, bondAmount: 5000, revealedAt: "2024-02-04T11:00:00Z" },
    { takerId: "taker2", quoteAmount: rfq.quoteAmount * 0.995, price: rfq.price * 0.995, bondAmount: 5000, revealedAt: "2024-02-04T11:02:00Z" },
    { takerId: "taker3", quoteAmount: rfq.quoteAmount * 1.01, price: rfq.price * 1.01, bondAmount: 5000, revealedAt: "2024-02-04T11:05:00Z" },
  ];

  const handleEditRFQ = () => {
    toast.info("Edit RFQ", { description: "Edit functionality will be implemented soon" });
  };

  const handleCancelRFQ = () => {
    toast.error("Cancel RFQ", { description: "RFQ cancelled. Your draft has been deleted." });
    setTimeout(() => onBack(), 1500);
  };

  const handleOpenRFQ = () => {
    toast.success("RFQ Opened!", { description: "Your RFQ is now open for quotes" });
    setTimeout(() => onBack(), 1500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-32 pt-16">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6 text-white/60 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Header */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs text-white/40 font-mono mb-1">RFQ ID</div>
              <div className="text-lg font-mono text-white mb-3">{rfq.id}</div>
              <div className="flex items-center gap-3">
                <Coins className="h-5 w-5 text-cyan-400" />
                <span className="text-2xl font-bold text-white">{rfq.pair}</span>
              </div>
            </div>
            <StatusBadge status={rfq.state} />
          </div>

          {/* Basic RFQ Info - Always Visible */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
            <div>
              <div className="text-xs text-white/50 mb-1">Base Amount</div>
              <div className="text-xl font-semibold text-white">{rfq.baseAmount.toLocaleString()}</div>
              <div className="text-sm text-white/40">{base}</div>
            </div>
            <div>
              <div className="text-xs text-white/50 mb-1">Quote Amount (Target)</div>
              <div className="text-xl font-semibold text-white">{rfq.quoteAmount.toLocaleString()}</div>
              <div className="text-sm text-white/40">{quote}</div>
            </div>
          </div>
        </div>

        {/* STATE-SPECIFIC CONTENT */}
        
        {/* DRAFT STATE - Maker Only */}
        {rfq.state === "Draft" && userRole === "maker" && (
          <DraftView rfq={rfq} handleEditRFQ={handleEditRFQ} handleCancelRFQ={handleCancelRFQ} handleOpenRFQ={handleOpenRFQ} />
        )}

        {/* OPEN STATE */}
        {rfq.state === "Open" && (
          <OpenView rfq={rfq} userRole={userRole} onQuoteRFQ={onQuoteRFQ} />
        )}

        {/* COMMITTED STATE */}
        {rfq.state === "Committed" && (
          <CommittedView 
            rfq={rfq} 
            userRole={userRole} 
            committedTakers={committedTakers}
          />
        )}

        {/* REVEALED STATE */}
        {rfq.state === "Revealed" && (
          <RevealedView 
            rfq={rfq} 
            userRole={userRole} 
            revealedQuotes={revealedQuotes}
          />
        )}

        {/* SELECTED STATE */}
        {rfq.state === "Selected" && (
          <SelectedView 
            rfq={rfq} 
            userRole={userRole}
            isSelectedTaker={isSelectedTaker}
          />
        )}

        {/* SETTLED STATE */}
        {rfq.state === "Settled" && (
          <SettledView rfq={rfq} userRole={userRole} />
        )}
      </div>
    </div>
  );
}

// STATE-SPECIFIC VIEW COMPONENTS

function DraftView({ rfq, handleEditRFQ, handleCancelRFQ, handleOpenRFQ }: { rfq: RFQ; handleEditRFQ: () => void; handleCancelRFQ: () => void; handleOpenRFQ: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-lg bg-purple-500/20">
            <Edit className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Complete Your RFQ</h2>
            <p className="text-white/60">Review parameters and open this RFQ for takers to quote</p>
          </div>
        </div>

        {/* Bond Requirement Preview */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-5 w-5 text-cyan-400" />
            <h3 className="font-semibold text-white">Bond Requirements</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-white/50">Your Bond</div>
              <div className="text-lg font-semibold text-white">2,500 USDC</div>
              <div className="text-xs text-green-400">Available in wallet</div>
            </div>
            <div>
              <div className="text-xs text-white/50">Taker Bond (Required)</div>
              <div className="text-lg font-semibold text-white">5,000 USDC</div>
              <div className="text-xs text-white/40">Per taker quote</div>
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
            onClick={handleEditRFQ}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Parameters
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            onClick={handleOpenRFQ}
          >
            <Zap className="mr-2 h-4 w-4" />
            Open RFQ
          </Button>
          <Button
            variant="outline"
            className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
            onClick={handleCancelRFQ}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel RFQ
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function OpenView({ rfq, userRole, onQuoteRFQ }: { rfq: RFQ; userRole: string; onQuoteRFQ?: (rfq: RFQ) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {userRole === "maker" ? (
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg bg-green-500/20">
              <Clock className="h-6 w-6 text-green-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-2">Waiting for Quotes</h2>
              <p className="text-white/60">RFQ is open. Takers can commit quotes until the deadline.</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/50">Expires in</div>
              <div className="text-2xl font-bold text-orange-400">{rfq.expires}</div>
            </div>
          </div>

          {/* No commitments yet indicator */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-green-400" />
                <span className="text-white font-medium">RFQ is Open</span>
              </div>
              <div className="text-sm text-white/60">Waiting for first commitment...</div>
            </div>
            <p className="text-xs text-white/50 mt-2">You'll be notified when takers start committing</p>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg bg-cyan-500/20">
              <Zap className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-2">Quote on this RFQ</h2>
              <p className="text-white/60">Submit a competitive quote before the deadline</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/50">Time left</div>
              <div className="text-2xl font-bold text-orange-400">{rfq.expires}</div>
            </div>
          </div>

          {/* Bond Requirement */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-5 w-5 text-cyan-400" />
              <span className="text-white font-medium">Bond Required</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">5,000 USDC</div>
            <p className="text-xs text-white/50">Locked until reveal or refunded if not selected</p>
          </div>

          {/* Primary CTA */}
          <Button
            onClick={() => onQuoteRFQ?.(rfq)}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
          >
            <Lock className="mr-2 h-5 w-5" />
            Commit Quote (Bond: 5,000 USDC)
          </Button>
        </div>
      )}
    </motion.div>
  );
}

function CommittedView({ rfq, userRole, committedTakers }: { rfq: RFQ; userRole: string; committedTakers: any[] }) {
  const [hasCommitted, setHasCommitted] = useState(true); // Mock: user has committed

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {userRole === "maker" ? (
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-2">Takers Committed</h2>
              <p className="text-white/60">Waiting for reveal deadline to see quotes</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/50">Reveal in</div>
              <div className="text-2xl font-bold text-orange-400">28m</div>
            </div>
          </div>

          {/* Anonymous Taker List */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-3">Committed Takers ({committedTakers.length})</h3>
            <div className="space-y-2">
              {committedTakers.map((taker, idx) => (
                <div key={taker.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                      {idx + 1}
                    </div>
                    <span className="text-white/60 font-mono text-sm">{taker.id}</span>
                  </div>
                  <div className="text-sm text-white/80">Bond: {taker.bondAmount.toLocaleString()} USDC</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : hasCommitted ? (
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <Eye className="h-6 w-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-2">Reveal Your Quote</h2>
              <p className="text-white/60">Your quote is committed. Reveal it before the deadline.</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/50">Reveal by</div>
              <div className="text-2xl font-bold text-orange-400">28m</div>
            </div>
          </div>

          {/* Bond Status */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Lock className="h-5 w-5 text-yellow-400" />
              <span className="text-white font-medium">Your Bond: Locked</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">5,000 USDC</div>
            <p className="text-xs text-green-400">Will be refunded if not selected</p>
          </div>

          {/* Primary CTA */}
          <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
            <Unlock className="mr-2 h-5 w-5" />
            Reveal Quote Now
          </Button>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-gray-500/10 to-gray-600/10 border border-gray-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-gray-500/20">
              <AlertTriangle className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Commitment Window Closed</h2>
              <p className="text-white/60">You did not commit a quote for this RFQ</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function RevealedView({ rfq, userRole, revealedQuotes }: { rfq: RFQ; userRole: string; revealedQuotes: any[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {userRole === "maker" ? (
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <Eye className="h-6 w-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-2">Select Best Quote</h2>
              <p className="text-white/60">Compare quotes and choose the winning taker</p>
            </div>
          </div>

          {/* Quote Comparison */}
          <div className="space-y-3 mb-6">
            {revealedQuotes
              .sort((a, b) => a.price - b.price) // Sort by best price
              .map((quote, idx) => (
                <div 
                  key={quote.takerId} 
                  className={`bg-white/5 border ${idx === 0 ? 'border-green-500/30 bg-green-500/5' : 'border-white/10'} rounded-lg p-4 hover:border-white/20 transition-all`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${idx === 0 ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gradient-to-br from-cyan-500 to-blue-500'} flex items-center justify-center text-white font-bold`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-sm font-mono text-white/60">{quote.takerId}</div>
                        {idx === 0 && <div className="text-xs text-green-400 font-medium">Best Price</div>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    >
                      Select This Quote
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-white/50">Quote Amount</div>
                      <div className="text-lg font-semibold text-white">{quote.quoteAmount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/50">Price</div>
                      <div className="text-lg font-semibold text-white">{quote.price}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/50">Bond</div>
                      <div className="text-lg font-semibold text-white">{quote.bondAmount.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <Clock className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Quote Revealed</h2>
              <p className="text-white/60">Waiting for maker to select a quote</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <span className="text-white">Your quote has been successfully revealed</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SelectedView({ rfq, userRole, isSelectedTaker }: { rfq: RFQ; userRole: string; isSelectedTaker: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {userRole === "maker" ? (
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg bg-green-500/20">
              <CheckCircle2 className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Quote Selected</h2>
              <p className="text-white/60">Waiting for taker to complete settlement</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="text-sm text-white/50 mb-1">Selected Taker</div>
            <div className="text-lg font-mono text-white mb-3">taker1</div>
            <div className="text-xs text-green-400">Settlement in progress...</div>
          </div>
        </div>
      ) : isSelectedTaker ? (
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg bg-green-500/20">
              <CheckCircle2 className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">🎉 Your Quote Won!</h2>
              <p className="text-white/60">Complete the settlement to finalize the trade</p>
            </div>
          </div>

          <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white">
            <Zap className="mr-2 h-5 w-5" />
            Complete Settlement
          </Button>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-gray-500/10 to-gray-600/10 border border-gray-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg bg-gray-500/20">
              <AlertTriangle className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Not Selected</h2>
              <p className="text-white/60">Your quote was not chosen. Bond will be refunded.</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Unlock className="h-5 w-5 text-cyan-400" />
              <span className="text-white/80">Bond refund pending: 5,000 USDC</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SettledView({ rfq, userRole }: { rfq: RFQ; userRole: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6"
    >
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 rounded-lg bg-green-500/20">
          <CheckCircle2 className="h-6 w-6 text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">✅ Settlement Complete</h2>
          <p className="text-white/60">Trade executed successfully</p>
        </div>
      </div>

      {/* Settlement Summary */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-white mb-3">Settlement Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-white/50">Final Price</div>
            <div className="text-lg font-semibold text-white">{rfq.price}</div>
          </div>
          <div>
            <div className="text-xs text-white/50">Total Volume</div>
            <div className="text-lg font-semibold text-white">{rfq.quoteAmount.toLocaleString()} USDC</div>
          </div>
          <div>
            <div className="text-xs text-white/50">Settled At</div>
            <div className="text-sm text-white/80">Feb 4, 2024 11:45 AM</div>
          </div>
          <div>
            <div className="text-xs text-white/50">Bond Status</div>
            <div className="text-sm text-green-400">Refunded</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}