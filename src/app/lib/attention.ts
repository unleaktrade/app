import type { Quote, RFQ } from "@/types/rfq";
import { formatTokenAmount } from "@/app/lib/format";
import type { PendingReward } from "@/app/lib/rewards";

/**
 * One chip in My Activity's "Needs your attention" ribbon. Pure data: the
 * ribbon resolves the click handler from `kind` + the keys at click time, so
 * the derivation never captures a navigate / claim closure that could go
 * stale between renders.
 */
export interface AttentionItem {
  id: string;
  kind: "reveal" | "select" | "settle" | "open-draft" | "claim";
  /** The RFQ the action lands on (also the PendingReward's `rfq` for claims). */
  rfqKey: string;
  /** My Quote PDA, for the quote-scoped cockpit routes (reveal / settle). */
  quoteKey?: string;
  label: string;
  sublabel?: string;
  cta: string;
  tone: "urgent" | "primary" | "reward";
  expiresIn?: string | null;
}

export interface DeriveAttentionArgs {
  /** RFQs the connected wallet posted (already filtered by maker). */
  myRFQs: RFQ[];
  /** Quotes the connected wallet submitted. */
  myQuotes: Quote[];
  /** Settled RFQs I facilitated whose reward is not yet withdrawn. */
  pendingRewards: PendingReward[];
  /** Every RFQ by pubkey, so a quote can resolve its parent's state/pair. */
  rfqByKey: Map<string, RFQ>;
}

const TONE_ORDER = { urgent: 0, primary: 1, reward: 2 } as const;

/**
 * Derive the attention chips for the connected wallet. Ordering: urgent →
 * primary → reward; within a tone, time-boxed items (truthy `expiresIn`)
 * before untimed ones, otherwise insertion order (drafts, reveals, selects,
 * settles, claims).
 */
export function deriveAttentionItems({
  myRFQs,
  myQuotes,
  pendingRewards,
  rfqByKey,
}: DeriveAttentionArgs): AttentionItem[] {
  const items: AttentionItem[] = [];
  // Drafts to open
  myRFQs
    .filter((r) => r.state === "Draft")
    .forEach((rfq) => {
      items.push({
        id: `open:${rfq.publicKey}`,
        kind: "open-draft",
        rfqKey: rfq.publicKey,
        label: `Open draft ${rfq.pair}`,
        cta: "Open",
        tone: "primary",
      });
    });
  // Quotes to reveal
  myQuotes.forEach((q) => {
    const rfq = rfqByKey.get(q.rfq);
    if (rfq && rfq.state === "Committed" && !q.revealedAt) {
      items.push({
        id: `reveal:${q.publicKey}`,
        kind: "reveal",
        rfqKey: rfq.publicKey,
        quoteKey: q.publicKey,
        label: `Reveal quote on ${rfq.pair}`,
        cta: "Reveal",
        tone: "urgent",
        expiresIn: rfq.expiresIn,
      });
    }
  });
  // My Revealed RFQs → pick winner
  myRFQs
    .filter((r) => r.state === "Revealed")
    .forEach((rfq) => {
      items.push({
        id: `select:${rfq.publicKey}`,
        kind: "select",
        rfqKey: rfq.publicKey,
        label: `Select winner on ${rfq.pair}`,
        cta: "Select",
        tone: "urgent",
        expiresIn: rfq.expiresIn,
      });
    });
  // My selected quotes → settle
  myQuotes
    .filter((q) => q.selected)
    .forEach((q) => {
      const rfq = rfqByKey.get(q.rfq);
      if (rfq && rfq.state === "Selected") {
        items.push({
          id: `settle:${q.publicKey}`,
          kind: "settle",
          rfqKey: rfq.publicKey,
          quoteKey: q.publicKey,
          label: `Settle ${rfq.pair}`,
          cta: "Settle",
          tone: "urgent",
          expiresIn: rfq.expiresIn,
        });
      }
    });
  // Pending rewards (Settled RFQs I facilitated, not yet withdrawn)
  pendingRewards.forEach((reward) => {
    items.push({
      id: `claim:${reward.rfq}`,
      kind: "claim",
      rfqKey: reward.rfq,
      label: `Claim reward — ${reward.pair}`,
      sublabel: `${formatTokenAmount(reward.amount, reward.decimals)} ${reward.symbol} ready`,
      cta: "Claim",
      tone: "reward",
    });
  });
  // Urgent first, then everything else; within each, time-based first
  return items.sort((a, b) => {
    const ta = TONE_ORDER[a.tone];
    const tb = TONE_ORDER[b.tone];
    if (ta !== tb) return ta - tb;
    if (a.expiresIn && !b.expiresIn) return -1;
    if (!a.expiresIn && b.expiresIn) return 1;
    return 0;
  });
}
