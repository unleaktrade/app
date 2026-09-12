// Step 2 — bond + protocol fee. Create and update legitimately ship different
// layouts for this step (inherited from the original modals), so the body
// branches on `mode`; every string and class is byte-identical to before.

import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { AlertCircle, Coins, Shield } from "lucide-react";
import { motion } from "motion/react";
import type { StepProps } from "./types";

export function StepEconomics({ mode, values, set, isLocked }: StepProps) {
  const { bondAmount, takerFeeBps } = values;

  return (
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
                  Basis points (max 10000) applied to the settled quote amount and paid on top by
                  the counterparty. 50 bps = 0.50%.
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
                  commitment. If the trade completes successfully, bonds are returned. If either
                  party misbehaves or fails to fulfill their obligations, their bond is sent to the
                  protocol treasury as a penalty.
                </p>
                <p>
                  <strong>Fees:</strong> Only the quoting side pays the fee upon successful
                  settlement. If a reward recipient is specified, the fee is shared between the
                  protocol and that address.
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
                <p className="text-sm text-white/80 font-medium">Bonds Apply to Both Parties</p>
                <p className="text-xs text-white/50">
                  Both parties must post bonds to ensure commitment. Bonds are returned upon
                  successful completion or slashed if a party fails to fulfill their obligations.
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
  );
}
