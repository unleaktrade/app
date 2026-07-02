// DEV-only component gallery (/dev/stories) — stands in for a Storybook/Ladle
// instance (Ladle's transitive peer-deps violate the zero-warning install
// rule, see #24/#12). Covers all 9 RFQStatePipeline states plus the other
// Phase 2 primitives.

import { useState } from "react";
import type { RFQState } from "@/types/rfq";
import { RFQStatePipeline } from "@/app/components/RFQStatePipeline";
import { DeadlineRing } from "@/app/components/DeadlineRing";
import { BondBreakdown } from "@/app/components/BondBreakdown";
import { AddressDisplay } from "@/app/components/AddressDisplay";
import { TokenAmountInput } from "@/app/components/TokenAmountInput";
import { EmptyState } from "@/app/components/EmptyState";
import { SkeletonList } from "@/app/components/SkeletonList";
import { ErrorRetry } from "@/app/components/ErrorRetry";
import { RFQActionSheet } from "@/app/components/RFQActionSheet";
import { ResponsiveModal } from "@/app/components/ResponsiveModal";
import { AuthGate } from "@/app/components/AuthGate";
import { Button } from "@/app/components/ui/button";

const ALL_STATES: RFQState[] = [
  "Draft",
  "Open",
  "Committed",
  "Revealed",
  "Selected",
  "Settled",
  "Ignored",
  "Expired",
  "Incomplete",
];

function Story({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="mb-4 text-sm font-semibold text-white/80">{title}</h2>
      {children}
    </section>
  );
}

export function ComponentStories() {
  const now = Math.floor(Date.now() / 1000);
  const [amount, setAmount] = useState<bigint | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-page px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-lg font-bold text-white">
          Phase 2 primitives <span className="text-white/40">(dev only)</span>
        </h1>

        <Story title="RFQStatePipeline — all 9 states">
          <div className="space-y-6">
            {ALL_STATES.map((state) => (
              <div key={state}>
                <div className="mb-1 text-xs text-white/40">{state}</div>
                <RFQStatePipeline state={state} />
              </div>
            ))}
          </div>
        </Story>

        <Story title="DeadlineRing — green / amber / red / expired">
          <div className="flex flex-wrap items-center gap-6">
            <DeadlineRing deadlineSec={now + 3000} totalSec={3600} />
            <DeadlineRing deadlineSec={now + 900} totalSec={3600} />
            <DeadlineRing deadlineSec={now + 200} totalSec={3600} />
            <DeadlineRing deadlineSec={now - 10} totalSec={3600} />
            <DeadlineRing deadlineSec={null} totalSec={3600} />
          </div>
        </Story>

        <Story title="BondBreakdown">
          <BondBreakdown
            bondAmount={5_000_000_000n}
            quoteAmount={950_000_000_000n}
            quoteSymbol="USDC"
            quoteDecimals={6}
            takerFeeBps={30}
            facilitatorFeeBps={500}
            className="max-w-md"
          />
        </Story>

        <Story title="TokenAmountInput (decimal-aware, bigint base units)">
          <div className="max-w-md space-y-2">
            <TokenAmountInput
              mint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
              value={amount}
              onChange={setAmount}
              fallbackDecimals={6}
              fallbackSymbol="USDC"
            />
            <div className="text-xs text-white/40">
              base units:{" "}
              <span className="font-mono">{amount === null ? "—" : amount.toString()}</span>
            </div>
          </div>
        </Story>

        <Story title="AddressDisplay">
          <AddressDisplay address="7wrjbU1NbVtUCUGP1obi3aiT6QrjXZnH5XJDXMsKtkPG" />
        </Story>

        <Story title="RFQActionSheet — inline ≥ md, bottom sheet < md">
          <RFQActionSheet title="Demo actions">
            <Button className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
              Primary action
            </Button>
            <Button variant="outline" className="flex-1 border-white/20 bg-white/5 text-white">
              Secondary action
            </Button>
          </RFQActionSheet>
        </Story>

        <Story title="ResponsiveModal — Dialog ≥ md, bottom sheet < md">
          <Button
            variant="outline"
            className="border-white/20 bg-white/5 text-white"
            onClick={() => setModalOpen(true)}
          >
            Open responsive modal
          </Button>
          <ResponsiveModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            title={<span className="text-2xl font-bold">Responsive modal</span>}
            description="Resize the viewport across 768px — Dialog above, vaul drawer below."
            contentClassName="max-w-xl"
          >
            <div className="space-y-3 py-4 text-sm text-white/70">
              <p>The same children render in both shells; only the chrome changes.</p>
              <Button
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                onClick={() => setModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </ResponsiveModal>
        </Story>

        <Story title="AuthGate — restoring / signing (scaled frames)">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-80 overflow-hidden rounded-lg border border-white/10 [&>div]:min-h-full">
              <AuthGate variant="restoring" />
            </div>
            <div className="h-80 overflow-hidden rounded-lg border border-white/10 [&>div]:min-h-full">
              <AuthGate variant="signing" />
            </div>
          </div>
        </Story>

        <Story title="EmptyState / ErrorRetry / SkeletonList">
          <div className="space-y-4">
            <EmptyState
              title="Nothing here yet"
              hint="Open requests will appear here as soon as they're posted."
              action={<Button size="sm">Create one</Button>}
            />
            <ErrorRetry onRetry={() => undefined} />
            <SkeletonList count={3} />
          </div>
        </Story>
      </div>
    </div>
  );
}
