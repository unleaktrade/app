import { AddressDisplay } from "@/app/components/AddressDisplay";
import type { ProgramAccount } from "@/chain/accounts/lists";
import type { QuoteAccount } from "@/chain/accounts/quote";
import { formatTokenAmount } from "@/app/lib/format";

export function WinnerSummary({
  quoteRow,
  quoteSymbol,
  quoteDecimals,
}: {
  quoteRow: ProgramAccount<QuoteAccount> | null;
  quoteSymbol: string;
  quoteDecimals: number;
}) {
  if (!quoteRow || quoteRow.account.quoteAmount === null) return null;
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-6 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-1.5 text-sm text-white/60">
        <span>Winning quote</span>
        <AddressDisplay address={quoteRow.account.taker.toBase58()} />
      </div>
      <div className="text-lg font-semibold text-white tabular-nums">
        {formatTokenAmount(quoteRow.account.quoteAmount, quoteDecimals)} {quoteSymbol}
      </div>
    </div>
  );
}
