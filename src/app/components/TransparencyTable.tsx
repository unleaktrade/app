import { AddressDisplay } from "@/app/components/AddressDisplay";
import { resolveTokenMeta } from "@/app/lib/tokens";
import { formatTokenAmount } from "@/app/lib/format";

export interface TransparencyRow {
  /** Base58 RFQ address the entry belongs to. */
  rfq: string;
  /** Base58 mint of the amount. */
  mint: string;
  /** Base-unit amount; null renders as pending. */
  amount: bigint | null;
  /** Unix seconds; null renders as —. */
  at: number | null;
  /** Base58 treasury wallet the funds went to. */
  treasury: string;
}

interface TransparencyTableProps {
  rows: TransparencyRow[];
  /** Column header for the timestamp (e.g. "Seized" / "Paid"). */
  dateLabel: string;
  onViewRfq?: (rfq: string) => void;
}

/**
 * Ledger rows for the transparency page: a real table on ≥md, stacked cards
 * below. Amounts always render as `{amount} {symbol}` in the row's own mint.
 */
export function TransparencyTable({ rows, dateLabel, onViewRfq }: TransparencyTableProps) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                RFQ
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Amount
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {dateLabel}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Treasury
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.rfq}-${row.at ?? "pending"}`} className="border-t border-white/5">
                <td className="px-4 py-3">
                  {onViewRfq ? (
                    <button
                      type="button"
                      onClick={() => onViewRfq(row.rfq)}
                      className="text-state-open hover:underline"
                    >
                      <AddressDisplay address={row.rfq} />
                    </button>
                  ) : (
                    <AddressDisplay address={row.rfq} />
                  )}
                </td>
                <td className="px-4 py-3">
                  <Amount mint={row.mint} amount={row.amount} />
                </td>
                <td className="px-4 py-3 text-white/60">
                  {row.at !== null ? new Date(row.at * 1000).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <AddressDisplay address={row.treasury} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <div
            key={`${row.rfq}-${row.at ?? "pending"}`}
            className="glass-card rounded-xl p-4 text-sm"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <AddressDisplay address={row.rfq} />
              <Amount mint={row.mint} amount={row.amount} />
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-white/40">
              <span>{row.at !== null ? new Date(row.at * 1000).toLocaleDateString() : "—"}</span>
              <span className="flex items-center gap-1">
                treasury <AddressDisplay address={row.treasury} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Amount({ mint, amount }: { mint: string; amount: bigint | null }) {
  const meta = resolveTokenMeta(mint);
  if (amount === null) {
    return <span className="text-white/40">pending</span>;
  }
  return (
    <span className="font-mono tabular-nums text-white">
      {formatTokenAmount(amount, meta.decimals)}{" "}
      <span className="text-white/50">{meta.symbol}</span>
    </span>
  );
}
