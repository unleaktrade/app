import { createBrowserRouter, Navigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import { WalletConnect } from "@/app/components/WalletConnect";
import { DashboardLayout } from "@/app/components/DashboardLayout";
import { MarketplaceWrapper } from "@/app/components/MarketplaceWrapper";
import { MyActivity } from "@/app/components/MyActivity";
import { RFQDetailWrapper } from "@/app/components/RFQDetailWrapper";

function RootRedirect() {
  const { authenticated } = useAuth();
  if (authenticated) {
    return <Navigate to="/dashboard" replace />;
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
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
