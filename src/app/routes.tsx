import { createBrowserRouter, Navigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import { WalletConnect } from "@/app/components/WalletConnect";
import { AuthGate } from "@/app/components/AuthGate";
import { DashboardLayout } from "@/app/components/DashboardLayout";
import { MarketplaceWrapper } from "@/app/components/MarketplaceWrapper";
import { MyActivity } from "@/app/components/MyActivity";
import { RFQDetailWrapper } from "@/app/components/RFQDetailWrapper";
import { ComponentStories } from "@/app/components/ComponentStories";

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

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootRedirect />,
  },
  {
    path: "/dashboard",
    Component: DashboardLayout,
    children: [
      {
        index: true,
        Component: MarketplaceWrapper,
      },
      {
        path: "my-activity",
        Component: MyActivity,
      },
      {
        path: "rfq/:rfqId",
        Component: RFQDetailWrapper,
      },
    ],
  },
  // DEV-only component gallery (stands in for Storybook/Ladle — see #12).
  ...(import.meta.env.DEV
    ? [
        {
          path: "/dev/stories",
          Component: ComponentStories,
        },
      ]
    : []),
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
