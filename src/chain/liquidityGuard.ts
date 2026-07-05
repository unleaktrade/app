// Client for the liquidity-guard attestation service.
//
// In dev, requests go through the Vite dev-server proxy at /liquidity-guard/*
// so the browser sees same-origin (see vite.config.ts server.proxy). In a
// production build there is no dev server, so we call the upstream Heroku
// instance directly — the Rust service at ../liquidity-guard now serves
// permissive CORS (allow_any_origin), which makes the cross-origin call safe.

import type { PublicKey } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import nacl from "tweetnacl";
import type { Cluster } from "@/chain/env";

// Resolved per-cluster upstream URLs, injected at build time by vite.config.ts
// (env overrides merged over the Heroku defaults). Public, keyless URLs.
declare const __LG_TARGETS__: Record<"localnet" | "devnet" | "mainnet", string>;

// Each cluster has its own liquidity-guard upstream. We route by the active
// cluster so a devnet session hits the devnet guard, mainnet hits mainnet, etc.
const BASE_PATH = "/liquidity-guard";

function lgUrl(cluster: Cluster, endpoint: "health" | "check"): string {
  const segment = cluster === "mainnet-beta" ? "mainnet" : cluster;
  // Dev: same-origin proxy path. Prod: absolute upstream (no proxy exists).
  if (import.meta.env.DEV) {
    return `${BASE_PATH}/${segment}/${endpoint}`;
  }
  const target = __LG_TARGETS__[segment].replace(/\/$/, "");
  return `${target}/${endpoint}`;
}

export interface AttestationRequest {
  rfq: PublicKey;
  taker: PublicKey;
  salt: Uint8Array; // 64B ed25519 sig from deriveSalt()
  quoteMint: PublicKey;
  quoteAmount: bigint;
  bondAmount: bigint;
  takerFeeBps: number;
}

export interface AttestationResponse {
  commitHash: Uint8Array;
  liquidityProof: Uint8Array;
  servicePubkey: string;
  network: string;
  skipFundChecks: boolean;
  timestamp: number;
}

export interface HealthResponse {
  status: string;
  network: string;
  servicePubkey: string;
  timestamp: number;
  skipFundChecks: boolean;
}

export class LiquidityGuardError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "LiquidityGuardError";
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error(`hex string has odd length: ${hex.length}`);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    // Guard malformed hex: parseInt returns NaN, which would silently coerce to
    // a 0 byte and misattribute a later commit-hash / signature mismatch.
    if (Number.isNaN(byte)) throw new Error(`invalid hex at offset ${i * 2}`);
    out[i] = byte;
  }
  return out;
}

const RETRY_DELAYS_MS = [300, 900, 2700] as const;

export async function deriveSalt(wallet: WalletContextState, rfq: PublicKey): Promise<Uint8Array> {
  if (!wallet.signMessage) {
    throw new LiquidityGuardError(0, "Wallet does not support signMessage");
  }
  const signature = await wallet.signMessage(rfq.toBytes());
  if (signature.length !== 64) {
    throw new LiquidityGuardError(0, `Expected 64-byte signature, got ${signature.length}`);
  }
  return signature;
}

async function postCheckOnce(
  cluster: Cluster,
  req: AttestationRequest,
  opts?: { signal?: AbortSignal },
): Promise<Response> {
  const body = {
    rfq: req.rfq.toBase58(),
    taker: req.taker.toBase58(),
    salt: toHex(req.salt),
    quote_mint: req.quoteMint.toBase58(),
    quote_amount: req.quoteAmount.toString(),
    bond_amount_usdc: req.bondAmount.toString(),
    taker_fee_bps: String(req.takerFeeBps),
  };
  return fetch(lgUrl(cluster, "check"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
}

export async function fetchAttestation(
  cluster: Cluster,
  req: AttestationRequest,
  opts?: { signal?: AbortSignal },
): Promise<AttestationResponse> {
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    const res = await postCheckOnce(cluster, req, opts);
    if (res.ok) {
      const data = (await res.json()) as {
        commit_hash: string;
        liquidity_proof: string;
        service_pubkey: string;
        network: string;
        skip_fund_checks: boolean;
        timestamp: number;
      };
      return {
        commitHash: fromHex(data.commit_hash),
        liquidityProof: fromHex(data.liquidity_proof),
        servicePubkey: data.service_pubkey,
        network: data.network,
        skipFundChecks: data.skip_fund_checks,
        timestamp: data.timestamp,
      };
    }
    lastResponse = res;
    if (res.status !== 429 || attempt === RETRY_DELAYS_MS.length) break;
    await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
  }
  const fallback = lastResponse;
  if (!fallback) throw new LiquidityGuardError(0, "liquidity-guard request failed");
  const errorBody = await fallback.text();
  let message = errorBody;
  try {
    const parsed = JSON.parse(errorBody) as { error?: string };
    if (parsed.error) message = parsed.error;
  } catch {
    // fallthrough: use raw text
  }
  throw new LiquidityGuardError(fallback.status, message || `HTTP ${fallback.status}`);
}

// The expected pubkey is the on-chain `Config.liquidity_guard` value (read via
// useConfigAccount). We do not pin a separate copy in env — the chain is the
// source of truth, and `/health.service_pubkey` can be cross-checked against it
// for drift (see HealthPill).
export function verifyAttestation(
  commitHash: Uint8Array,
  liquidityProof: Uint8Array,
  liquidityGuardPubkey: PublicKey,
): boolean {
  return nacl.sign.detached.verify(commitHash, liquidityProof, liquidityGuardPubkey.toBytes());
}

export async function fetchHealth(
  cluster: Cluster,
  opts?: { signal?: AbortSignal },
): Promise<HealthResponse> {
  const res = await fetch(lgUrl(cluster, "health"), { signal: opts?.signal });
  if (!res.ok) throw new LiquidityGuardError(res.status, `HTTP ${res.status}`);
  const data = (await res.json()) as {
    status: string;
    network: string;
    service_pubkey: string;
    timestamp: number;
    skip_fund_checks: boolean;
  };
  return {
    status: data.status,
    network: data.network,
    servicePubkey: data.service_pubkey,
    timestamp: data.timestamp,
    skipFundChecks: data.skip_fund_checks,
  };
}
