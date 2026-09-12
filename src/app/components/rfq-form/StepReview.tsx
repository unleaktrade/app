// Step 4 — read-only summary before submit. One component for both modes: the
// section order (pair → economics → timing → recipient) and the phase list
// are shared; each section switches only the markup that differed between the
// original create and update review screens. Every string and class name is
// byte-identical to the pre-split wizard.

import type { ReactNode } from "react";
import { formatTime, calculateImpliedPrice } from "@/app/lib/rfq-form-validation";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import type { RFQFormMode, RFQFormValues, TtlField } from "./types";

const PHASES: { label: string; field: TtlField }[] = [
  { label: "Commit", field: "commitTtlSecs" },
  { label: "Reveal", field: "revealTtlSecs" },
  { label: "Selection", field: "selectionTtlSecs" },
  { label: "Funding", field: "fundTtlSecs" },
];

interface SectionProps {
  mode: RFQFormMode;
  values: RFQFormValues;
}

function PairSummary({ mode, values }: SectionProps) {
  const { baseToken, quoteToken, baseAmount, minQuoteAmount } = values;

  if (mode === "create") {
    return (
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
              <div className="font-semibold text-lg text-right">{quoteToken?.symbol}</div>
              <div className="text-sm text-white/50 text-right">≥ {minQuoteAmount}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-600/30 flex items-center justify-center border border-cyan-500/50">
              <span className="font-bold text-lg">{quoteToken?.symbol[0]}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const impliedPrice = calculateImpliedPrice(baseAmount, minQuoteAmount);
  return (
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
        {impliedPrice && (
          <div className="flex items-center justify-between text-sm pt-2 border-t border-white/10">
            <span className="text-white/50">Implied Min. Price:</span>
            <span className="text-purple-400 font-mono font-bold">
              {impliedPrice} {quoteToken?.symbol}/{baseToken?.symbol}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function EconomicsSummary({ mode, values }: SectionProps) {
  const { bondAmount, takerFeeBps } = values;
  const feePct = (Number(takerFeeBps) / 100).toFixed(2);

  if (mode === "create") {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="text-sm text-white/60 mb-2">Bond (Both Parties)</div>
          <div className="text-xl font-semibold">{bondAmount} USDC</div>
        </div>
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="text-sm text-white/60 mb-2">Protocol Fee</div>
          <div className="text-xl font-semibold">
            {takerFeeBps} bps ({feePct}%)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-lg bg-white/5 border border-white/10">
      <div className="text-sm text-white/50 uppercase tracking-wider mb-4">Economics</div>
      <div className="grid gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">Bond (Both Parties):</span>
          <span className="font-semibold">{parseFloat(bondAmount).toLocaleString()} USDC</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">Protocol Fee:</span>
          <span className="font-semibold">
            {takerFeeBps} bps ({feePct}%)
          </span>
        </div>
      </div>
    </div>
  );
}

function TimingSummary({ mode, values }: SectionProps) {
  if (mode === "create") {
    return (
      <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
        <div className="text-sm text-white/60">Phase Durations</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {PHASES.map(({ label, field }) => (
            <div key={field} className="flex justify-between">
              <span className="text-white/60">{`${label}:`}</span>
              <span className="font-semibold">{formatTime(parseInt(values[field]))}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-lg bg-white/5 border border-white/10">
      <div className="text-sm text-white/50 uppercase tracking-wider mb-4">Phase Timeouts</div>
      <div className="grid grid-cols-2 gap-4">
        {PHASES.map(({ label, field }) => (
          <div key={field}>
            <div className="text-xs text-white/40 mb-1">{label}</div>
            <div className="font-semibold">{formatTime(parseInt(values[field]))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface StepReviewProps extends SectionProps {
  /** The Advanced Options disclosure — rendered here only in create mode. */
  advancedOptions: ReactNode;
}

export function StepReview({ mode, values, advancedOptions }: StepReviewProps) {
  const sections = (
    <>
      <PairSummary mode={mode} values={values} />
      <EconomicsSummary mode={mode} values={values} />
      <TimingSummary mode={mode} values={values} />
      {mode === "create"
        ? advancedOptions
        : values.facilitatorAddress && (
            <div className="p-6 rounded-lg bg-white/5 border border-white/10">
              <div className="text-sm text-white/50 uppercase tracking-wider mb-2">
                Reward recipient
              </div>
              <div className="font-mono text-sm text-white/70 break-all">
                {values.facilitatorAddress}
              </div>
            </div>
          )}
    </>
  );

  return (
    <motion.div
      key="review"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 py-4"
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-white/60">
          {mode === "create" ? <Sparkles className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          <span>
            {mode === "create"
              ? "Review your RFQ before publishing"
              : "Review your updates before submitting"}
          </span>
        </div>
      </div>

      {mode === "create" ? <div className="space-y-4">{sections}</div> : sections}
    </motion.div>
  );
}
