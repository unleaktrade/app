import { useState } from "react";
import { Navigate, Outlet, useNavigate, useLocation } from "react-router";
import { useWallet } from "@solana/wallet-adapter-react";
import { X } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useCluster } from "@/app/providers/ClusterProvider";
import { useConfigAccount } from "@/chain/accounts/config";
import { useTokenBalanceState } from "@/app/hooks/useTokenBalanceState";
import { resolveTokenMeta } from "@/app/lib/tokens";
import { AuthGate } from "@/app/components/AuthGate";
import { MainNavbar, type DashboardView } from "@/app/components/MainNavbar";
import { CreateRFQModal } from "@/app/components/CreateRFQModal";
import { UpdateRFQModal } from "@/app/components/UpdateRFQModal";
import { SubmitQuoteModal } from "@/app/components/SubmitQuoteModal";
import { DevConfigPanel } from "@/app/components/DevConfigPanel";
import { BetaTokenNotice } from "@/app/components/BetaTokenNotice";
import type { RFQ } from "@/types/rfq";

const BETA_NOTICE_DISMISSED_KEY = "unleak.betaTokenNotice.dismissed";

/**
 * Slim dismissible strip (#67) shown when the connected wallet holds no beta
 * devnet USDC yet (no ATA or zero balance). Nothing renders on loading/error —
 * an unreadable balance is never treated as an empty one. sessionStorage keeps
 * the dismissal for the tab session only, so a fresh visit re-surfaces it.
 * Margin trick: the strip sits before <main> whose PageShell pads by --nav-h,
 * so it offsets itself below the fixed navbar and gives the height back.
 */
function BetaTokenBanner() {
  const { connected } = useWallet();
  const { cluster } = useCluster();
  const configQuery = useConfigAccount();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(BETA_NOTICE_DISMISSED_KEY) === "1",
  );

  const usdcMint = configQuery.data?.usdcMint ?? null;
  const state = useTokenBalanceState(cluster === "devnet" ? usdcMint : null);

  if (dismissed || !connected || !usdcMint || cluster !== "devnet") return null;
  if (state.status !== "no-ata" && state.status !== "zero") return null;

  const meta = resolveTokenMeta(usdcMint.toBase58());
  return (
    <div className="relative z-30 mx-auto mt-(--nav-h) -mb-(--nav-h) w-full max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
      <div className="relative">
        <BetaTokenNotice
          state={state}
          cluster={cluster}
          symbol={meta.symbol}
          decimals={meta.decimals}
          variant="inline"
          className="pr-10"
        />
        <button
          type="button"
          aria-label="Dismiss beta token notice"
          onClick={() => {
            sessionStorage.setItem(BETA_NOTICE_DISMISSED_KEY, "1");
            setDismissed(true);
          }}
          className="absolute top-2 right-2 flex h-11 w-11 items-center justify-center rounded-md text-amber-200/70 hover:bg-amber-500/10 hover:text-amber-100"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

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
    location.pathname.includes("/my-activity")
      ? "my-activity"
      : location.pathname.includes("/transparency")
        ? "transparency"
        : "marketplace";

  const handleNavigate = (view: DashboardView) => {
    navigate(view === "marketplace" ? "/dashboard" : `/dashboard/${view}`);
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

      <BetaTokenBanner />

      {/* Enter-only route transition. CSS-driven (tw-animate-css) on purpose:
          a compositor animation always runs to completion, so content can
          never be left hidden by a stalled JS tween; `motion-safe:` skips it
          under prefers-reduced-motion; the pathname key remounts the element
          so the animation replays on every route change. No exit animation —
          react-router v7 swaps Outlet content synchronously. */}
      <main
        id="main"
        key={location.pathname}
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200"
      >
        <Outlet context={context} />
      </main>

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
