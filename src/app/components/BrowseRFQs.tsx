import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/app/components/ui/button";
import { Search, Coins, Eye, Filter } from "lucide-react";
import { RFQ } from "@/app/App";
import { mockRFQs, getCardGradient, getCardBorder, getCardGlow } from "@/app/data/mockRFQs";
import { StatusBadge } from "@/app/components/StatusBadge";
import { Input } from "@/app/components/ui/input";

interface BrowseRFQsProps {
  myRFQsOnly?: boolean;
  onViewRFQ: (rfqId: string) => void;
  onQuoteRFQ: (rfq: RFQ) => void;
}

export function BrowseRFQs({ myRFQsOnly = false, onViewRFQ, onQuoteRFQ }: BrowseRFQsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterExpiringSoon, setFilterExpiringSoon] = useState(false);

  const filteredRFQs = mockRFQs.filter(rfq => {
    if (searchQuery && !rfq.pair.toLowerCase().includes(searchQuery.toLowerCase()) && !rfq.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterExpiringSoon && rfq.state !== "Open") return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            {myRFQsOnly ? "My RFQs" : "Browse Open RFQs"}
          </h1>
          <p className="text-white/60">
            {myRFQsOnly ? "View and manage your requests" : "View and quote on available requests for quote"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6"
        >
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search by pair, ID, or amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            
            <Button
              variant={filterExpiringSoon ? "default" : "outline"}
              onClick={() => setFilterExpiringSoon(!filterExpiringSoon)}
              className={filterExpiringSoon ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white" : "bg-white/10 border-white/30 text-white/90 hover:bg-white/[0.15] hover:border-white/40 hover:text-white"}
            >
              <Filter className="mr-2 h-4 w-4" />
              Expires Soon
            </Button>
          </div>

          <div className="text-sm text-white/50 mb-4">Showing 1-12 of {filteredRFQs.length} RFQs</div>

          {/* Grid of RFQ cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRFQs.slice(0, 12).map((rfq, index) => {
              const [base, quote] = rfq.pair.split('/');
              
              return (
                <motion.div
                  key={rfq.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className={`relative overflow-hidden ${getCardGradient(rfq.state)} backdrop-blur-sm border ${getCardBorder(rfq.state)} rounded-xl p-5 transition-all group`}
                >
                  {/* Glossy gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${getCardGlow(rfq.state)} transition-all duration-300`} />
                  
                  <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-xs font-mono text-white/40 mb-1">RFQ ID</div>
                        <div className="text-sm font-mono text-white">{rfq.id}</div>
                      </div>
                      <StatusBadge status={rfq.state} />
                    </div>

                    {/* Pair */}
                    <div className="mb-4">
                      <div className="text-xs text-white/50 mb-1">Pair</div>
                      <div className="flex items-center gap-1 text-lg font-semibold text-white">
                        <Coins className="h-4 w-4 text-cyan-400" />
                        {rfq.pair}
                      </div>
                    </div>

                    {/* Amounts */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <div className="text-xs text-white/50 mb-1">Base Amount</div>
                        <div className="text-sm font-semibold text-white">{rfq.baseAmount.toLocaleString()}</div>
                        <div className="text-xs text-white/40">{base}</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/50 mb-1">Quote Amount</div>
                        <div className="text-sm font-semibold text-white">{rfq.quoteAmount.toLocaleString()}</div>
                        <div className="text-xs text-white/40">{quote}</div>
                      </div>
                    </div>

                    {/* Exchange Rate */}
                    <div className="mb-4 pb-4 border-b border-white/10">
                      <div className="text-xs text-white/50 mb-1">Exchange Rate</div>
                      <div className="text-sm text-white">1 {base} = {rfq.price.toFixed(4)} {quote}</div>
                    </div>

                    {/* Expires */}
                    {rfq.expires && (
                      <div className="mb-4 text-xs">
                        <span className="text-white/50">Expires in </span>
                        <span className="text-cyan-400 font-medium">{rfq.expires}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewRFQ(rfq.id)}
                        className="flex-1 bg-white/10 border-white/30 text-white/90 hover:bg-white/[0.15] hover:border-white/40 hover:text-white"
                      >
                        <Eye className="mr-2 h-3.5 w-3.5" />
                        View
                      </Button>
                      {rfq.state === "Open" && (
                        <Button
                          size="sm"
                          onClick={() => onQuoteRFQ(rfq)}
                          className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                        >
                          Quote on this RFQ
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}