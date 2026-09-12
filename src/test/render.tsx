// RTL render wrapped in the app providers a shared component may depend on
// (router for <Link>, ClusterProvider for explorer links / metadata, a fresh
// QueryClient for hooks). Wallet-adapter contexts are NOT included — mock
// `@solana/wallet-adapter-react` per suite as useTokenBalanceState.test.tsx does.

import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { ClusterProvider } from "@/app/providers/ClusterProvider";
import type { Cluster } from "@/chain/env";

interface ProviderOptions extends Omit<RenderOptions, "wrapper"> {
  /** Persisted cluster the provider boots with (default devnet). */
  cluster?: Cluster;
  /** Initial router location. */
  route?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  { cluster = "devnet", route = "/", ...options }: ProviderOptions = {},
): RenderResult {
  window.localStorage.setItem("unleak.cluster", cluster);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <ClusterProvider>{children}</ClusterProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...options });
}
