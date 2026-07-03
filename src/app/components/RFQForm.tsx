// Shared 4-step RFQ wizard (tokens → economics → timing → review) extracted
// from CreateRFQModal / UpdateRFQModal. The form owns the step machine, the
// field state, the per-step validation toasts and the review screen; the two
// modals stay thin wrappers that supply initial values and map the submitted
// values onto their respective tx builders. Copy is kept byte-identical to the
// pre-extraction modals — where Create and Update legitimately differ (step
// subtitles, economics/review layouts, footer), the `mode` prop branches.

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Separator } from "@/app/components/ui/separator";
import { TokenSelector, type Token } from "@/app/components/TokenSelector";
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
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface RFQFormValues {
  baseToken: Token | null;
  quoteToken: Token | null;
  baseAmount: string;
  minQuoteAmount: string;
  bondAmount: string;
  takerFeeBps: string;
  commitTtlSecs: string;
  revealTtlSecs: string;
  selectionTtlSecs: string;
  fundTtlSecs: string;
  facilitatorAddress: string;
}

interface RFQFormProps {
  mode: "create" | "update";
  /** Seed values. Update mode passes the decoded on-chain account, mapped by
   * the modal; the form reads these once at mount — remount (key) to re-seed. */
  initialValues?: Partial<RFQFormValues>;
  submitting: boolean;
  /** "Create RFQ" / "Update RFQ" */
  submitLabel: string;
  onSubmit: (values: RFQFormValues) => void | Promise<void>;
  /** Fields that must render read-only (e.g. args the on-chain instruction
   * cannot change). Every update_rfq arg is currently optional-updatable, so
   * this is empty today — the mechanism exists for future program changes. */
  lockedFields?: (keyof RFQFormValues)[];
  /** Extra disable condition for the submit CTA (e.g. update on a non-draft). */
  submitDisabled?: boolean;
  /** Rendered above the wizard steps (e.g. the non-editable state warning). */
  notice?: ReactNode;
}

type FormStep = "tokens" | "economics" | "timing" | "review";

const STEPS: FormStep[] = ["tokens", "economics", "timing", "review"];

const TIME_PRESETS = [
  { label: "5 min", seconds: 300 },
  { label: "15 min", seconds: 900 },
  { label: "30 min", seconds: 1800 },
  { label: "1 hour", seconds: 3600 },
  { label: "2 hours", seconds: 7200 },
  { label: "Custom", seconds: 0 },
];

const CREATE_DEFAULTS: RFQFormValues = {
  baseToken: null,
  quoteToken: null,
  baseAmount: "",
  minQuoteAmount: "",
  bondAmount: "5000",
  takerFeeBps: "50",
  commitTtlSecs: "3600",
  revealTtlSecs: "1800",
  selectionTtlSecs: "1800",
  fundTtlSecs: "3600",
  facilitatorAddress: "",
};

const UPDATE_DEFAULTS: RFQFormValues = {
  baseToken: null,
  quoteToken: null,
  baseAmount: "",
  minQuoteAmount: "",
  bondAmount: "",
  takerFeeBps: "",
  commitTtlSecs: "",
  revealTtlSecs: "",
  selectionTtlSecs: "",
  fundTtlSecs: "",
  facilitatorAddress: "",
};

export function RFQForm({
  mode,
  initialValues,
  submitting,
  submitLabel,
  onSubmit,
  lockedFields,
  submitDisabled = false,
  notice,
}: RFQFormProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>("tokens");
  const [values, setValues] = useState<RFQFormValues>(() => ({
    ...(mode === "create" ? CREATE_DEFAULTS : UPDATE_DEFAULTS),
    ...initialValues,
  }));
  const [showAdvanced, setShowAdvanced] = useState(
    () => (initialValues?.facilitatorAddress ?? "") !== "",
  );

  const {
    baseToken,
    quoteToken,
    baseAmount,
    minQuoteAmount,
    bondAmount,
    takerFeeBps,
    commitTtlSecs,
    revealTtlSecs,
    selectionTtlSecs,
    fundTtlSecs,
    facilitatorAddress,
  } = values;

  const set = <K extends keyof RFQFormValues>(key: K, value: RFQFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const isLocked = (field: keyof RFQFormValues) => lockedFields?.includes(field) ?? false;

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
    const bps = Number(takerFeeBps);
    if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
      toast.error("Protocol fee must be between 0 and 10000 bps");
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
    if (currentStep === "tokens" && !validateTokensStep()) return;
    if (currentStep === "economics" && !validateEconomicsStep()) return;
    if (currentStep === "timing" && !validateTimingStep()) return;

    const currentIndex = STEPS.indexOf(currentStep);
    const next = STEPS[currentIndex + 1];
    if (next) setCurrentStep(next);
  };

  const handleBack = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    const prev = STEPS[currentIndex - 1];
    if (prev) setCurrentStep(prev);
  };

  const calculateImpliedPrice = () => {
    if (!baseAmount || !minQuoteAmount || parseFloat(baseAmount) === 0) return null;
    return (parseFloat(minQuoteAmount) / parseFloat(baseAmount)).toFixed(6);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  /** TTL preset row + custom input, shared verbatim between the four phases. */
  const ttlField = (
    label: string,
    field: "commitTtlSecs" | "revealTtlSecs" | "selectionTtlSecs" | "fundTtlSecs",
    placeholder: string,
  ) => (
    <div className="space-y-3">
      <Label className="text-white/90">{label}</Label>
      <div className="flex gap-2">
        {TIME_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            size="sm"
            variant="outline"
            disabled={isLocked(field)}
            onClick={() => preset.seconds > 0 && set(field, preset.seconds.toString())}
            className={`flex-1 ${
              parseInt(values[field]) === preset.seconds && preset.seconds > 0
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
        value={values[field]}
        onChange={(e) => set(field, e.target.value)}
        disabled={isLocked(field)}
        className="bg-white/5 border-white/10 text-white"
        placeholder={placeholder}
      />
    </div>
  );

  /** Advanced Options (facilitator) section — on the timing step in update
   * mode, on the review step in create mode (matching the original modals). */
  const advancedSection = (
    <div className="border-t border-white/10 pt-4">
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center justify-between w-full text-sm text-white/70 hover:text-white transition-colors"
      >
        <span>Advanced Options</span>
        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {showAdvanced && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="mt-4 space-y-3"
        >
          <Label htmlFor="facilitator" className="text-white/90">
            Reward Recipient (Optional)
          </Label>
          <Input
            id="facilitator"
            placeholder="Wallet address that earns the fee share..."
            value={facilitatorAddress}
            onChange={(e) => set("facilitatorAddress", e.target.value)}
            disabled={isLocked("facilitatorAddress")}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-sm"
          />
          <p className="text-xs text-white/50">
            Optional intermediary who receives a fee share from settlement
          </p>
        </motion.div>
      )}
    </div>
  );

  return (
    <>
      {/* Progress Steps */}
      <div className="flex items-center gap-2 mt-4">
        {STEPS.map((step, index) => {
          const currentIndex = STEPS.indexOf(currentStep);
          const isActive = step === currentStep;
          const isCompleted = currentIndex > index;

          return (
            <div key={step} className="flex items-center flex-1">
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
                  <span className="text-sm">{index + 1}</span>
                )}
              </div>
              {index < 3 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-all ${
                    isCompleted ? "bg-purple-500" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex-1 pr-2">
        {notice}
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
                  <span>Configure your trading pair and amounts</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/90">
                    Base Token <span className="text-red-400">*</span>
                  </Label>
                  <div className={isLocked("baseToken") ? "pointer-events-none opacity-60" : ""}>
                    <TokenSelector
                      value={baseToken}
                      onChange={(t) => set("baseToken", t)}
                      label="Select base token"
                      excludeToken={quoteToken}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseAmount" className="text-white/90">
                    Base Amount <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="baseAmount"
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={baseAmount}
                      onChange={(e) => set("baseAmount", e.target.value)}
                      disabled={isLocked("baseAmount")}
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
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-raised px-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center border border-white/10">
                      <ArrowDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/90">
                    Quote Token <span className="text-red-400">*</span>
                  </Label>
                  <div className={isLocked("quoteToken") ? "pointer-events-none opacity-60" : ""}>
                    <TokenSelector
                      value={quoteToken}
                      onChange={(t) => set("quoteToken", t)}
                      label="Select quote token"
                      excludeToken={baseToken}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minQuoteAmount" className="text-white/90">
                    Minimum Quote Amount <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="minQuoteAmount"
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={minQuoteAmount}
                      onChange={(e) => set("minQuoteAmount", e.target.value)}
                      disabled={isLocked("minQuoteAmount")}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-16"
                    />
                    {quoteToken && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/50 font-semibold">
                        {quoteToken.symbol}
                      </span>
                    )}
                  </div>
                </div>

                {calculateImpliedPrice() && baseToken && quoteToken && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20"
                  >
                    <div className="flex items-center justify-between">
                      {mode === "create" ? (
                        <>
                          <span className="text-sm text-white/60">Implied Minimum Price</span>
                          <span className="font-semibold">
                            1 {baseToken.symbol} ≥ {calculateImpliedPrice()} {quoteToken.symbol}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-white/60">Implied Min. Price:</span>
                          <span className="text-purple-400 font-mono font-semibold">
                            {calculateImpliedPrice()} {quoteToken.symbol}/{baseToken.symbol}
                          </span>
                        </>
                      )}
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
                  <span>
                    {mode === "create"
                      ? "Set bond and fee requirements"
                      : "Set bonds and fees for the trade"}
                  </span>
                </div>
              </div>

              {mode === "create" ? (
                <div className="space-y-6">
                  <div className="space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30 shrink-0">
                        <Shield className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="bondAmount" className="text-white/90 text-base">
                          Bond Amount (USDC) <span className="text-red-400">*</span>
                        </Label>
                        <p className="text-sm text-white/50 mt-1 mb-3">
                          Collateral that both parties must lock to commit (skin in the game)
                        </p>
                        <Input
                          id="bondAmount"
                          type="number"
                          step="any"
                          placeholder="5000"
                          value={bondAmount}
                          onChange={(e) => set("bondAmount", e.target.value)}
                          disabled={isLocked("bondAmount")}
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
                        <Label htmlFor="takerFee" className="text-white/90 text-base">
                          Protocol Fee (bps) <span className="text-red-400">*</span>
                        </Label>
                        <p className="text-sm text-white/50 mt-1 mb-3">
                          Basis points (max 10000) applied to the settled quote amount and paid on
                          top by the counterparty. 50 bps = 0.50%.
                        </p>
                        <Input
                          id="takerFee"
                          type="number"
                          step="1"
                          min="0"
                          max="10000"
                          placeholder="50"
                          value={takerFeeBps}
                          onChange={(e) => set("takerFeeBps", e.target.value)}
                          disabled={isLocked("takerFeeBps")}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                      <div className="text-sm text-white/70">
                        <p className="font-semibold mb-1">How Bonds & Fees Work</p>
                        <p className="mb-2">
                          <strong>Bonds:</strong> Both parties lock the same bond amount to ensure
                          commitment. If the trade completes successfully, bonds are returned. If
                          either party misbehaves or fails to fulfill their obligations, their bond
                          is sent to the protocol treasury as a penalty.
                        </p>
                        <p>
                          <strong>Fees:</strong> Only the quoting side pays the fee upon successful
                          settlement. If a reward recipient is specified, the fee is shared between
                          the protocol and that address.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm text-white/80 font-medium">
                          Bonds Apply to Both Parties
                        </p>
                        <p className="text-xs text-white/50">
                          Both parties must post bonds to ensure commitment. Bonds are returned upon
                          successful completion or slashed if a party fails to fulfill their
                          obligations.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bondAmount" className="text-white/90">
                        Bond Amount <span className="text-red-400">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="bondAmount"
                          type="number"
                          step="any"
                          placeholder="5000"
                          value={bondAmount}
                          onChange={(e) => set("bondAmount", e.target.value)}
                          disabled={isLocked("bondAmount")}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-16"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/50 font-semibold">
                          USDC
                        </span>
                      </div>
                      <p className="text-xs text-white/40">Required from both parties</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="takerFee" className="text-white/90">
                        Protocol Fee (bps) <span className="text-red-400">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="takerFee"
                          type="number"
                          step="1"
                          min="0"
                          max="10000"
                          placeholder="50"
                          value={takerFeeBps}
                          onChange={(e) => set("takerFeeBps", e.target.value)}
                          disabled={isLocked("takerFeeBps")}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-16"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/50 font-semibold">
                          bps
                        </span>
                      </div>
                      <p className="text-xs text-white/40">
                        Basis points (max 10000) on the settled quote amount. 0 = no fee.
                      </p>
                    </div>
                  </div>
                </>
              )}
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
                  <span>Configure phase durations (in seconds)</span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Commit Phase */}
                {ttlField("Commit Phase Duration", "commitTtlSecs", "3600")}

                {/* Reveal Phase */}
                {ttlField("Reveal Phase Duration", "revealTtlSecs", "1800")}

                {/* Selection Phase */}
                {ttlField("Selection Phase Duration", "selectionTtlSecs", "1800")}

                {/* Fund Phase */}
                {ttlField("Funding Phase Duration", "fundTtlSecs", "3600")}

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
                      <p>This is the maximum time from opening your RFQ to final settlement.</p>
                    </div>
                  </div>
                </div>

                {/* Advanced (update mode keeps it on the timing step) */}
                {mode === "update" && advancedSection}
              </div>
            </motion.div>
          )}

          {/* Step 4: Review */}
          {currentStep === "review" &&
            (mode === "create" ? (
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
                    <span>Review your RFQ before publishing</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Trading Pair */}
                  <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-white/10">
                    <div className="text-sm text-white/60 mb-3">Trading Pair</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-purple-600/30 flex items-center justify-center border border-purple-500/50">
                          <span className="font-bold text-lg">{baseToken?.symbol[0]}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{baseToken?.symbol}</div>
                          <div className="text-sm text-white/50">{baseAmount}</div>
                        </div>
                      </div>

                      <ArrowRight className="h-6 w-6 text-white/40" />

                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-semibold text-lg text-right">
                            {quoteToken?.symbol}
                          </div>
                          <div className="text-sm text-white/50 text-right">≥ {minQuoteAmount}</div>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-600/30 flex items-center justify-center border border-cyan-500/50">
                          <span className="font-bold text-lg">{quoteToken?.symbol[0]}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Economics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-sm text-white/60 mb-2">Bond (Both Parties)</div>
                      <div className="text-xl font-semibold">{bondAmount} USDC</div>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-sm text-white/60 mb-2">Protocol Fee</div>
                      <div className="text-xl font-semibold">
                        {takerFeeBps} bps ({(Number(takerFeeBps) / 100).toFixed(2)}%)
                      </div>
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                    <div className="text-sm text-white/60">Phase Durations</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Commit:</span>
                        <span className="font-semibold">{formatTime(parseInt(commitTtlSecs))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Reveal:</span>
                        <span className="font-semibold">{formatTime(parseInt(revealTtlSecs))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Selection:</span>
                        <span className="font-semibold">
                          {formatTime(parseInt(selectionTtlSecs))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Funding:</span>
                        <span className="font-semibold">{formatTime(parseInt(fundTtlSecs))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Advanced */}
                  {advancedSection}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 py-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Check className="h-4 w-4" />
                    <span>Review your updates before submitting</span>
                  </div>
                </div>

                {/* Token Pair Summary */}
                <div className="p-6 rounded-lg bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-purple-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-white/50 uppercase tracking-wider">Token Pair</div>
                    <div className="flex items-center gap-2 text-lg font-bold">
                      <span>{baseToken?.symbol}</span>
                      <ArrowRight className="h-5 w-5 text-purple-400" />
                      <span>{quoteToken?.symbol}</span>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/50">Base Amount:</span>
                      <span className="font-semibold">
                        {parseFloat(baseAmount).toLocaleString()} {baseToken?.symbol}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/50">Min Quote Amount:</span>
                      <span className="font-semibold">
                        {parseFloat(minQuoteAmount).toLocaleString()} {quoteToken?.symbol}
                      </span>
                    </div>
                    {calculateImpliedPrice() && (
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-white/10">
                        <span className="text-white/50">Implied Min. Price:</span>
                        <span className="text-purple-400 font-mono font-bold">
                          {calculateImpliedPrice()} {quoteToken?.symbol}/{baseToken?.symbol}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Economics Summary */}
                <div className="p-6 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-sm text-white/50 uppercase tracking-wider mb-4">
                    Economics
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/50">Bond (Both Parties):</span>
                      <span className="font-semibold">
                        {parseFloat(bondAmount).toLocaleString()} USDC
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/50">Protocol Fee:</span>
                      <span className="font-semibold">
                        {takerFeeBps} bps ({(Number(takerFeeBps) / 100).toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timing Summary */}
                <div className="p-6 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-sm text-white/50 uppercase tracking-wider mb-4">
                    Phase Timeouts
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-white/40 mb-1">Commit</div>
                      <div className="font-semibold">{formatTime(parseInt(commitTtlSecs))}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/40 mb-1">Reveal</div>
                      <div className="font-semibold">{formatTime(parseInt(revealTtlSecs))}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/40 mb-1">Selection</div>
                      <div className="font-semibold">{formatTime(parseInt(selectionTtlSecs))}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/40 mb-1">Funding</div>
                      <div className="font-semibold">{formatTime(parseInt(fundTtlSecs))}</div>
                    </div>
                  </div>
                </div>

                {/* Facilitator if set */}
                {facilitatorAddress && (
                  <div className="p-6 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-sm text-white/50 uppercase tracking-wider mb-2">
                      Reward recipient
                    </div>
                    <div className="font-mono text-sm text-white/70 break-all">
                      {facilitatorAddress}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      {mode === "create" ? (
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
              onClick={() => void onSubmit(values)}
              disabled={submitting || submitDisabled}
              className="flex-1 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:from-purple-600 hover:via-purple-700 hover:to-purple-800 text-white disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {submitLabel}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === "tokens"}
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep !== "review" ? (
            <Button
              onClick={handleNext}
              className="bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => void onSubmit(values)}
              disabled={submitting || submitDisabled}
              className="bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {submitLabel}
            </Button>
          )}
        </div>
      )}
    </>
  );
}
