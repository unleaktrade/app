// Client for the liquidity-guard attestation service.
//
// All requests go through the Vite dev-server proxy at /liquidity-guard/* so
// the browser sees same-origin in dev. In production the service must be
// reachable same-origin or a CORS-enabled reverse proxy must be deployed —
// the upstream Rust service at ../liquidity-guard sets no CORS headers.

import type { PublicKey } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import nacl from "tweetnacl";

const BASE_PATH = "/liquidity-guard";

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
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
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
  return fetch(`${BASE_PATH}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
}

export async function fetchAttestation(
  req: AttestationRequest,
  opts?: { signal?: AbortSignal },
): Promise<AttestationResponse> {
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    const res = await postCheckOnce(req, opts);
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

export async function fetchHealth(opts?: { signal?: AbortSignal }): Promise<HealthResponse> {
  const res = await fetch(`${BASE_PATH}/health`, { signal: opts?.signal });
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
