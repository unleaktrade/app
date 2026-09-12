import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import type { RFQ } from "@/types/rfq";
import { Button } from "@/app/components/ui/button";
import { PageShell } from "@/app/components/PageShell";
import { SkeletonList } from "@/app/components/SkeletonList";
import { ErrorRetry } from "@/app/components/ErrorRetry";
import { RFQActionBar } from "@/app/components/RFQActionBar";
import { DetailHeader } from "@/app/components/rfq-detail/DetailHeader";
import { StatePanel } from "@/app/components/rfq-detail/StatePanel";
import type { Relation } from "@/app/components/rfq-detail/types";
import type { RfqActionId } from "@/app/lib/rfq-actions";
import { useRfqAccount } from "@/chain/accounts/rfq";
import { useQuoteAccountsForRfq } from "@/chain/accounts/lists";
import { toRfqViewModel } from "@/app/lib/rfq-view-model";
import { useResolveTokenMeta } from "@/app/hooks/useResolveTokenMeta";
import { useNowSecs } from "@/app/hooks/useNowSecs";
import { ArrowLeft } from "lucide-react";
import { useMemo, type ReactNode } from "react";

interface AdaptiveRFQDetailProps {
  rfqId: string;
  onBack: () => void;
  onQuoteRFQ?: (rfq: RFQ) => void;
  onEditRFQ?: (rfq: RFQ) => void;
  /** Deep-linked ?action=… (validated upstream) — forwarded to the action bar. */
  requestedAction?: RfqActionId | null;
  onRequestedActionConsumed?: () => void;
}

export function AdaptiveRFQDetail({
  rfqId,
  onBack,
  onQuoteRFQ,
  onEditRFQ,
  requestedAction = null,
  onRequestedActionConsumed,
}: AdaptiveRFQDetailProps) {
  const pda = useMemo(() => {
    try {
      return new PublicKey(rfqId);
    } catch {
      return null;
    }
  }, [rfqId]);
  const rfqQuery = useRfqAccount(pda);
  const quotesQuery = useQuoteAccountsForRfq(pda);
  const { publicKey } = useWallet();
  const nowSecs = useNowSecs();
  const resolveToken = useResolveTokenMeta();

  if (rfqQuery.isLoading) {
    return (
      <Shell>
        <SkeletonList variant="detail" />
      </Shell>
    );
  }

  if (rfqQuery.isError) {
    return (
      <Shell>
        <ErrorRetry
          message="Couldn't load this RFQ from the chain."
          onRetry={() => void rfqQuery.refetch()}
          retrying={rfqQuery.isFetching}
        />
      </Shell>
    );
  }

  if (pda === null || !rfqQuery.data) {
    return (
      <div className="min-h-screen bg-surface-page pb-32 pt-16 flex items-center justify-center">
        <div className="text-white">RFQ not found</div>
      </div>
    );
  }

  const account = rfqQuery.data;
  const rfq = toRfqViewModel({ publicKey: pda, account }, nowSecs, resolveToken);
  const quoteRows = quotesQuery.data ?? [];
  const connected = publicKey?.toBase58() ?? null;

  const relation: Relation = {
    isMaker: connected !== null && connected === account.maker.toBase58(),
    isFacilitator: connected !== null && account.facilitator?.toBase58() === connected,
    myQuote:
      connected === null
        ? null
        : (quoteRows.find((q) => q.account.taker.toBase58() === connected) ?? null),
  };

  const quoteMeta = resolveToken(rfq.quoteMint);

  return (
    <PageShell variant="detail" orbs="purple" containerClassName="max-w-5xl py-6 sm:py-8">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-6 text-white/60 hover:text-white hover:bg-white/5"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Header */}
      <DetailHeader rfq={rfq} account={account} />

      {/* State-specific informational panel (role-neutral) */}
      <StatePanel
        rfq={rfq}
        account={account}
        relation={relation}
        quoteRows={quoteRows}
        quoteSymbol={quoteMeta.symbol}
        quoteDecimals={quoteMeta.decimals}
        nowSecs={nowSecs}
        rfqPda={pda}
      />

      {/* The single action bar — legal maker/facilitator CTAs for this state */}
      <div className="mt-6">
        <RFQActionBar
          rfqPda={pda}
          rfq={account}
          quotes={quoteRows}
          onEdit={() => onEditRFQ?.(rfq)}
          onCommit={() => onQuoteRFQ?.(rfq)}
          onClosed={onBack}
          requestedAction={requestedAction}
          onRequestedActionConsumed={onRequestedActionConsumed}
        />
      </div>
    </PageShell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <PageShell variant="detail" orbs="purple" containerClassName="max-w-5xl py-6 sm:py-8">
      {children}
    </PageShell>
  );
}
