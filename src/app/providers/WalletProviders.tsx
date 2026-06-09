import { useCallback, useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { ClusterProvider, useCluster } from "@/app/providers/ClusterProvider";
import { QueryProvider } from "@/app/providers/QueryProvider";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { hasCachedAuthSession } from "@/app/providers/authSession";
import { endpointFor } from "@/chain/cluster";

interface WalletProvidersProps {
  children: ReactNode;
}

function InnerProviders({ children }: WalletProvidersProps) {
  const { cluster } = useCluster();
  const endpoint = useMemo(() => endpointFor(cluster), [cluster]);

  // Scoped autoConnect: eagerly reconnect ONLY when this tab session was already
  // authenticated (a signMessage signature is cached in sessionStorage). A fresh
  // tab / first visit returns false, so SWA never eager-connects on a cold load —
  // that keeps the locked-wallet wedge (#26, "Connection rejected") and the
  // swallowed first-click gesture fixed. SWA catches eager-connect errors and
  // falls back to the connect screen, so a locked wallet on refresh can't wedge.
  // sessionStorage surviving refresh but not tab-close gives us "refresh stays
  // signed in" while preserving "close tab = re-prompt".
  const autoConnect = useCallback(() => Promise.resolve(hasCachedAuthSession()), []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect={autoConnect}>
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
