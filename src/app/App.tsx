import { RouterProvider } from "react-router";
import { router } from "@/app/routes";
import { WalletProviders } from "@/app/providers/WalletProviders";
import { AppShell } from "@/app/AppShell";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <AppShell>
        <WalletProviders>
          <RouterProvider router={router} />
        </WalletProviders>
      </AppShell>
    </ErrorBoundary>
  );
}

export default App;
