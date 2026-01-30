import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { toast } from "sonner";
import { Info } from "lucide-react";

interface CreateRFQModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRFQModal({ open, onOpenChange }: CreateRFQModalProps) {
  const [baseMintAddress, setBaseMintAddress] = useState("");
  const [quoteMintAddress, setQuoteMintAddress] = useState("");
  const [amountToTrade, setAmountToTrade] = useState("");
  const [baseATA, setBaseATA] = useState("");
  const [quoteATA, setQuoteATA] = useState("");
  const [commitPhase, setCommitPhase] = useState("3600");
  const [revealPhase, setRevealPhase] = useState("1800");
  const [selectionPhase, setSelectionPhase] = useState("1800");
  const [fundPhase, setFundPhase] = useState("3600");

  const handleCreate = () => {
    if (!baseMintAddress || !quoteMintAddress || !amountToTrade) {
      toast.error("Please fill in all required fields");
      return;
    }

    toast.success("RFQ created successfully!", {
      description: "Your request for quote has been published to the marketplace.",
    });

    // Reset form
    setBaseMintAddress("");
    setQuoteMintAddress("");
    setAmountToTrade("");
    setBaseATA("");
    setQuoteATA("");
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f1a] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create Request for Quote</DialogTitle>
          <DialogDescription className="text-sm text-white/60">Submit your trading intent to receive competitive quotes from institutional counterparties</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Token Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Token Information</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseMint" className="flex items-center gap-2">
                  Base Mint Account <Info className="h-3 w-3 text-white/40" />
                </Label>
                <Input
                  id="baseMint"
                  placeholder="Enter base mint address..."
                  value={baseMintAddress}
                  onChange={(e) => setBaseMintAddress(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quoteMint" className="flex items-center gap-2">
                  Quote Mint Account <Info className="h-3 w-3 text-white/40" />
                </Label>
                <Input
                  id="quoteMint"
                  placeholder="Enter quote mint address..."
                  value={quoteMintAddress}
                  onChange={(e) => setQuoteMintAddress(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                Amount to Trade <Info className="h-3 w-3 text-white/40" />
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amountToTrade}
                onChange={(e) => setAmountToTrade(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseATA" className="flex items-center gap-2">
                  Base Token Account (ATA) <Info className="h-3 w-3 text-white/40" />
                </Label>
                <Input
                  id="baseATA"
                  placeholder="Enter base ATA address..."
                  value={baseATA}
                  onChange={(e) => setBaseATA(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quoteATA" className="flex items-center gap-2">
                  Quote Token Account (ATA) <Info className="h-3 w-3 text-white/40" />
                </Label>
                <Input
                  id="quoteATA"
                  placeholder="Enter quote ATA address..."
                  value={quoteATA}
                  onChange={(e) => setQuoteATA(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>
          </div>

          {/* Phase Duration Settings */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-lg font-semibold">Phase Duration Settings</h3>
            <p className="text-sm text-white/60">Configure the duration in seconds for each phase of the RFQ lifecycle</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commitPhase" className="flex items-center gap-2">
                  Commit Phase Duration <Info className="h-3 w-3 text-white/40" />
                </Label>
                <div className="relative">
                  <Input
                    id="commitPhase"
                    type="number"
                    value={commitPhase}
                    onChange={(e) => setCommitPhase(e.target.value)}
                    className="bg-white/5 border-white/10 text-white pr-20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/40">seconds</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="revealPhase" className="flex items-center gap-2">
                  Reveal Phase Duration <Info className="h-3 w-3 text-white/40" />
                </Label>
                <div className="relative">
                  <Input
                    id="revealPhase"
                    type="number"
                    value={revealPhase}
                    onChange={(e) => setRevealPhase(e.target.value)}
                    className="bg-white/5 border-white/10 text-white pr-20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/40">seconds</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="selectionPhase" className="flex items-center gap-2">
                  Selection Phase Duration <Info className="h-3 w-3 text-white/40" />
                </Label>
                <div className="relative">
                  <Input
                    id="selectionPhase"
                    type="number"
                    value={selectionPhase}
                    onChange={(e) => setSelectionPhase(e.target.value)}
                    className="bg-white/5 border-white/10 text-white pr-20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/40">seconds</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fundPhase" className="flex items-center gap-2">
                  Fund Phase Duration <Info className="h-3 w-3 text-white/40" />
                </Label>
                <div className="relative">
                  <Input
                    id="fundPhase"
                    type="number"
                    value={fundPhase}
                    onChange={(e) => setFundPhase(e.target.value)}
                    className="bg-white/5 border-white/10 text-white pr-20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/40">seconds</span>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-lg font-semibold">Advanced Settings</h3>

            <div className="space-y-2">
              <Label htmlFor="bondAmount" className="flex items-center gap-2">
                Bound Amount <Info className="h-3 w-3 text-white/40" />
              </Label>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/60">
                Coming soon...
                <div className="text-xs text-white/40 mt-1">This feature is currently unavailable</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              className="flex-1 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:from-purple-600 hover:via-purple-700 hover:to-purple-800 text-white"
            >
              Create RFQ
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}