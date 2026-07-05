import type { ComponentType } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import { WalletConnect } from "@/app/components/WalletConnect";
import { AuthGate } from "@/app/components/AuthGate";
import { DashboardLayout } from "@/app/components/DashboardLayout";
import { MarketplaceWrapper } from "@/app/components/MarketplaceWrapper";

// The shell (DashboardLayout) and the index Marketplace stay eager so the first
// dashboard paint needs no extra round-trip. The secondary screens are
// route-`lazy` so their heavy, route-local deps (recharts, html-to-image,
// qrcode) land in async chunks instead of the entry bundle — see the bundle
// budget in scripts/bundle-budget.json.
function lazyScreen<M extends Record<string, unknown>>(
  loader: () => Promise<M>,
  pick: (m: M) => ComponentType,
) {
  return async () => ({ Component: pick(await loader()) });
}

function RootRedirect() {
  const { authenticated, state } = useAuth();
  if (authenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  // Hold a branded interstitial while an eager reconnect or the signMessage
  // prompt is in flight so we don't flash the connect screen (and trigger
  // WalletConnect's select(null) reset) mid-restore.
  if (state.status === "restoring") {
    return <AuthGate variant="restoring" />;
  }
  if (state.status === "pending") {
    return <AuthGate variant="signing" />;
  }
  return <WalletConnect />;
}

// Shown during the initial load of a lazy route (e.g. a deep link straight to
// /dashboard/my-activity) so a direct hit renders the branded surface rather
// than a blank frame while the chunk fetches. In-app navigation keeps the
// current UI mounted during the lazy fetch, so this only covers cold deep links.
function RouteFallback() {
  return (
    <div className="min-h-dvh bg-surface-page" aria-hidden="true">
      <div className="flex min-h-dvh items-center justify-center">
        <div className="skeleton-shimmer h-10 w-10 rounded-full" />
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootRedirect />,
  },
  {
    path: "/dashboard",
    Component: DashboardLayout,
    HydrateFallback: RouteFallback,
    children: [
      {
        index: true,
        Component: MarketplaceWrapper,
      },
      {
        path: "my-activity",
        lazy: lazyScreen(
          () => import("@/app/components/MyActivity"),
          (m) => m.MyActivity,
        ),
      },
      {
        path: "transparency",
        lazy: lazyScreen(
          () => import("@/app/components/Transparency"),
          (m) => m.Transparency,
        ),
      },
      {
        path: "rfq/:rfqId",
        lazy: lazyScreen(
          () => import("@/app/components/RFQDetailWrapper"),
          (m) => m.RFQDetailWrapper,
        ),
      },
      // Flat, role-free taker cockpits (the /my-quotes subtree is deleted per #10).
      {
        path: "quote/:quoteId/reveal",
        lazy: lazyScreen(
          () => import("@/app/components/RevealQuoteWrapper"),
          (m) => m.RevealQuoteWrapper,
        ),
      },
      {
        path: "quote/:quoteId/settle",
        lazy: lazyScreen(
          () => import("@/app/components/SettleQuoteWrapper"),
          (m) => m.SettleQuoteWrapper,
        ),
      },
    ],
  },
  // DEV-only component gallery (stands in for Storybook/Ladle — see #12).
  ...(import.meta.env.DEV
    ? [
        {
          path: "/dev/stories",
          lazy: lazyScreen(
            () => import("@/app/components/ComponentStories"),
            (m) => m.ComponentStories,
          ),
        },
      ]
    : []),
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
