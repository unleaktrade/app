// Dev-only Wallet Standard wallet(s) backed by local devnet keypairs, so
// automated browser testing (and local dev without a real extension) can
// drive wallet-gated flows end-to-end. Registered via the standard
// `wallet-standard:register-wallet` handshake, the same one Phantom/Solflare
// use — SWA's `WalletProvider wallets={[]}` auto-discovers it exactly like a
// real extension, so nothing in WalletProviders.tsx/AuthProvider.tsx changes.
//
// Only imported when import.meta.env.DEV is true (see main.tsx), and
// __DEV_WALLETS__ (injected by vite.config.ts) is empty unless
// DEV_WALLET_KEYPAIR_DIR pointed at a folder of Solana CLI keypair JSON files
// when `npm run dev` started — vite.config.ts only reads that env var for the
// dev server (never `vite build`), so this can't leak into a production
// bundle even if the env var is set by mistake.
import { Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
import nacl from "tweetnacl";

declare const __DEV_WALLETS__: { label: string; secretKey: number[] }[];

const SOLANA_CHAINS = ["solana:mainnet", "solana:devnet", "solana:testnet"] as const;

const DEV_WALLET_ICON =
  "data:image/svg+xml;base64," +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">' +
      '<rect width="96" height="96" rx="20" fill="#f59e0b"/>' +
      '<text x="48" y="66" font-size="48" text-anchor="middle" fill="#000">D</text></svg>',
  );

// The Wallet Standard registration handshake (window event + late-listener
// fallback for wallets that load after the app). Hand-rolled instead of
// depending on @wallet-standard/wallet to keep this dev-only feature at zero
// added npm dependencies.
class RegisterWalletEvent extends Event {
  readonly detail: (api: { register: (...wallets: unknown[]) => void }) => void;
  constructor(callback: (api: { register: (...wallets: unknown[]) => void }) => void) {
    super("wallet-standard:register-wallet", {
      bubbles: false,
      cancelable: false,
      composed: false,
    });
    this.detail = callback;
  }
}

function registerWallet(wallet: unknown): void {
  const callback = ({ register }: { register: (...wallets: unknown[]) => void }) =>
    register(wallet);
  try {
    window.dispatchEvent(new RegisterWalletEvent(callback));
  } catch (error) {
    console.error("[dev-wallet] register-wallet dispatch failed", error);
  }
  try {
    window.addEventListener("wallet-standard:app-ready", ((event: CustomEvent) =>
      callback(event.detail)) as EventListener);
  } catch (error) {
    console.error("[dev-wallet] app-ready listener failed", error);
  }
}

function makeDevWallet(label: string, secretKey: number[]) {
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  const account = {
    address: keypair.publicKey.toBase58(),
    publicKey: keypair.publicKey.toBytes(),
    chains: SOLANA_CHAINS,
    features: ["solana:signMessage", "solana:signTransaction"] as const,
    label: `Dev: ${label}`,
  };

  // Wallet Standard's solana:signTransaction already accepts/returns arrays,
  // so wallet-adapter's StandardWalletAdapter synthesizes signAllTransactions
  // from it too — no separate feature needed.
  function signTransactionBytes(bytes: Uint8Array): Uint8Array {
    try {
      const tx = VersionedTransaction.deserialize(bytes);
      tx.sign([keypair]);
      return tx.serialize();
    } catch {
      const tx = Transaction.from(bytes);
      tx.partialSign(keypair);
      return tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    }
  }

  return {
    version: "1.0.0" as const,
    name: `Dev: ${label}`,
    icon: DEV_WALLET_ICON,
    chains: SOLANA_CHAINS,
    accounts: [account],
    features: {
      "standard:connect": {
        version: "1.0.0",
        connect: async () => ({ accounts: [account] }),
      },
      "standard:disconnect": {
        version: "1.0.0",
        disconnect: async () => {},
      },
      "standard:events": {
        version: "1.0.0",
        on: (_event: string, _listener: (props: Record<string, unknown>) => void) => () => {},
      },
      "solana:signMessage": {
        version: "1.0.0",
        signMessage: async (...inputs: { message: Uint8Array }[]) =>
          inputs.map(({ message }) => ({
            signedMessage: message,
            signature: nacl.sign.detached(message, keypair.secretKey),
          })),
      },
      "solana:signTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0] as const,
        signTransaction: async (...inputs: { transaction: Uint8Array }[]) =>
          inputs.map(({ transaction }) => ({
            signedTransaction: signTransactionBytes(transaction),
          })),
      },
    },
  };
}

for (const { label, secretKey } of __DEV_WALLETS__) {
  registerWallet(makeDevWallet(label, secretKey));
  console.info(
    `[dev-wallet] registered "Dev: ${label}" — DEV ONLY, never present in production builds`,
  );
}
