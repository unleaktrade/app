import { RouterProvider } from "react-router";
import { MotionConfig } from "motion/react";
import { router } from "@/app/routes";
import { WalletProviders } from "@/app/providers/WalletProviders";
import { AppShell } from "@/app/AppShell";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <AppShell>
        <MotionConfig reducedMotion="user">
          <WalletProviders>
            <RouterProvider router={router} />
          </WalletProviders>
        </MotionConfig>
      </AppShell>
    </ErrorBoundary>
  );
}

export default App;
