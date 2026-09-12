// Back / Next / Submit row under the wizard. Create and update inherited
// different footer layouts from the original modals (outline vs ghost Back,
// Sparkles vs Check on submit), so the row branches on `mode`.

import { Button } from "@/app/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import type { FormStep, RFQFormMode } from "./types";

interface WizardFooterProps {
  mode: RFQFormMode;
  currentStep: FormStep;
  submitting: boolean;
  submitDisabled: boolean;
  submitLabel: string;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function WizardFooter({
  mode,
  currentStep,
  submitting,
  submitDisabled,
  submitLabel,
  onBack,
  onNext,
  onSubmit,
}: WizardFooterProps) {
  if (mode === "create") {
    return (
      <div className="flex gap-3 pt-4 border-t border-white/10">
        {currentStep !== "tokens" && (
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 bg-white/5 border-white/20 text-white/90 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        {currentStep !== "review" ? (
          <Button
            onClick={onNext}
            className="flex-1 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:from-purple-600 hover:via-purple-700 hover:to-purple-800 text-white"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
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
    );
  }

  return (
    <div className="flex items-center justify-between pt-4 border-t border-white/10">
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={currentStep === "tokens"}
        className="text-white/60 hover:text-white hover:bg-white/5"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {currentStep !== "review" ? (
        <Button
          onClick={onNext}
          className="bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800"
        >
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      ) : (
        <Button
          onClick={onSubmit}
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
  );
}
