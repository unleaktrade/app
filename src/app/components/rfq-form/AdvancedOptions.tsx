// "Advanced Options" disclosure holding the optional reward-recipient address.
// Rendered on the timing step in update mode and on the review step in create
// mode (matching the original modals); the open/closed state lives in RFQForm
// so it survives step changes.

import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "motion/react";

interface AdvancedOptionsProps {
  open: boolean;
  onToggle: () => void;
  facilitatorAddress: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

export function AdvancedOptions({
  open,
  onToggle,
  facilitatorAddress,
  onChange,
  disabled,
}: AdvancedOptionsProps) {
  return (
    <div className="border-t border-white/10 pt-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full text-sm text-white/70 hover:text-white transition-colors"
      >
        <span>Advanced Options</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
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
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-sm"
          />
          <p className="text-xs text-white/50">
            Optional intermediary who receives a fee share from settlement
          </p>
        </motion.div>
      )}
    </div>
  );
}
