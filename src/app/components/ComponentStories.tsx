// DEV-only component gallery (/dev/stories) — stands in for a Storybook/Ladle
// instance (Ladle's transitive peer-deps violate the zero-warning install
// rule, see #24/#12). Covers the shared primitives: the 9 RFQStatePipeline
// states, the Phase 6 theme tokens/glass/typography, and every new Phase 6
// component with deterministic fixtures.

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
import { RewardsSection } from "@/app/components/RewardsSection";
import { RFQForm } from "@/app/components/RFQForm";
import { AuthGate } from "@/app/components/AuthGate";
import { Button } from "@/app/components/ui/button";
import type { ClaimedReward, PendingReward } from "@/app/lib/rewards";
import { TransparencyTable, type TransparencyRow } from "@/app/components/TransparencyTable";
import { ProofInspector } from "@/app/components/ProofInspector";
import { SettlementReceiptCard } from "@/app/components/SettlementReceiptCard";
import { ShareRfqButton } from "@/app/components/ShareRfqButton";
import {
  GiftIllustration,
  InboxIllustration,
  RadarIllustration,
  SeedlingIllustration,
  ShieldIllustration,
} from "@/app/components/illustrations";
import { bytesToHex, type RevealTicket } from "@/app/lib/reveal-ticket";

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

// Fixture rewards spanning two mints so the per-mint tiles and both charts
// render; timestamps are fixed so the story is deterministic.
const STORY_PENDING_REWARDS: PendingReward[] = [
  {
    rfq: "RfqPending111111111111111111111111111111111",
    quote: "QuotePending11111111111111111111111111111111",
    quoteMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "USDC",
    decimals: 6,
    amount: 12_500_000n,
    settledAt: 1_750_000_000,
    pair: "wSOL/USDC",
  },
];

const STORY_CLAIMED_REWARDS: ClaimedReward[] = [
  {
    tracker: "Tracker1111111111111111111111111111111111111",
    rfq: "RfqClaimed111111111111111111111111111111111",
    quoteMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "USDC",
    decimals: 6,
    amount: 4_200_000n,
    claimedAt: 1_749_000_000,
    pair: "JUP/USDC",
  },
  {
    tracker: "Tracker2222222222222222222222222222222222222",
    rfq: "RfqClaimed222222222222222222222222222222222",
    quoteMint: "So11111111111111111111111111111111111111112",
    symbol: "wSOL",
    decimals: 9,
    amount: 1_500_000_000n,
    claimedAt: 1_749_500_000,
    pair: "USDC/wSOL",
  },
  {
    tracker: "Tracker3333333333333333333333333333333333333",
    rfq: "RfqClaimed333333333333333333333333333333333",
    quoteMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "USDC",
    decimals: 6,
    amount: 9_100_000n,
    claimedAt: 1_749_900_000,
    pair: "BONK/USDC",
  },
];

const STORY_LEDGER_ROWS: TransparencyRow[] = [
  {
    rfq: "RfqSlashed111111111111111111111111111111111",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amount: 25_000_000n,
    at: 1_750_000_000,
    treasury: "Treasury111111111111111111111111111111111111",
  },
  {
    rfq: "RfqSlashed222222222222222222222222222222222",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amount: null,
    at: null,
    treasury: "Treasury111111111111111111111111111111111111",
  },
];

// Deterministic ticket + fake on-chain bytes for the proof-inspector story.
// The signature check renders red (the proof is not real) — demonstrative.
const STORY_TICKET: RevealTicket = {
  version: 1,
  rfq: "7wrjbU1NbVtUCUGP1obi3aiT6QrjXZnH5XJDXMsKtkPG",
  taker: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  quoteMint: "So11111111111111111111111111111111111111112",
  salt: bytesToHex(new Uint8Array(Array.from({ length: 64 }, (_, i) => i))),
  quoteAmount: "950000000000",
  bondAmount: "5000000000",
  takerFeeBps: 30,
};
const STORY_QUOTE_BYTES = {
  commitHash: new Uint8Array(32).fill(0xab),
  liquidityProof: new Uint8Array(64).fill(0xcd),
};

const STATE_TOKEN_KEYS = [
  "draft",
  "open",
  "committed",
  "revealed",
  "selected",
  "settled",
  "ignored",
  "expired",
  "incomplete",
] as const;

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
  const [inspectorOpen, setInspectorOpen] = useState(false);

  return (
    <main className="min-h-screen bg-surface-page px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-lg font-bold text-white">
          Component gallery <span className="text-white/40">(dev only)</span>
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

        <Story title="RewardsSection — 2 mints, pending + claimed (fixtures)">
          <RewardsSection
            pending={STORY_PENDING_REWARDS}
            claimed={STORY_CLAIMED_REWARDS}
            claimingRfq={null}
            batch={null}
            onClaim={() => undefined}
            onClaimAll={() => undefined}
            onView={() => undefined}
          />
        </Story>

        <Story title="RFQForm — the shared create/update wizard (no-op submit)">
          <RFQForm
            mode="create"
            submitting={false}
            submitLabel="Create RFQ"
            onSubmit={() => undefined}
          />
        </Story>

        <Story title="Theme — state tokens (base / deep) + glass surfaces">
          <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {STATE_TOKEN_KEYS.map((key) => (
              <div key={key} className="rounded-lg border border-white/10 p-2 text-center">
                <div className="mb-1 flex justify-center gap-1">
                  <span
                    className="h-6 w-6 rounded"
                    style={{ background: `var(--state-${key})` }}
                    title={`--state-${key}`}
                  />
                  <span
                    className="h-6 w-6 rounded"
                    style={{ background: `var(--state-${key}-deep)` }}
                    title={`--state-${key}-deep`}
                  />
                </div>
                <span className="text-[10px] text-white/50">{key}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass-panel rounded-xl p-4 text-sm text-white/70">
              glass-panel — chrome weight (navbar, modals, popovers)
            </div>
            <div className="glass-card rounded-xl p-4 text-sm text-white/70">
              glass-card — card weight (grids, tiles)
            </div>
          </div>
        </Story>

        <Story title="Typography — Space Grotesk display / Inter body / JetBrains mono">
          <div className="space-y-2">
            <p className="font-display text-2xl font-bold text-white">Confidential OTC trading</p>
            <p className="text-sm text-white/70">
              Body copy uses Inter Variable — quotes stay sealed until reveal, bonds keep everyone
              honest.
            </p>
            <p className="font-mono text-sm tabular-nums text-white/80">
              7wrj…tkPG · 1,010.000001 USDC · 178 bytes
            </p>
          </div>
        </Story>

        <Story title="SkeletonList — cards / detail / stats / table (shimmer)">
          <div className="space-y-6">
            <SkeletonList variant="stats" count={4} />
            <SkeletonList variant="table" count={3} />
            <SkeletonList variant="detail" />
          </div>
        </Story>

        <Story title="Illustrations — themed inline SVGs">
          <div className="flex flex-wrap items-end gap-6">
            <RadarIllustration />
            <SeedlingIllustration />
            <GiftIllustration />
            <ShieldIllustration />
            <InboxIllustration />
          </div>
        </Story>

        <Story title="TransparencyTable — fixture ledger (table ≥ md, cards below)">
          <TransparencyTable rows={STORY_LEDGER_ROWS} dateLabel="Seized" />
        </Story>

        <Story title="ProofInspector — fixture ticket (signature check is demonstratively red)">
          <Button
            variant="outline"
            className="border-white/20 bg-white/5 text-white"
            onClick={() => setInspectorOpen(true)}
          >
            Open proof inspector
          </Button>
          <ProofInspector
            open={inspectorOpen}
            onOpenChange={setInspectorOpen}
            rfqPda={STORY_TICKET.rfq}
            quote={STORY_QUOTE_BYTES}
            ticket={STORY_TICKET}
          />
        </Story>

        <Story title="SettlementReceiptCard — PNG-exportable receipt">
          <SettlementReceiptCard
            rfqPda="7wrjbU1NbVtUCUGP1obi3aiT6QrjXZnH5XJDXMsKtkPG"
            pair="wSOL/USDC"
            receivedAmount="12.5"
            receivedSymbol="wSOL"
            txSignature="5KtP3xample1111111111111111111111111111111111111111111111111111"
            solscanUrl="https://solscan.io/"
            cluster="devnet"
            onDone={() => undefined}
          />
        </Story>

        <Story title="ShareRfqButton — copy link + QR (state-gated commit preload)">
          <ShareRfqButton
            rfqPda="7wrjbU1NbVtUCUGP1obi3aiT6QrjXZnH5XJDXMsKtkPG"
            state="Open"
            className="border border-white/20 bg-white/5 text-white"
          />
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
    </main>
  );
}
