import { useState } from "react";
import { Input } from "@/app/components/ui/input";
import { useClusterState } from "@/chain/cluster";
import { useTokenMeta, useUsdPrice } from "@/app/lib/jupiter";
import { formatTokenAmount, parseTokenAmount } from "@/app/lib/format";
import { cn } from "@/app/components/ui/utils";

interface TokenAmountInputProps {
  /** Mint address — drives metadata (symbol/decimals) lookup. */
  mint: string | null;
  /** Base-unit amount, or null while empty/invalid. */
  value: bigint | null;
  onChange: (value: bigint | null) => void;
  /** Fallback decimals while metadata loads / for unlisted mints. */
  fallbackDecimals?: number;
  fallbackSymbol?: string;
  /** Opt-in per-amount USD hint (mainnet only; never aggregated). */
  showUsdEstimate?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Decimal-aware token amount input: renders a human decimal string, emits
 * base-unit bigints. Metadata comes from the Jupiter token list on mainnet
 * with a static-catalog fallback elsewhere.
 */
export function TokenAmountInput({
  mint,
  value,
  onChange,
  fallbackDecimals = 9,
  fallbackSymbol,
  showUsdEstimate = false,
  placeholder = "0.0",
  disabled,
  className,
}: TokenAmountInputProps) {
  const { cluster } = useClusterState();
  const meta = useTokenMeta(mint, cluster);
  const decimals = meta.data?.decimals ?? fallbackDecimals;
  const symbol = meta.data?.symbol ?? fallbackSymbol;

  const [text, setText] = useState(() =>
    value === null ? "" : formatTokenAmount(value, decimals),
  );
  const [invalid, setInvalid] = useState(false);

  const usd = useUsdPrice(mint, cluster, showUsdEstimate);
  const usdHint =
    showUsdEstimate && usd.data != null && value !== null
      ? (Number(value) / 10 ** decimals) * usd.data
      : null;

  const handleChange = (raw: string) => {
    setText(raw);
    if (raw.trim() === "") {
      setInvalid(false);
      onChange(null);
      return;
    }
    const parsed = parseTokenAmount(raw.replace(/,/g, ""), decimals);
    setInvalid(parsed === null);
    onChange(parsed);
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="relative">
        <Input
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={invalid}
          className={cn(
            "bg-white/5 border-white/10 pr-16 font-mono text-white placeholder:text-white/30",
            invalid && "border-red-500/50 focus-visible:ring-red-500/40",
          )}
        />
        {symbol && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-white/50">
            {symbol}
          </span>
        )}
      </div>
      <div className="flex justify-between text-[11px]">
        <span className={cn(invalid ? "text-red-400" : "text-white/30")}>
          {invalid ? `Invalid amount (max ${decimals} decimals)` : `${decimals} decimals`}
        </span>
        {usdHint !== null && (
          <span className="text-white/40">
            ≈ ${usdHint.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </span>
        )}
      </div>
    </div>
  );
}
