import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { ArrowLeft, Info } from "lucide-react";
import { toast } from "sonner";

interface CreateRFQProps {
  onBack: () => void;
}

const tokens = ["wSOL", "USDC", "BONK", "JUP", "PYTH", "ORCA", "WIF", "RAY"];

export function CreateRFQ({ onBack }: CreateRFQProps) {
  const [baseMint, setBaseMint] = useState("");
  const [quoteMint, setQuoteMint] = useState("");
  const [baseAmount, setBaseAmount] = useState("");
  const [minQuoteAmount, setMinQuoteAmount] = useState("");
  const [makerBond, setMakerBond] = useState("5000");
  const [takerBond, setTakerBond] = useState("5000");
  const [commitTtl, setCommitTtl] = useState("1800");
  const [revealTtl, setRevealTtl] = useState("900");
  const [selectionTtl, setSelectionTtl] = useState("600");
  const [fundTtl, setFundTtl] = useState("1800");

  const handleCreate = () => {
    if (!baseMint || !quoteMint || !baseAmount || !minQuoteAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    toast.success("RFQ created successfully!", {
      description: "Your RFQ has been published and is now open for quotes.",
    });

    setTimeout(() => {
      onBack();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
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

          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            Create New RFQ
          </h1>
          <p className="text-white/60">
            Set up your OTC request and receive competitive quotes from qualified takers
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 sm:p-8 space-y-6"
        >
          {/* Asset Pair */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Asset Pair</h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseMint" className="text-white/80">
                  Base Token <span className="text-red-400">*</span>
                </Label>
                <Select value={baseMint} onValueChange={setBaseMint}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map((token) => (
                      <SelectItem key={token} value={token}>
                        {token}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quoteMint" className="text-white/80">
                  Quote Token <span className="text-red-400">*</span>
                </Label>
                <Select value={quoteMint} onValueChange={setQuoteMint}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map((token) => (
                      <SelectItem key={token} value={token}>
                        {token}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseAmount" className="text-white/80">
                  Base Amount <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="baseAmount"
                  type="number"
                  placeholder="0.00"
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minQuoteAmount" className="text-white/80">
                  Min Quote Amount <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="minQuoteAmount"
                  type="number"
                  placeholder="0.00"
                  value={minQuoteAmount}
                  onChange={(e) => setMinQuoteAmount(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>
          </div>

          {/* Bonds */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">Bonds (USDC)</h3>
              <div className="group relative">
                <Info className="h-4 w-4 text-white/40 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-black/90 border border-white/20 rounded-lg text-xs text-white/80">
                  Bonds are locked collateral that ensures commitment from both parties
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="makerBond" className="text-white/80">Maker Bond</Label>
                <Input
                  id="makerBond"
                  type="number"
                  value={makerBond}
                  onChange={(e) => setMakerBond(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="takerBond" className="text-white/80">Taker Bond</Label>
                <Input
                  id="takerBond"
                  type="number"
                  value={takerBond}
                  onChange={(e) => setTakerBond(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
          </div>

          {/* Time Limits */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">Time Limits (seconds)</h3>
              <div className="group relative">
                <Info className="h-4 w-4 text-white/40 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-black/90 border border-white/20 rounded-lg text-xs text-white/80">
                  Deadlines for each phase of the RFQ lifecycle
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commitTtl" className="text-white/80">Commit TTL</Label>
                <Input
                  id="commitTtl"
                  type="number"
                  value={commitTtl}
                  onChange={(e) => setCommitTtl(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="revealTtl" className="text-white/80">Reveal TTL</Label>
                <Input
                  id="revealTtl"
                  type="number"
                  value={revealTtl}
                  onChange={(e) => setRevealTtl(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="selectionTtl" className="text-white/80">Selection TTL</Label>
                <Input
                  id="selectionTtl"
                  type="number"
                  value={selectionTtl}
                  onChange={(e) => setSelectionTtl(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fundTtl" className="text-white/80">Fund TTL</Label>
                <Input
                  id="fundTtl"
                  type="number"
                  value={fundTtl}
                  onChange={(e) => setFundTtl(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}