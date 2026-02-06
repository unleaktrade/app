import { useState } from "react";
import { MainNavbar } from "@/app/components/MainNavbar";
import { Marketplace } from "@/app/components/Marketplace";
import { MyRFQs } from "@/app/components/MyRFQs";
import { MyQuotes } from "@/app/components/MyQuotes";
import { MyEarnings } from "@/app/components/MyEarnings";
import { AdaptiveRFQDetail } from "@/app/components/AdaptiveRFQDetail";
import { CreateRFQModal } from "@/app/components/CreateRFQModal";
import { SubmitQuoteModal } from "@/app/components/SubmitQuoteModal";
import { Toaster } from "@/app/components/ui/sonner";
import { RFQ as EnhancedRFQ } from "@/app/data/enhancedMockData";

export type RFQState = "Draft" | "Open" | "Committed" | "Revealed" | "Selected" | "Settled" | "Ignored" | "Expired" | "Incomplete";

// Keep legacy RFQ interface for compatibility
export interface RFQ {
  id: string;
  pair: string;
  baseMint?: string;
  quoteMint?: string;
  baseAmount: number;
  quoteAmount: number;
  price: number;
  status: RFQState;
  state: RFQState;
  expires: string | null;
  maker?: string;
  taker?: string;
  facilitator?: string;
  bondAmount?: number;
  takerFee?: number;
  commitTtl?: number;
  revealTtl?: number;
  selectionTtl?: number;
  fundTtl?: number;
  createdAt?: string | number;
}

export type UserRole = "maker" | "taker" | "facilitator";

type MainView = "marketplace" | "my-rfqs" | "my-quotes" | "my-earnings";
type SubView = "main" | "details";

function App() {
  const [mainView, setMainView] = useState<MainView>("marketplace");
  const [subView, setSubView] = useState<SubView>("main");
  const [selectedRFQId, setSelectedRFQId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteRFQ, setQuoteRFQ] = useState<EnhancedRFQ | null>(null);

  const handleViewRFQ = (rfqId: string) => {
    setSelectedRFQId(rfqId);
    setSubView("details");
  };

  const handleQuoteRFQ = (rfq: EnhancedRFQ) => {
    setQuoteRFQ(rfq);
    setIsQuoteModalOpen(true);
  };

  const handleBackToMain = () => {
    setSubView("main");
    setSelectedRFQId(null);
  };

  const handleNavigate = (view: MainView) => {
    setMainView(view);
    setSubView("main");
    setSelectedRFQId(null);
  };

  // Convert enhanced RFQ to legacy format for modals
  const convertToLegacyRFQ = (rfq: EnhancedRFQ): RFQ => ({
    id: rfq.publicKey,
    pair: rfq.pair,
    baseMint: rfq.baseMint,
    quoteMint: rfq.quoteMint,
    baseAmount: rfq.baseAmount,
    quoteAmount: rfq.minQuoteAmount,
    price: rfq.minQuoteAmount / rfq.baseAmount,
    status: rfq.state,
    state: rfq.state,
    expires: rfq.expiresIn,
    maker: rfq.maker,
    facilitator: rfq.facilitator,
    bondAmount: rfq.bondAmount,
    takerFee: rfq.feeAmount,
    createdAt: rfq.createdAt,
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white dark">
      <MainNavbar
        currentView={mainView}
        onNavigate={handleNavigate}
        onCreateRFQ={() => setIsCreateModalOpen(true)}
      />

      {subView === "main" && (
        <>
          {mainView === "marketplace" && (
            <Marketplace
              onQuoteRFQ={handleQuoteRFQ}
              onViewRFQ={handleViewRFQ}
            />
          )}

          {mainView === "my-rfqs" && (
            <MyRFQs
              onCreateRFQ={() => setIsCreateModalOpen(true)}
              onViewRFQ={handleViewRFQ}
            />
          )}

          {mainView === "my-quotes" && (
            <MyQuotes
              onViewRFQ={handleViewRFQ}
            />
          )}

          {mainView === "my-earnings" && (
            <MyEarnings
              onViewRFQ={handleViewRFQ}
            />
          )}
        </>
      )}

      {subView === "details" && selectedRFQId && (
        <AdaptiveRFQDetail
          rfqId={selectedRFQId}
          onBack={handleBackToMain}
          onQuoteRFQ={(rfq) => {
            // Convert legacy RFQ back to enhanced format
            const enhancedRFQ: EnhancedRFQ = {
              publicKey: rfq.id || "",
              maker: rfq.maker || "",
              baseMint: rfq.baseMint || "",
              quoteMint: rfq.quoteMint || "",
              pair: rfq.pair,
              baseAmount: rfq.baseAmount,
              minQuoteAmount: rfq.quoteAmount,
              bondAmount: rfq.bondAmount || 0,
              feeAmount: rfq.takerFee || 0,
              state: rfq.state,
              commitTtlSecs: rfq.commitTtl || 3600,
              revealTtlSecs: rfq.revealTtl || 1800,
              selectionTtlSecs: rfq.selectionTtl || 1800,
              fundTtlSecs: rfq.fundTtl || 3600,
              createdAt: typeof rfq.createdAt === "number" ? rfq.createdAt : 0,
              openedAt: null,
              selectedAt: null,
              completedAt: null,
              committedCount: 0,
              revealedCount: 0,
              selectedQuote: null,
              facilitator: rfq.facilitator || null,
              expiresIn: rfq.expires,
            };
            handleQuoteRFQ(enhancedRFQ);
          }}
        />
      )}

      {/* Modals */}
      <CreateRFQModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />

      {quoteRFQ && (
        <SubmitQuoteModal
          rfq={convertToLegacyRFQ(quoteRFQ)}
          open={isQuoteModalOpen}
          onOpenChange={setIsQuoteModalOpen}
        />
      )}

      <Toaster />
    </div>
  );
}

export default App;