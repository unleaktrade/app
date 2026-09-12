// Step 1 — trading pair + amounts. Copy is byte-identical to the pre-split
// wizard; only the implied-price line differs between create and update.

import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Separator } from "@/app/components/ui/separator";
import { TokenSelector } from "@/app/components/TokenSelector";
import { calculateImpliedPrice } from "@/app/lib/rfq-form-validation";
import { ArrowDown, Coins } from "lucide-react";
import { motion } from "motion/react";
import type { StepProps } from "./types";

export function StepTokens({ mode, values, set, isLocked }: StepProps) {
  const { baseToken, quoteToken, baseAmount, minQuoteAmount } = values;
  const impliedPrice = calculateImpliedPrice(baseAmount, minQuoteAmount);

  return (
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

        {impliedPrice && baseToken && quoteToken && (
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
                    1 {baseToken.symbol} ≥ {impliedPrice} {quoteToken.symbol}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm text-white/60">Implied Min. Price:</span>
                  <span className="text-purple-400 font-mono font-semibold">
                    {impliedPrice} {quoteToken.symbol}/{baseToken.symbol}
                  </span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
