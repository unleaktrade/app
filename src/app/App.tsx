import { useState } from "react";
import { DashboardHome } from "@/app/components/DashboardHome";
import { BrowseRFQs } from "@/app/components/BrowseRFQs";
import { CreateRFQModal } from "@/app/components/CreateRFQModal";
import { SubmitQuoteModal } from "@/app/components/SubmitQuoteModal";
import { RFQDetailsView } from "@/app/components/RFQDetailsView";
import { Navigation } from "@/app/components/Navigation";
import { Toaster } from "@/app/components/ui/sonner";

export type RFQState = "Draft" | "Open" | "Committed" | "Revealed" | "Selected" | "Settled" | "Ignored" | "Expired" | "Incomplete";

export interface RFQ {
  id: string;
  pair: string;
  baseMint: string;
  quoteMint: string;
  baseAmount: number;
  quoteAmount: number;
  price: number;
  status: RFQState;
  state: RFQState; // Using 'state' to match settlement engine terminology
  expires: string | null;
  maker: string;
  taker?: string;
  facilitator?: string;
  bondAmount: number;
  takerFee: number;
  commitTtl: number;
  revealTtl: number;
  selectionTtl: number;
  fundTtl: number;
  createdAt: number;
}

type View = "home" | "browse" | "details" | "my-rfqs";

function App() {
  const [view, setView] = useState<View>("home");
  const [selectedRFQId, setSelectedRFQId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteRFQ, setQuoteRFQ] = useState<RFQ | null>(null);

  const handleViewRFQ = (rfqId: string) => {
    setSelectedRFQId(rfqId);
    setView("details");
  };

  const handleQuoteRFQ = (rfq: RFQ) => {
    setQuoteRFQ(rfq);
    setIsQuoteModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white dark">
      <Navigation 
        currentView={view}
        onNavigate={setView}
        onCreateRFQ={() => setIsCreateModalOpen(true)}
        onQuickQuote={() => setView("browse")}
      />
      
      <main className="pt-16">
        {view === "home" && (
          <DashboardHome 
            onCreateRFQ={() => setIsCreateModalOpen(true)}
            onBrowseRFQs={() => setView("browse")}
            onViewRFQ={handleViewRFQ}
            onQuoteRFQ={handleQuoteRFQ}
          />
        )}
        
        {view === "browse" && (
          <BrowseRFQs 
            onViewRFQ={handleViewRFQ}
            onQuoteRFQ={handleQuoteRFQ}
          />
        )}

        {view === "my-rfqs" && (
          <BrowseRFQs 
            myRFQsOnly
            onViewRFQ={handleViewRFQ}
            onQuoteRFQ={handleQuoteRFQ}
          />
        )}
        
        {view === "details" && selectedRFQId && (
          <RFQDetailsView 
            rfqId={selectedRFQId}
            onBack={() => setView("home")}
            onQuoteRFQ={handleQuoteRFQ}
          />
        )}
      </main>

      <CreateRFQModal 
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />

      {quoteRFQ && (
        <SubmitQuoteModal 
          rfq={quoteRFQ}
          open={isQuoteModalOpen}
          onOpenChange={setIsQuoteModalOpen}
        />
      )}

      <Toaster theme="dark" />
    </div>
  );
}

export default App;