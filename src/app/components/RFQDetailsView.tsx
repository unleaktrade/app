import { motion } from "motion/react";
import { RFQ } from "@/app/App";
import { mockRFQs } from "@/app/data/mockRFQs";
import { StatusBadge } from "@/app/components/StatusBadge";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft, Clock, Shield, TrendingUp, Users, CheckCircle2 } from "lucide-react";

interface RFQDetailsViewProps {
  rfqId: string;
  onBack: () => void;
  onQuoteRFQ: (rfq: RFQ) => void;
}

export function RFQDetailsView({ rfqId, onBack, onQuoteRFQ }: RFQDetailsViewProps) {
  const rfq = mockRFQs.find(r => r.id === rfqId);

  if (!rfq) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white/60">RFQ not found</div>
      </div>
    );
  }

  const [base, quote] = rfq.pair.split('/');

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-6 text-white/60 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{rfq.pair}</h1>
              <p className="text-sm text-white/60 font-mono">{rfq.id}</p>
            </div>
            <StatusBadge status={rfq.state} />
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-6">Trade Details</h2>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-white/50 mb-2">Base Amount</div>
                  <div className="text-2xl font-bold text-white">{rfq.baseAmount.toLocaleString()}</div>
                  <div className="text-sm text-white/60">{base}</div>
                </div>

                <div>
                  <div className="text-sm text-white/50 mb-2">Quote Amount</div>
                  <div className="text-2xl font-bold text-white">{rfq.quoteAmount.toLocaleString()}</div>
                  <div className="text-sm text-white/60">{quote}</div>
                </div>

                <div>
                  <div className="text-sm text-white/50 mb-2">Exchange Rate</div>
                  <div className="text-xl font-semibold text-white">
                    1 {base} = {rfq.price.toFixed(4)} {quote}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-white/50 mb-2">Maker</div>
                  <div className="text-sm font-mono text-white">{rfq.maker}</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4">Phase Durations</h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Commit Phase</span>
                  <span className="text-white font-medium">{Math.floor(rfq.commitTtl / 60)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Reveal Phase</span>
                  <span className="text-white font-medium">{Math.floor(rfq.revealTtl / 60)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Selection Phase</span>
                  <span className="text-white font-medium">{Math.floor(rfq.selectionTtl / 60)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Fund Phase</span>
                  <span className="text-white font-medium">{Math.floor(rfq.fundTtl / 60)}m</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {rfq.state === "Open" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4">Submit Quote</h3>
                <p className="text-sm text-white/60 mb-4">
                  Submit your competitive quote for this RFQ
                </p>
                <Button
                  onClick={() => onQuoteRFQ(rfq)}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                >
                  Quote on this RFQ
                </Button>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Information
              </h3>

              {rfq.expires && (
                <div className="mb-4 pb-4 border-b border-white/10">
                  <div className="text-sm text-white/50 mb-1">Expires in</div>
                  <div className="text-xl font-semibold text-cyan-400">{rfq.expires}</div>
                </div>
              )}

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Bond Amount</span>
                  <span className="text-white font-medium">{rfq.bondAmount.toLocaleString()} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Taker Fee</span>
                  <span className="text-white font-medium">{rfq.takerFee.toFixed(2)} USDC</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-white/80">Commit-Reveal Protocol</div>
                    <div className="text-white/50 text-xs">Prevents quote manipulation</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-white/80">Liquidity Guard</div>
                    <div className="text-white/50 text-xs">Ed25519 verification</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-white/80">Bond Collateral</div>
                    <div className="text-white/50 text-xs">Ensures commitment</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}