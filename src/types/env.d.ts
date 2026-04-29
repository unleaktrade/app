/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOLANA_CLUSTER?: "devnet" | "mainnet-beta" | "localnet";
  readonly VITE_RPC_URL_DEVNET?: string;
  readonly VITE_RPC_URL_MAINNET?: string;
  readonly VITE_RPC_URL_LOCALNET?: string;
  readonly VITE_SETTLEMENT_PROGRAM_ID: string;
  readonly VITE_USDC_MINT: string;
  readonly VITE_LIQUIDITY_GUARD_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
