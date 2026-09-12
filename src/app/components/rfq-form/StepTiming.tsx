// Step 3 — the four phase TTLs (preset row + custom input each) and the total
// time callout. Update mode also hosts the Advanced Options disclosure here.

import type { ReactNode } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { formatTime } from "@/app/lib/rfq-form-validation";
import { Clock } from "lucide-react";
import { motion } from "motion/react";
import type { StepProps, TtlField as TtlFieldKey } from "./types";

const TIME_PRESETS = [
  { label: "5 min", seconds: 300 },
  { label: "15 min", seconds: 900 },
  { label: "30 min", seconds: 1800 },
  { label: "1 hour", seconds: 3600 },
  { label: "2 hours", seconds: 7200 },
  { label: "Custom", seconds: 0 },
];

interface TtlFieldProps extends Omit<StepProps, "mode"> {
  label: string;
  field: TtlFieldKey;
  placeholder: string;
}

/** TTL preset row + custom input, shared verbatim between the four phases. */
function TtlField({ label, field, placeholder, values, set, isLocked }: TtlFieldProps) {
  return (
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
}

interface StepTimingProps extends StepProps {
  /** The Advanced Options disclosure — rendered here only in update mode. */
  advancedOptions: ReactNode;
}

export function StepTiming({ mode, values, set, isLocked, advancedOptions }: StepTimingProps) {
  const { commitTtlSecs, revealTtlSecs, selectionTtlSecs, fundTtlSecs } = values;
  const fieldProps = { values, set, isLocked };

  return (
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
        <TtlField
          label="Commit Phase Duration"
          field="commitTtlSecs"
          placeholder="3600"
          {...fieldProps}
        />

        {/* Reveal Phase */}
        <TtlField
          label="Reveal Phase Duration"
          field="revealTtlSecs"
          placeholder="1800"
          {...fieldProps}
        />

        {/* Selection Phase */}
        <TtlField
          label="Selection Phase Duration"
          field="selectionTtlSecs"
          placeholder="1800"
          {...fieldProps}
        />

        {/* Fund Phase */}
        <TtlField
          label="Funding Phase Duration"
          field="fundTtlSecs"
          placeholder="3600"
          {...fieldProps}
        />

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
        {mode === "update" && advancedOptions}
      </div>
    </motion.div>
  );
}
