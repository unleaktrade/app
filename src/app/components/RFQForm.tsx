// Shared 4-step RFQ wizard (tokens → economics → timing → review) extracted
// from CreateRFQModal / UpdateRFQModal. This file owns the step machine, the
// field state and the per-step validation toasts; the step layouts live in
// ./rfq-form/Step*.tsx, the footer in ./rfq-form/WizardFooter.tsx and the pure
// validators in src/app/lib/rfq-form-validation.ts. The two modals stay thin
// wrappers that supply initial values and map the submitted values onto their
// respective tx builders. Copy is kept byte-identical to the pre-extraction
// modals — where Create and Update legitimately differ (step subtitles,
// economics/review layouts, footer), the `mode` prop branches.

import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { AnimatePresence } from "motion/react";
import {
  validateEconomicsStep,
  validateTimingStep,
  validateTokensStep,
} from "@/app/lib/rfq-form-validation";
import { AdvancedOptions } from "./rfq-form/AdvancedOptions";
import { StepEconomics } from "./rfq-form/StepEconomics";
import { StepReview } from "./rfq-form/StepReview";
import { StepTiming } from "./rfq-form/StepTiming";
import { StepTokens } from "./rfq-form/StepTokens";
import { WizardFooter } from "./rfq-form/WizardFooter";
import type { FormStep, RFQFormMode, RFQFormValues } from "./rfq-form/types";

export type { RFQFormValues } from "./rfq-form/types";

interface RFQFormProps {
  mode: RFQFormMode;
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

const STEPS: FormStep[] = ["tokens", "economics", "timing", "review"];

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

/** Per-step validator; returns the toast message for the first failing rule. */
const STEP_VALIDATORS: Partial<Record<FormStep, (values: RFQFormValues) => string | null>> = {
  tokens: validateTokensStep,
  economics: validateEconomicsStep,
  timing: validateTimingStep,
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

  const set = <K extends keyof RFQFormValues>(key: K, value: RFQFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const isLocked = (field: keyof RFQFormValues) => lockedFields?.includes(field) ?? false;

  const handleNext = () => {
    const error = STEP_VALIDATORS[currentStep]?.(values) ?? null;
    if (error) {
      toast.error(error);
      return;
    }

    const currentIndex = STEPS.indexOf(currentStep);
    const next = STEPS[currentIndex + 1];
    if (next) setCurrentStep(next);
  };

  const handleBack = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    const prev = STEPS[currentIndex - 1];
    if (prev) setCurrentStep(prev);
  };

  const stepProps = { mode, values, set, isLocked };

  /** Advanced Options (facilitator) section — on the timing step in update
   * mode, on the review step in create mode (matching the original modals). */
  const advancedOptions = (
    <AdvancedOptions
      open={showAdvanced}
      onToggle={() => setShowAdvanced(!showAdvanced)}
      facilitatorAddress={values.facilitatorAddress}
      onChange={(value) => set("facilitatorAddress", value)}
      disabled={isLocked("facilitatorAddress")}
    />
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
          {currentStep === "tokens" && <StepTokens key="tokens" {...stepProps} />}

          {/* Step 2: Economics */}
          {currentStep === "economics" && <StepEconomics key="economics" {...stepProps} />}

          {/* Step 3: Timing */}
          {currentStep === "timing" && (
            <StepTiming key="timing" {...stepProps} advancedOptions={advancedOptions} />
          )}

          {/* Step 4: Review */}
          {currentStep === "review" && (
            <StepReview
              key="review"
              mode={mode}
              values={values}
              advancedOptions={advancedOptions}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <WizardFooter
        mode={mode}
        currentStep={currentStep}
        submitting={submitting}
        submitDisabled={submitDisabled}
        submitLabel={submitLabel}
        onBack={handleBack}
        onNext={handleNext}
        onSubmit={() => void onSubmit(values)}
      />
    </>
  );
}
