import { useMemo, type ReactNode } from "react";
import { clusterApiUrl } from "@solana/web3.js";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

interface WalletProvidersProps {
  children: ReactNode;
}

export function WalletProviders({ children }: WalletProvidersProps) {
  const endpoint = useMemo(() => clusterApiUrl("devnet"), []);

  // autoConnect is intentionally OFF. It wedges SWA when a previously-connected
  // wallet is locked: the adapter reports Connection rejected on page load and the
  // state gets stuck, so a subsequent manual click (the "Select Wallet" modal) hangs
  // at "Connecting…" without ever triggering the extension popup. Requiring an
  // explicit user click every session is the trade the Solana ecosystem converged
  // on (Jupiter/Raydium behave the same). Re-visit in Phase 1 (#11) with the
  // useSettlementProgram hook and proper error handling around connect rejections.
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
