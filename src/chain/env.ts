import { PublicKey } from "@solana/web3.js";
import idlJson from "@/chain/idl/settlement_engine.json";

export type Cluster = "devnet" | "mainnet-beta" | "localnet";

const CLUSTERS: readonly Cluster[] = ["devnet", "mainnet-beta", "localnet"] as const;

// Defaults keep an unconfigured deploy bootable (e.g. a Vercel preview with no
// project env vars) instead of dying at module eval with a white screen.
// The program id ships inside the committed IDL (same id on devnet/localnet);
// the USDC mint default matches the devnet default cluster.
const DEFAULT_PROGRAM_ID = (idlJson as { address: string }).address;
const DEFAULT_USDC_MINT = "5jBqJmY2mKetudVa2XaC8U6UN2BNNirDiTnDEuA6pdyR";

function publicKeyOr(key: keyof ImportMetaEnv, fallback: string): PublicKey {
  const raw = import.meta.env[key];
  if (!raw) {
    console.warn(`[env] ${String(key)} not set — falling back to ${fallback}`);
    return new PublicKey(fallback);
  }
  try {
    return new PublicKey(raw);
  } catch (cause) {
    // An explicitly-set but invalid value is a misconfiguration — fail loudly
    // rather than silently trading it for the default.
    throw new Error(`Env var ${String(key)} is not a valid base58 public key`, { cause });
  }
}

function readCluster(): Cluster {
  const raw = import.meta.env.VITE_SOLANA_CLUSTER;
  if (raw && CLUSTERS.includes(raw)) return raw;
  return "devnet";
}

export const env = {
  defaultCluster: readCluster(),
  rpcUrl: {
    devnet: import.meta.env.VITE_RPC_URL_DEVNET,
    "mainnet-beta": import.meta.env.VITE_RPC_URL_MAINNET,
    localnet: import.meta.env.VITE_RPC_URL_LOCALNET,
  } satisfies Partial<Record<Cluster, string | undefined>>,
  programId: publicKeyOr("VITE_SETTLEMENT_PROGRAM_ID", DEFAULT_PROGRAM_ID),
  usdcMint: publicKeyOr("VITE_USDC_MINT", DEFAULT_USDC_MINT),
  // liquidity-guard URLs are per-cluster and live only in the Vite proxy config
  // (vite.config.ts, VITE_LG_URL_*). The client always calls the same-origin
  // proxy path /liquidity-guard/<cluster>/* — never a raw URL — so no client env.
} as const;
