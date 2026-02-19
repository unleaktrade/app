import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Separator } from "@/app/components/ui/separator";
import {
  TokenSelector,
  Token,
} from "@/app/components/TokenSelector";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  Check,
  Clock,
  Shield,
  Coins,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CreateRFQModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormStep = "tokens" | "economics" | "timing" | "review";

const TIME_PRESETS = [
  { label: "5 min", seconds: 300 },
  { label: "15 min", seconds: 900 },
  { label: "30 min", seconds: 1800 },
  { label: "1 hour", seconds: 3600 },
  { label: "2 hours", seconds: 7200 },
  { label: "Custom", seconds: 0 },
];

export function CreateRFQModal({
  open,
  onOpenChange,
}: CreateRFQModalProps) {
  const [currentStep, setCurrentStep] =
    useState<FormStep>("tokens");

  // Form state matching Solana instruction parameters
  const [baseToken, setBaseToken] = useState<Token | null>(
    null,
  );
  const [quoteToken, setQuoteToken] = useState<Token | null>(
    null,
  );
  const [baseAmount, setBaseAmount] = useState("");
  const [minQuoteAmount, setMinQuoteAmount] = useState("");

  const [bondAmount, setBondAmount] = useState("5000");
  const [takerFeeUsdc, setTakerFeeUsdc] = useState("100");

  const [commitTtlSecs, setCommitTtlSecs] = useState("3600");
  const [revealTtlSecs, setRevealTtlSecs] = useState("1800");
  const [selectionTtlSecs, setSelectionTtlSecs] =
    useState("1800");
  const [fundTtlSecs, setFundTtlSecs] = useState("3600");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [facilitatorAddress, setFacilitatorAddress] =
    useState("");

  const resetForm = () => {
    setCurrentStep("tokens");
    setBaseToken(null);
    setQuoteToken(null);
    setBaseAmount("");
    setMinQuoteAmount("");
    setBondAmount("5000");
    setTakerFeeUsdc("100");
    setCommitTtlSecs("3600");
    setRevealTtlSecs("1800");
    setSelectionTtlSecs("1800");
    setFundTtlSecs("3600");
    setFacilitatorAddress("");
    setShowAdvanced(false);
  };

  const validateTokensStep = () => {
    if (!baseToken || !quoteToken) {
      toast.error("Please select both tokens");
      return false;
    }
    if (!baseAmount || parseFloat(baseAmount) <= 0) {
      toast.error("Please enter a valid base amount");
      return false;
    }
    if (!minQuoteAmount || parseFloat(minQuoteAmount) <= 0) {
      toast.error("Please enter a valid minimum quote amount");
      return false;
    }
    return true;
  };

  const validateEconomicsStep = () => {
    if (!bondAmount || parseFloat(bondAmount) <= 0) {
      toast.error("Bond amount must be greater than 0");
      return false;
    }
    if (!takerFeeUsdc || parseFloat(takerFeeUsdc) <= 0) {
      toast.error("Taker fee must be greater than 0");
      return false;
    }
    return true;
  };

  const validateTimingStep = () => {
    if (
      parseInt(commitTtlSecs) <= 0 ||
      parseInt(revealTtlSecs) <= 0 ||
      parseInt(selectionTtlSecs) <= 0 ||
      parseInt(fundTtlSecs) <= 0
    ) {
      toast.error("All TTL values must be greater than 0");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === "tokens" && !validateTokensStep())
      return;
    if (currentStep === "economics" && !validateEconomicsStep())
      return;
    if (currentStep === "timing" && !validateTimingStep())
      return;

    const steps: FormStep[] = [
      "tokens",
      "economics",
      "timing",
      "review",
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: FormStep[] = [
      "tokens",
      "economics",
      "timing",
      "review",
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleCreate = () => {
    // Here you would call the Solana program instruction
    // For now, just show success toast
    toast.success("RFQ Created!", {
      description: `Exchanging ${baseAmount} ${baseToken?.symbol} for minimum ${minQuoteAmount} ${quoteToken?.symbol}`,
    });

    resetForm();
    onOpenChange(false);
  };

  const calculateImpliedPrice = () => {
    if (
      !baseAmount ||
      !minQuoteAmount ||
      parseFloat(baseAmount) === 0
    )
      return null;
    return (
      parseFloat(minQuoteAmount) / parseFloat(baseAmount)
    ).toFixed(6);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) resetForm();
        onOpenChange(open);
      }}
    >
      <DialogContent className="bg-[#0f0f1a] border-white/10 text-white max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            Create Request for Quote
          </DialogTitle>
          <DialogDescription className="sr-only">
            Multi-step form to create a new RFQ with token
            selection, economics configuration, timing settings,
            and final review
          </DialogDescription>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {["tokens", "economics", "timing", "review"].map(
              (step, index) => {
                const steps: FormStep[] = [
                  "tokens",
                  "economics",
                  "timing",
                  "review",
                ];
                const currentIndex = steps.indexOf(currentStep);
                const isActive = step === currentStep;
                const isCompleted = currentIndex > index;

                return (
                  <div
                    key={step}
                    className="flex items-center flex-1"
                  >
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                        isCompleted
                          ? "bg-purple-500 border-purple-500"
                          : isActive
                            ? "bg-purple-500/20 border-purple-500"
                            : "bg-white/5 border-white/20"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-sm">
                          {index + 1}
                        </span>
                      )}
                    </div>
                    {index < 3 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 transition-all ${
                          isCompleted
                            ? "bg-purple-500"
                            : "bg-white/10"
                        }`}
                      />
                    )}
                  </div>
                );
              },
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <AnimatePresence mode="wait">
            {/* Step 1: Token Selection */}
            {currentStep === "tokens" && (
              <motion.div
                key="tokens"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 py-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Coins className="h-4 w-4" />
                    <span>
                      Configure your trading pair and amounts
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white/90">
                      Base Token{" "}
                      <span className="text-red-400">*</span>
                    </Label>
                    <TokenSelector
                      value={baseToken}
                      onChange={setBaseToken}
                      label="Select base token"
                      excludeToken={quoteToken}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="baseAmount"
                      className="text-white/90"
                    >
                      Base Amount{" "}
                      <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="baseAmount"
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={baseAmount}
                        onChange={(e) =>
                          setBaseAmount(e.target.value)
                        }
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-16"
                      />
                      {baseToken && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/50 font-semibold">
                          {baseToken.symbol}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative py-4">
                    <Separator className="bg-white/10" />
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0f0f1a] px-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center border border-white/10">
                        <ArrowDown className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/90">
                      Quote Token{" "}
                      <span className="text-red-400">*</span>
                    </Label>
                    <TokenSelector
                      value={quoteToken}
                      onChange={setQuoteToken}
                      label="Select quote token"
                      excludeToken={baseToken}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="minQuoteAmount"
                      className="text-white/90"
                    >
                      Minimum Quote Amount{" "}
                      <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="minQuoteAmount"
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={minQuoteAmount}
                        onChange={(e) =>
                          setMinQuoteAmount(e.target.value)
                        }
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-16"
                      />
                      {quoteToken && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/50 font-semibold">
                          {quoteToken.symbol}
                        </span>
                      )}
                    </div>
                  </div>

                  {calculateImpliedPrice() &&
                    baseToken &&
                    quoteToken && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white/60">
                            Implied Minimum Price
                          </span>
                          <span className="font-semibold">
                            1 {baseToken.symbol} ≥{" "}
                            {calculateImpliedPrice()}{" "}
                            {quoteToken.symbol}
                          </span>
                        </div>
                      </motion.div>
                    )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Economics */}
            {currentStep === "economics" && (
              <motion.div
                key="economics"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 py-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Shield className="h-4 w-4" />
                    <span>Set bond and fee requirements</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30 shrink-0">
                        <Shield className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <Label
                          htmlFor="bondAmount"
                          className="text-white/90 text-base"
                        >
                          Bond Amount (USDC){" "}
                          <span className="text-red-400">
                            *
                          </span>
                        </Label>
                        <p className="text-sm text-white/50 mt-1 mb-3">
                          Collateral that both Maker and Taker must lock to commit (skin in the game)
                        </p>
                        <Input
                          id="bondAmount"
                          type="number"
                          step="any"
                          placeholder="5000"
                          value={bondAmount}
                          onChange={(e) =>
                            setBondAmount(e.target.value)
                          }
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 shrink-0">
                        <Coins className="h-5 w-5 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <Label
                          htmlFor="takerFee"
                          className="text-white/90 text-base"
                        >
                          Taker Fee (USDC){" "}
                          <span className="text-red-400">
                            *
                          </span>
                        </Label>
                        <p className="text-sm text-white/50 mt-1 mb-3">
                          Fee paid by the Taker upon successful settlement (can be shared with Facilitator)
                        </p>
                        <Input
                          id="takerFee"
                          type="number"
                          step="any"
                          placeholder="100"
                          value={takerFeeUsdc}
                          onChange={(e) =>
                            setTakerFeeUsdc(e.target.value)
                          }
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                      <div className="text-sm text-white/70">
                        <p className="font-semibold mb-1">
                          How Bonds & Fees Work
                        </p>
                        <p className="mb-2">
                          <strong>Bonds:</strong> Both Maker and Taker lock the same bond amount to ensure commitment. 
                          If the trade completes successfully, bonds are returned. If either party misbehaves or fails 
                          to fulfill their obligations, their bond is sent to the protocol treasury as a penalty.
                        </p>
                        <p>
                          <strong>Fees:</strong> Only the Taker pays the fee upon successful settlement. If a Facilitator 
                          is specified, the fee is shared between the protocol and the Facilitator.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Timing */}
            {currentStep === "timing" && (
              <motion.div
                key="timing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 py-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Clock className="h-4 w-4" />
                    <span>
                      Configure phase durations (in seconds)
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Commit Phase */}
                  <div className="space-y-3">
                    <Label className="text-white/90">
                      Commit Phase Duration
                    </Label>
                    <div className="flex gap-2">
                      {TIME_PRESETS.map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            preset.seconds > 0 &&
                            setCommitTtlSecs(
                              preset.seconds.toString(),
                            )
                          }
                          className={`flex-1 ${
                            parseInt(commitTtlSecs) ===
                              preset.seconds &&
                            preset.seconds > 0
                              ? "bg-purple-500/20 border-purple-500 text-purple-300"
                              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                          }`}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      value={commitTtlSecs}
                      onChange={(e) =>
                        setCommitTtlSecs(e.target.value)
                      }
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="3600"
                    />
                  </div>

                  {/* Reveal Phase */}
                  <div className="space-y-3">
                    <Label className="text-white/90">
                      Reveal Phase Duration
                    </Label>
                    <div className="flex gap-2">
                      {TIME_PRESETS.map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            preset.seconds > 0 &&
                            setRevealTtlSecs(
                              preset.seconds.toString(),
                            )
                          }
                          className={`flex-1 ${
                            parseInt(revealTtlSecs) ===
                              preset.seconds &&
                            preset.seconds > 0
                              ? "bg-purple-500/20 border-purple-500 text-purple-300"
                              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                          }`}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      value={revealTtlSecs}
                      onChange={(e) =>
                        setRevealTtlSecs(e.target.value)
                      }
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="1800"
                    />
                  </div>

                  {/* Selection Phase */}
                  <div className="space-y-3">
                    <Label className="text-white/90">
                      Selection Phase Duration
                    </Label>
                    <div className="flex gap-2">
                      {TIME_PRESETS.map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            preset.seconds > 0 &&
                            setSelectionTtlSecs(
                              preset.seconds.toString(),
                            )
                          }
                          className={`flex-1 ${
                            parseInt(selectionTtlSecs) ===
                              preset.seconds &&
                            preset.seconds > 0
                              ? "bg-purple-500/20 border-purple-500 text-purple-300"
                              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                          }`}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      value={selectionTtlSecs}
                      onChange={(e) =>
                        setSelectionTtlSecs(e.target.value)
                      }
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="1800"
                    />
                  </div>

                  {/* Fund Phase */}
                  <div className="space-y-3">
                    <Label className="text-white/90">
                      Funding Phase Duration
                    </Label>
                    <div className="flex gap-2">
                      {TIME_PRESETS.map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            preset.seconds > 0 &&
                            setFundTtlSecs(
                              preset.seconds.toString(),
                            )
                          }
                          className={`flex-1 ${
                            parseInt(fundTtlSecs) ===
                              preset.seconds &&
                            preset.seconds > 0
                              ? "bg-purple-500/20 border-purple-500 text-purple-300"
                              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                          }`}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      value={fundTtlSecs}
                      onChange={(e) =>
                        setFundTtlSecs(e.target.value)
                      }
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="3600"
                    />
                  </div>

                  <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                      <div className="text-sm text-white/70">
                        <p className="font-semibold mb-1">
                          Total Time:{" "}
                          {formatTime(
                            parseInt(commitTtlSecs) +
                              parseInt(revealTtlSecs) +
                              parseInt(selectionTtlSecs) +
                              parseInt(fundTtlSecs),
                          )}
                        </p>
                        <p>
                          This is the maximum time from opening
                          your RFQ to final settlement.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Review */}
            {currentStep === "review" && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 py-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Sparkles className="h-4 w-4" />
                    <span>
                      Review your RFQ before publishing
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Trading Pair */}
                  <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-white/10">
                    <div className="text-sm text-white/60 mb-3">
                      Trading Pair
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-purple-600/30 flex items-center justify-center border border-purple-500/50">
                          <span className="font-bold text-lg">
                            {baseToken?.symbol[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-lg">
                            {baseToken?.symbol}
                          </div>
                          <div className="text-sm text-white/50">
                            {baseAmount}
                          </div>
                        </div>
                      </div>

                      <ArrowRight className="h-6 w-6 text-white/40" />

                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-semibold text-lg text-right">
                            {quoteToken?.symbol}
                          </div>
                          <div className="text-sm text-white/50 text-right">
                            ≥ {minQuoteAmount}
                          </div>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-600/30 flex items-center justify-center border border-cyan-500/50">
                          <span className="font-bold text-lg">
                            {quoteToken?.symbol[0]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Economics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-sm text-white/60 mb-2">
                        Bond (Both Parties)
                      </div>
                      <div className="text-xl font-semibold">
                        {bondAmount} USDC
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-sm text-white/60 mb-2">
                        Taker Fee
                      </div>
                      <div className="text-xl font-semibold">
                        {takerFeeUsdc} USDC
                      </div>
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                    <div className="text-sm text-white/60">
                      Phase Durations
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">
                          Commit:
                        </span>
                        <span className="font-semibold">
                          {formatTime(parseInt(commitTtlSecs))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">
                          Reveal:
                        </span>
                        <span className="font-semibold">
                          {formatTime(parseInt(revealTtlSecs))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">
                          Selection:
                        </span>
                        <span className="font-semibold">
                          {formatTime(
                            parseInt(selectionTtlSecs),
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">
                          Funding:
                        </span>
                        <span className="font-semibold">
                          {formatTime(parseInt(fundTtlSecs))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Advanced */}
                  <div className="border-t border-white/10 pt-4">
                    <button
                      onClick={() =>
                        setShowAdvanced(!showAdvanced)
                      }
                      className="flex items-center justify-between w-full text-sm text-white/70 hover:text-white transition-colors"
                    >
                      <span>Advanced Options</span>
                      {showAdvanced ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    {showAdvanced && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="mt-4 space-y-3"
                      >
                        <Label
                          htmlFor="facilitator"
                          className="text-white/90"
                        >
                          Facilitator Address (Optional)
                        </Label>
                        <Input
                          id="facilitator"
                          placeholder="Enter facilitator wallet address..."
                          value={facilitatorAddress}
                          onChange={(e) =>
                            setFacilitatorAddress(
                              e.target.value,
                            )
                          }
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-sm"
                        />
                        <p className="text-xs text-white/50">
                          Optional intermediary who receives a
                          fee share from settlement
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          {currentStep !== "tokens" && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1 bg-white/5 border-white/20 text-white/90 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}

          {currentStep !== "review" ? (
            <Button
              onClick={handleNext}
              className="flex-1 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:from-purple-600 hover:via-purple-700 hover:to-purple-800 text-white"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              className="flex-1 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:from-purple-600 hover:via-purple-700 hover:to-purple-800 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Create RFQ
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}