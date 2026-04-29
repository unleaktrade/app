import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { ClusterProvider, useCluster } from "@/app/providers/ClusterProvider";
import { QueryProvider } from "@/app/providers/QueryProvider";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { endpointFor } from "@/chain/cluster";

interface WalletProvidersProps {
  children: ReactNode;
}

function InnerProviders({ children }: WalletProvidersProps) {
  const { cluster } = useCluster();
  const endpoint = useMemo(() => endpointFor(cluster), [cluster]);

  // autoConnect stays OFF. It wedges SWA when a previously-connected wallet is
  // locked (Connection rejected on load). The Phase 1 signMessage gate in
  // AuthProvider provides the real "wallet is usable" proof instead.
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect={false}>
        <WalletModalProvider>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function WalletProviders({ children }: WalletProvidersProps) {
  return (
    <ClusterProvider>
      <InnerProviders>{children}</InnerProviders>
    </ClusterProvider>
  );
}
