import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { MainNavbar } from "@/app/components/MainNavbar";
import { CreateRFQModal } from "@/app/components/CreateRFQModal";
import { UpdateRFQModal } from "@/app/components/UpdateRFQModal";
import { SubmitQuoteModal } from "@/app/components/SubmitQuoteModal";
import { Toaster } from "@/app/components/ui/sonner";
import { RFQ } from "@/app/App";
import { RFQ as EnhancedRFQ } from "@/app/data/enhancedMockData";

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteRFQ, setQuoteRFQ] = useState<RFQ | null>(null);
  const [updateRFQ, setUpdateRFQ] = useState<EnhancedRFQ | null>(null);

  // Determine current view from path
  const getCurrentView = () => {
    const path = location.pathname;
    if (path.includes("/my-rfqs")) return "my-rfqs";
    if (path.includes("/my-quotes")) return "my-quotes";
    if (path.includes("/my-earnings")) return "my-earnings";
    return "marketplace";
  };

  const handleNavigate = (view: "marketplace" | "my-rfqs" | "my-quotes" | "my-earnings") => {
    const paths = {
      marketplace: "/dashboard",
      "my-rfqs": "/dashboard/my-rfqs",
      "my-quotes": "/dashboard/my-quotes",
      "my-earnings": "/dashboard/my-earnings",
    };
    navigate(paths[view]);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white dark">
      <MainNavbar
        currentView={getCurrentView()}
        onNavigate={handleNavigate}
        onCreateRFQ={() => setIsCreateModalOpen(true)}
      />

      <Outlet context={{ setIsQuoteModalOpen, setQuoteRFQ, setIsCreateModalOpen, setIsUpdateModalOpen, setUpdateRFQ }} />

      {/* Modals */}
      <CreateRFQModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />

      <UpdateRFQModal
        rfq={updateRFQ}
        open={isUpdateModalOpen}
        onOpenChange={setIsUpdateModalOpen}
      />

      {quoteRFQ && (
        <SubmitQuoteModal
          rfq={quoteRFQ}
          open={isQuoteModalOpen}
          onOpenChange={setIsQuoteModalOpen}
        />
      )}

      <Toaster />
    </div>
  );
}