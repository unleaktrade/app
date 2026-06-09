import { PublicKey } from "@solana/web3.js";

export type Cluster = "devnet" | "mainnet-beta" | "localnet";

const CLUSTERS: readonly Cluster[] = ["devnet", "mainnet-beta", "localnet"] as const;

function requireString(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  if (!value) throw new Error(`Missing required env var: ${String(key)}`);
  return value;
}

function requirePublicKey(key: keyof ImportMetaEnv): PublicKey {
  const raw = requireString(key);
  try {
    return new PublicKey(raw);
  } catch (cause) {
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
  programId: requirePublicKey("VITE_SETTLEMENT_PROGRAM_ID"),
  usdcMint: requirePublicKey("VITE_USDC_MINT"),
  // liquidity-guard URLs are per-cluster and live only in the Vite proxy config
  // (vite.config.ts, VITE_LG_URL_*). The client always calls the same-origin
  // proxy path /liquidity-guard/<cluster>/* — never a raw URL — so no client env.
} as const;
