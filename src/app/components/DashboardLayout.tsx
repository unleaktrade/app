import { useState } from "react";
import { Navigate, Outlet, useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { AuthGate } from "@/app/components/AuthGate";
import { MainNavbar, type DashboardView } from "@/app/components/MainNavbar";
import { CreateRFQModal } from "@/app/components/CreateRFQModal";
import { UpdateRFQModal } from "@/app/components/UpdateRFQModal";
import { SubmitQuoteModal } from "@/app/components/SubmitQuoteModal";
import { DevConfigPanel } from "@/app/components/DevConfigPanel";
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
  const { connecting } = useWallet();
  const { authenticated, state: authState } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteRFQ, setQuoteRFQ] = useState<RFQ | null>(null);
  const [updateRFQ, setUpdateRFQ] = useState<RFQ | null>(null);

  if (authState.status === "pending") return <AuthGate variant="signing" />;
  if (connecting || authState.status === "restoring") return <AuthGate variant="restoring" />;
  if (!authenticated) return <Navigate to="/" replace />;

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
    <div className="min-h-screen bg-surface-page text-white dark">
      <a
        href="#main"
        className="sr-only z-[100] rounded-md bg-surface-raised px-4 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <MainNavbar
        currentView={getCurrentView()}
        onNavigate={handleNavigate}
        onCreateRFQ={() => setIsCreateModalOpen(true)}
      />

      <DevConfigPanel />

      {/* Enter-only route transition (no AnimatePresence exit — react-router
          v7 swaps Outlet content synchronously, so exit-freezing is fragile). */}
      <motion.main
        id="main"
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <Outlet context={context} />
      </motion.main>

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
    </div>
  );
}
