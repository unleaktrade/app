import { createBrowserRouter, Navigate } from "react-router";
import { WalletConnect } from "@/app/components/WalletConnect";
import { DashboardLayout } from "@/app/components/DashboardLayout";
import { MarketplaceWrapper } from "@/app/components/MarketplaceWrapper";
import { MyRFQsWrapper } from "@/app/components/MyRFQsWrapper";
import { MyQuotesWrapper } from "@/app/components/MyQuotesWrapper";
import { MyEarningsWrapper } from "@/app/components/MyEarningsWrapper";
import { RFQDetailWrapper } from "@/app/components/RFQDetailWrapper";
import { TestPage } from "@/app/components/TestPage";

// Simple wallet connection state (in production, this would be handled by a context/provider)
let isWalletConnected = false;

export const setWalletConnected = (connected: boolean) => {
  isWalletConnected = connected;
};

export const getWalletConnected = () => isWalletConnected;

// Root component that handles wallet connection check
function RootRedirect() {
  if (isWalletConnected) {
    return <Navigate to="/dashboard" replace />;
  }
  return <WalletConnect onConnect={() => {
    setWalletConnected(true);
    window.location.href = "/dashboard";
  }} />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootRedirect />,
  },
  {
    path: "/test",
    element: <TestPage />,
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
        path: "my-rfqs",
        Component: MyRFQsWrapper,
      },
      {
        path: "my-quotes",
        Component: MyQuotesWrapper,
      },
      {
        path: "my-earnings",
        Component: MyEarningsWrapper,
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