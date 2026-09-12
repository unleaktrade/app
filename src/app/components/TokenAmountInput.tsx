import { useEffect, useRef, useState } from "react";
import { Input } from "@/app/components/ui/input";
import { useCluster } from "@/app/providers/ClusterProvider";
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
  const { cluster } = useCluster();
  const meta = useTokenMeta(mint, cluster);
  const decimals = meta.data?.decimals ?? fallbackDecimals;
  const symbol = meta.data?.symbol ?? fallbackSymbol;

  const [text, setText] = useState(() =>
    value === null ? "" : formatTokenAmount(value, decimals),
  );
  // Validity is derived from the text and the current decimals — never stored,
  // so a decimals change re-validates in the same render.
  const invalid = text.trim() !== "" && parseTokenAmount(text.replace(/,/g, ""), decimals) === null;

  // Prop → text sync without an effect ("adjust state during render"): when
  // the parent sets `value` to something the current text doesn't already
  // represent (modal prefill, ticket import, reset), re-derive the text. A
  // user's in-progress "1." still parses to the same bigint, so it is kept.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    const textValue =
      text.trim() === "" ? null : parseTokenAmount(text.replace(/,/g, ""), decimals);
    if (textValue !== value) {
      setText(value === null ? "" : formatTokenAmount(value, decimals));
    }
  }

  // Metadata resolves async: if the user typed while the fallback decimals
  // were in effect, the emitted bigint was parsed at the wrong scale. Re-parse
  // the typed text whenever the resolved decimals change, so the base-unit
  // value always matches what's on screen.
  const lastDecimals = useRef(decimals);
  useEffect(() => {
    if (lastDecimals.current === decimals) return;
    lastDecimals.current = decimals;
    if (text.trim() === "") return;
    // Notify the parent of the re-scaled value; nothing of our own is set here.
    onChange(parseTokenAmount(text.replace(/,/g, ""), decimals));
  }, [decimals, text, onChange]);

  const usd = useUsdPrice(mint, cluster, showUsdEstimate);
  const usdHint =
    showUsdEstimate && usd.data != null && value !== null
      ? (Number(value) / 10 ** decimals) * usd.data
      : null;

  const handleChange = (raw: string) => {
    setText(raw);
    if (raw.trim() === "") {
      onChange(null);
      return;
    }
    onChange(parseTokenAmount(raw.replace(/,/g, ""), decimals));
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
