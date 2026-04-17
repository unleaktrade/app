import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { MainNavbar, type DashboardView } from "@/app/components/MainNavbar";
import { CreateRFQModal } from "@/app/components/CreateRFQModal";
import { UpdateRFQModal } from "@/app/components/UpdateRFQModal";
import { SubmitQuoteModal } from "@/app/components/SubmitQuoteModal";
import { Toaster } from "@/app/components/ui/sonner";
import type { RFQ } from "@/types/rfq";

export interface DashboardOutletContext {
  setIsQuoteModalOpen: (open: boolean) => void;
  setQuoteRFQ: (rfq: RFQ | null) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  setIsUpdateModalOpen: (open: boolean) => void;
  setUpdateRFQ: (rfq: RFQ | null) => void;
}

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteRFQ, setQuoteRFQ] = useState<RFQ | null>(null);
  const [updateRFQ, setUpdateRFQ] = useState<RFQ | null>(null);

  const getCurrentView = (): DashboardView =>
    location.pathname.includes("/my-activity") ? "my-activity" : "marketplace";

  const handleNavigate = (view: DashboardView) => {
    navigate(view === "marketplace" ? "/dashboard" : "/dashboard/my-activity");
  };

  const context: DashboardOutletContext = {
    setIsQuoteModalOpen,
    setQuoteRFQ,
    setIsCreateModalOpen,
    setIsUpdateModalOpen,
    setUpdateRFQ,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white dark">
      <MainNavbar
        currentView={getCurrentView()}
        onNavigate={handleNavigate}
        onCreateRFQ={() => setIsCreateModalOpen(true)}
      />

      <Outlet context={context} />

      <CreateRFQModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
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
