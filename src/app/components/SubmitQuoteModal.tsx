import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { RFQ } from "@/app/App";
import { toast } from "sonner";
import { Info, TrendingUp, AlertCircle } from "lucide-react";

interface SubmitQuoteModalProps {
  rfq: RFQ;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmitQuoteModal({ rfq, open, onOpenChange }: SubmitQuoteModalProps) {
  const [baseATA, setBaseATA] = useState("");
  const [quoteATA, setQuoteATA] = useState("");

  const handleSubmit = () => {
    if (!baseATA || !quoteATA) {
      toast.error("Please fill in all required fields");
      return;
    }

    toast.success("Quote submitted successfully!", {
      description: "Your quote has been committed. Make sure your token account has sufficient funds before the RFQ creator selects your quote.",
    });

    // Reset form
    setBaseATA("");
    setQuoteATA("");
    
    onOpenChange(false);
  };

  const [base, quote] = rfq.pair.split('/');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f1a] border-white/10 text-white max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Submit Quote</DialogTitle>
          <DialogDescription className="text-sm text-white/60">Provide your quote for this RFQ</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* RFQ Summary */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-white/80 font-medium">
              <TrendingUp className="h-4 w-4" />
              <span>RFQ Summary</span>
            </div>

            <div className="space-y-2">
              <div>
                <div className="text-xs text-white/50 mb-1">RFQ ID</div>
                <div className="text-sm font-mono text-white">{rfq.id}</div>
              </div>

              <div>
                <div className="text-xs text-white/50 mb-1">Trading Pair</div>
                <div className="text-sm font-semibold text-white">{rfq.pair}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-white/50 mb-1">Base Amount</div>
                  <div className="text-sm text-white font-medium">{rfq.baseAmount.toLocaleString()} {base}</div>
                </div>
                <div>
                  <div className="text-xs text-white/50 mb-1">Quote Amount</div>
                  <div className="text-sm text-white font-medium">{rfq.quoteAmount.toLocaleString()} {quote}</div>
                </div>
              </div>

              {rfq.expires && (
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <AlertCircle className="h-3 w-3 text-cyan-400" />
                  <span className="text-xs text-white/60">Expires in</span>
                  <span className="text-xs text-cyan-400 font-medium">{rfq.expires}</span>
                </div>
              )}
            </div>
          </div>

          {/* Trade Details */}
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg p-4 space-y-3">
            <div className="text-sm font-medium text-white">Trade Details</div>

            <div className="space-y-3">
              <div className="bg-black/20 rounded-lg p-3">
                <div className="text-xs text-white/50 mb-2">You will provide</div>
                <div className="text-xl font-bold text-white">{rfq.baseAmount.toLocaleString()} {base}</div>
              </div>

              <div className="bg-black/20 rounded-lg p-3">
                <div className="text-xs text-white/50 mb-2">You will receive</div>
                <div className="text-xl font-bold text-white">{rfq.quoteAmount.toLocaleString()} {quote}</div>
              </div>

              <div className="bg-black/20 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">Exchange Rate</span>
                  <span className="text-sm text-white">1 {base} = {rfq.price.toFixed(4)} {quote}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Token Accounts */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baseATA" className="flex items-center gap-2">
                Your {base} Token Account (ATA) <Info className="h-3 w-3 text-white/40" />
              </Label>
              <Input
                id="baseATA"
                placeholder="Enter your base token account address"
                value={baseATA}
                onChange={(e) => setBaseATA(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quoteATA" className="flex items-center gap-2">
                Your {quote} Token Account (ATA) <Info className="h-3 w-3 text-white/40" />
              </Label>
              <Input
                id="quoteATA"
                placeholder="Enter your quote token account address"
                value={quoteATA}
                onChange={(e) => setQuoteATA(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-sm"
              />
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
            <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-white/80">
              <div className="font-semibold mb-1">Important</div>
              <div>By submitting this quote, you're committing to the specified exchange rate. Make sure your token account has sufficient funds before the RFQ creator selects your quote.</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-white/10 border-white/30 text-white/90 hover:bg-white/[0.15] hover:border-white/40 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            >
              Submit Quote
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}