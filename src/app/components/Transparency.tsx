import { useMemo } from "react";
import { useNavigate } from "react-router";
import { ShieldCheck, Landmark } from "lucide-react";
import { PageShell } from "@/app/components/PageShell";
import { SkeletonList } from "@/app/components/SkeletonList";
import { ErrorRetry } from "@/app/components/ErrorRetry";
import { EmptyState } from "@/app/components/EmptyState";
import { ShieldIllustration } from "@/app/components/illustrations";
import { TransparencyTable, type TransparencyRow } from "@/app/components/TransparencyTable";
import { useFeesTrackerAccounts, useSlashedBondsTrackerAccounts } from "@/chain/accounts/lists";
import { totalsByMint, sortLedger } from "@/app/lib/transparency";
import { resolveTokenMeta } from "@/app/lib/tokens";
import { formatTokenAmount } from "@/app/lib/format";

/**
 * Read-only protocol ledger (issue #16): every SlashedBondsTracker entry
 * (anti-abuse proof — bonds seized when a commitment lapsed) and every
 * FeesTracker entry (protocol fees paid on settlements). All figures are
 * per-mint counts and totals — never a USD aggregate.
 */
export function Transparency() {
  const navigate = useNavigate();
  const slashedQuery = useSlashedBondsTrackerAccounts();
  const feesQuery = useFeesTrackerAccounts();

  const slashedRows = useMemo<TransparencyRow[]>(
    () =>
      sortLedger(
        (slashedQuery.data ?? []).map((row) => ({
          rfq: row.account.rfq.toBase58(),
          mint: row.account.usdcMint.toBase58(),
          amount: row.account.amount,
          at: row.account.seizedAt,
          treasury: row.account.treasuryWallet.toBase58(),
        })),
        (r) => r.at,
      ),
    [slashedQuery.data],
  );

  const feeRows = useMemo<TransparencyRow[]>(
    () =>
      sortLedger(
        (feesQuery.data ?? []).map((row) => ({
          rfq: row.account.rfq.toBase58(),
          mint: row.account.quoteMint.toBase58(),
          amount: row.account.amount,
          at: row.account.payedAt,
          treasury: row.account.treasuryWallet.toBase58(),
        })),
        (r) => r.at,
      ),
    [feesQuery.data],
  );

  const slashedTotals = totalsByMint(slashedRows);
  const feeTotals = totalsByMint(feeRows);

  return (
    <PageShell orbs="purple" containerClassName="max-w-5xl py-6 sm:py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Transparency</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/60">
          The protocol's public ledger, straight from on-chain accounts: bonds seized when a
          commitment wasn't honoured, and fees paid on completed settlements. Anyone can audit these
          — nothing here is editable.
        </p>
      </header>

      {/* Summary tiles — counts + per-mint totals, never USD */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SummaryTile
          label="Slashed bonds"
          value={String(slashedRows.filter((r) => r.amount !== null).length)}
          hint="seizures recorded"
        />
        {slashedTotals.slice(0, 1).map((t) => (
          <SummaryTile
            key={`s-${t.mint}`}
            label="Total seized"
            value={formatTokenAmount(t.total, resolveTokenMeta(t.mint).decimals)}
            hint={resolveTokenMeta(t.mint).symbol}
          />
        ))}
        <SummaryTile label="Fee payments" value={String(feeRows.length)} hint="settlements" />
        {feeTotals.slice(0, 1).map((t) => (
          <SummaryTile
            key={`f-${t.mint}`}
            label="Top fee mint"
            value={formatTokenAmount(t.total, resolveTokenMeta(t.mint).decimals)}
            hint={resolveTokenMeta(t.mint).symbol}
          />
        ))}
      </div>

      <Section
        icon={<ShieldCheck className="h-5 w-5 text-state-committed" />}
        title="Slashed bonds"
        subtitle="Bonds forfeited when a selected trade wasn't funded or a reveal never came."
      >
        {slashedQuery.isLoading ? (
          <SkeletonList variant="table" count={4} />
        ) : slashedQuery.isError ? (
          <ErrorRetry
            message="Couldn't load the slashed-bonds ledger."
            onRetry={() => void slashedQuery.refetch()}
            retrying={slashedQuery.isFetching}
          />
        ) : slashedRows.length === 0 ? (
          <EmptyState
            illustration={<ShieldIllustration />}
            title="No slashed bonds"
            hint="Every settlement completed, or bonds were reclaimed in time."
          />
        ) : (
          <>
            <MintTotalsRow totals={slashedTotals} />
            <TransparencyTable
              rows={slashedRows}
              dateLabel="Seized"
              onViewRfq={(rfq) => navigate(`/dashboard/rfq/${rfq}`)}
            />
          </>
        )}
      </Section>

      <Section
        icon={<Landmark className="h-5 w-5 text-state-open" />}
        title="Protocol fees"
        subtitle="Fees paid on top of each settled quote — the poster always receives the full amount."
      >
        {feesQuery.isLoading ? (
          <SkeletonList variant="table" count={4} />
        ) : feesQuery.isError ? (
          <ErrorRetry
            message="Couldn't load the fees ledger."
            onRetry={() => void feesQuery.refetch()}
            retrying={feesQuery.isFetching}
          />
        ) : feeRows.length === 0 ? (
          <EmptyState
            illustration={<ShieldIllustration />}
            title="No fees recorded yet"
            hint="Fee entries appear when settlements complete."
          />
        ) : (
          <>
            <MintTotalsRow totals={feeTotals} />
            <TransparencyTable
              rows={feeRows}
              dateLabel="Paid"
              onViewRfq={(rfq) => navigate(`/dashboard/rfq/${rfq}`)}
            />
          </>
        )}
      </Section>
    </PageShell>
  );
}

function SummaryTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="mb-1 text-xs text-white/50">{label}</div>
      <div className="text-xl font-semibold tabular-nums text-white">{value}</div>
      <div className="text-xs text-white/40">{hint}</div>
    </div>
  );
}

function MintTotalsRow({ totals }: { totals: ReturnType<typeof totalsByMint> }) {
  if (totals.length === 0) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {totals.map((t) => {
        const meta = resolveTokenMeta(t.mint);
        return (
          <span
            key={t.mint}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70"
          >
            {formatTokenAmount(t.total, meta.decimals)} {meta.symbol}
            <span className="text-white/40"> · {t.count}</span>
          </span>
        );
      })}
    </div>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-lg bg-white/5 p-2">{icon}</div>
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-xs text-white/50">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
