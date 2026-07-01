import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { PublicKey } from "@solana/web3.js";
import { useQuoteAccount } from "@/chain/accounts/quote";
import { useRfqAccount } from "@/chain/accounts/rfq";
import { SkeletonList } from "@/app/components/SkeletonList";
import { ErrorRetry } from "@/app/components/ErrorRetry";
import { RevealQuote } from "@/app/components/RevealQuote";

/** Loads the quote (by its PDA in the URL) and its parent RFQ, then renders the
 * reveal cockpit. Flat, role-free path per the #10 consolidation. */
export function RevealQuoteWrapper() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();

  const quotePda = useMemo(() => {
    if (!quoteId) return null;
    try {
      return new PublicKey(quoteId);
    } catch {
      return null;
    }
  }, [quoteId]);

  const quoteQuery = useQuoteAccount(quotePda);
  const rfqPda = quoteQuery.data?.rfq ?? null;
  const rfqQuery = useRfqAccount(rfqPda);

  const back = () => navigate(-1);

  if (quotePda === null) {
    return (
      <Shell>
        <ErrorRetry message="Invalid quote address." onRetry={back} />
      </Shell>
    );
  }
  if (quoteQuery.isLoading || rfqQuery.isLoading) {
    return (
      <Shell>
        <SkeletonList count={2} />
      </Shell>
    );
  }
  if (quoteQuery.isError || !quoteQuery.data) {
    return (
      <Shell>
        <ErrorRetry
          message="Couldn't load this quote."
          onRetry={() => void quoteQuery.refetch()}
          retrying={quoteQuery.isFetching}
        />
      </Shell>
    );
  }
  if (!rfqQuery.data || rfqPda === null) {
    return (
      <Shell>
        <ErrorRetry message="Couldn't load the RFQ for this quote." onRetry={back} />
      </Shell>
    );
  }

  return (
    <RevealQuote
      quotePda={quotePda}
      quote={quoteQuery.data}
      rfqPda={rfqPda}
      rfq={rfqQuery.data}
      onDone={() => navigate(`/dashboard/rfq/${rfqPda.toBase58()}`)}
      onBack={back}
    />
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-32 pt-16">
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">{children}</div>
    </div>
  );
}
