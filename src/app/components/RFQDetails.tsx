import { useState } from "react";
import { UserRole } from "@/app/App";
import { motion } from "motion/react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { mockRFQs, getStateColor, getStateBgColor } from "@/app/data/mockData";
import { ArrowLeft, Clock, Users, Shield, ArrowRight, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

interface RFQDetailsProps {
  rfqId: string;
  userRole: UserRole;
  onBack: () => void;
}

export function RFQDetails({ rfqId, userRole, onBack }: RFQDetailsProps) {
  const rfq = mockRFQs.find((r) => r.id === rfqId);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  if (!rfq) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/60">RFQ not found</div>
      </div>
    );
  }

  const timeLeft = rfq.openedAt ? Math.max(0, rfq.commitTtl - (Date.now() - rfq.openedAt) / 1000) : 0;
  const hoursLeft = Math.floor(timeLeft / 3600);
  const minutesLeft = Math.floor((timeLeft % 3600) / 60);

  const handleSubmitQuote = () => {
    if (!quoteAmount) {
      toast.error("Please enter a quote amount");
      return;
    }

    toast.success("Quote submitted successfully!", {
      description: "Your quote has been committed. Remember to reveal it during the reveal phase.",
    });

    setQuoteAmount("");
  };

  const handleSelectQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    toast.success("Quote selected!", {
      description: "Deposit your base tokens to proceed with settlement.",
    });
  };

  const handleCompleteSettlement = () => {
    toast.success("Settlement completed!", {
      description: "Funds have been exchanged and bonds refunded.",
    });
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4 text-white/60 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  {rfq.baseAmount.toLocaleString()} {rfq.baseMint}
                </h1>
                <ArrowRight className="h-5 w-5 text-white/40" />
                <span className="text-xl text-white/60">{rfq.quoteMint}</span>
              </div>
              <p className="text-sm text-white/60">
                Min: {rfq.minQuoteAmount.toLocaleString()} {rfq.quoteMint}
              </p>
            </div>

            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${getStateBgColor(rfq.state)} ${getStateColor(rfq.state)}`}>
              {rfq.state}
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* RFQ Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4">RFQ Details</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-white/60 mb-1">Maker</div>
                  <div className="font-mono text-sm text-white">{rfq.maker}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">UUID</div>
                  <div className="font-mono text-xs text-white truncate">{rfq.uuid}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Maker Bond</div>
                  <div className="text-white">{rfq.makerBond.toLocaleString()} USDC</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Taker Bond</div>
                  <div className="text-white">{rfq.takerBond.toLocaleString()} USDC</div>
                </div>
              </div>

              {rfq.state === "Open" && timeLeft > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-white/80">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Time remaining:</span>
                    <span className="font-semibold">{hoursLeft}h {minutesLeft}m</span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Quotes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Quotes ({rfq.quotes.length})
                </h2>
              </div>

              {rfq.quotes.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  No quotes submitted yet
                </div>
              ) : (
                <div className="space-y-3">
                  {rfq.quotes.map((quote) => (
                    <div
                      key={quote.id}
                      className={`bg-white/5 border rounded-lg p-4 transition-all ${
                        quote.selected
                          ? "border-green-500/50 bg-green-500/5"
                          : selectedQuoteId === quote.id
                          ? "border-cyan-500/50 bg-cyan-500/5"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-xs text-white/60 mb-1">Taker</div>
                          <div className="font-mono text-sm text-white">{quote.taker}</div>
                        </div>
                        {quote.selected && (
                          <div className="flex items-center gap-1 text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
                            <CheckCircle2 className="h-3 w-3" />
                            Selected
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                          <div className="text-xs text-white/60 mb-1">Quote Amount</div>
                          {quote.revealed ? (
                            <div className="text-sm font-semibold text-white">
                              {quote.quoteAmount.toLocaleString()} {rfq.quoteMint}
                            </div>
                          ) : (
                            <div className="text-sm text-yellow-400">Committed</div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-white/60 mb-1">Bond</div>
                          <div className="text-sm text-white">{quote.bondAmount.toLocaleString()} USDC</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/60 mb-1">Fee</div>
                          {quote.revealed ? (
                            <div className="text-sm text-white">{quote.feeAmount.toLocaleString()} USDC</div>
                          ) : (
                            <div className="text-sm text-white/40">—</div>
                          )}
                        </div>
                      </div>

                      {userRole === "maker" && rfq.state === "Revealed" && quote.revealed && !rfq.selectedQuote && (
                        <Button
                          size="sm"
                          onClick={() => handleSelectQuote(quote.id)}
                          disabled={!!selectedQuoteId}
                          className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
                        >
                          Select This Quote
                        </Button>
                      )}

                      {userRole === "taker" && quote.selected && rfq.state === "Selected" && (
                        <Button
                          size="sm"
                          onClick={handleCompleteSettlement}
                          className="w-full bg-green-500 hover:bg-green-600 text-white"
                        >
                          Complete Settlement
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Submit Quote (Taker only) */}
            {userRole === "taker" && rfq.state === "Open" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Submit Quote
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="quoteAmount" className="text-white/80 mb-2">
                      Your Quote Amount
                    </Label>
                    <Input
                      id="quoteAmount"
                      type="number"
                      placeholder={`Min: ${rfq.minQuoteAmount.toLocaleString()}`}
                      value={quoteAmount}
                      onChange={(e) => setQuoteAmount(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                    />
                    <div className="text-xs text-white/60 mt-1">
                      in {rfq.quoteMint}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Required Bond</span>
                      <span className="text-white font-medium">{rfq.takerBond.toLocaleString()} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Estimated Fee</span>
                      <span className="text-white font-medium">
                        {quoteAmount ? (parseFloat(quoteAmount) * 0.005).toFixed(2) : "—"} USDC
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmitQuote}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Submit Quote
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Time Limits */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Limits
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Commit Phase</span>
                  <span className="text-white">{Math.floor(rfq.commitTtl / 60)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Reveal Phase</span>
                  <span className="text-white">{Math.floor(rfq.revealTtl / 60)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Selection Phase</span>
                  <span className="text-white">{Math.floor(rfq.selectionTtl / 60)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Funding Phase</span>
                  <span className="text-white">{Math.floor(rfq.fundTtl / 60)}m</span>
                </div>
              </div>
            </motion.div>

            {/* Security */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
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