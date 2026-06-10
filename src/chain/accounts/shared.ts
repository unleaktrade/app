import { PublicKey } from "@solana/web3.js";
import type { BN } from "@coral-xyz/anchor";
import { z } from "zod";
import type { RFQState } from "@/types/rfq";

// ---------------------------------------------------------------------------
// Zod atoms shared by every account schema. The Anchor Borsh coder owns byte
// layout; these schemas validate the *normalised* shape so IDL drift or a
// garbage decode fails loudly instead of rendering nonsense.
// ---------------------------------------------------------------------------

export const publicKeySchema = z.instanceof(PublicKey);
export const u64AmountSchema = z.bigint().nonnegative();
export const unixSecondsSchema = z.number().int();
export const bpsSchema = z.number().int().min(0).max(65_535);
export const u16Schema = z.number().int().min(0).max(65_535);
export const u32Schema = z.number().int().min(0).max(4_294_967_295);
export const bumpSchema = z.number().int().min(0).max(255);

export function bytesSchema(length: number) {
  return z
    .instanceof(Uint8Array)
    .refine((value) => value.length === length, `expected ${length} bytes`);
}

// Mirrors the Rust discriminant order in state/rfq.rs (Draft=0 … Incomplete=8);
// asserted against the committed IDL in a unit test.
export const RFQ_STATES = [
  "Draft",
  "Open",
  "Committed",
  "Revealed",
  "Selected",
  "Settled",
  "Ignored",
  "Expired",
  "Incomplete",
] as const satisfies readonly RFQState[];

export const rfqStateSchema = z.enum(RFQ_STATES);

// Anchor decodes a Rust unit enum as a single-key object: { draft: {} }.
// Mapping by variant *name* (not index) is immune to discriminant reordering.
export type AnchorRfqState = Record<string, unknown>;

const RFQ_STATE_FROM_ANCHOR: Readonly<Record<string, RFQState>> = {
  draft: "Draft",
  open: "Open",
  committed: "Committed",
  revealed: "Revealed",
  selected: "Selected",
  settled: "Settled",
  ignored: "Ignored",
  expired: "Expired",
  incomplete: "Incomplete",
};

export function rfqStateFromAnchor(raw: AnchorRfqState): RFQState {
  const keys = Object.keys(raw);
  const variant = keys.length === 1 ? keys[0] : undefined;
  const state = variant !== undefined ? RFQ_STATE_FROM_ANCHOR[variant] : undefined;
  if (state === undefined) {
    throw new Error(`Unknown RfqState variant: ${JSON.stringify(raw)}`);
  }
  return state;
}

// ---------------------------------------------------------------------------
// Converters from the raw values Anchor's coder hands back.
// ---------------------------------------------------------------------------

/** u64 amounts can exceed 2^53 — always carry them as bigint. */
export function toBigInt(value: BN): bigint {
  return BigInt(value.toString());
}

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/** i64 unix timestamps fit comfortably in a JS number; range-checked anyway. */
export function toUnixSeconds(value: BN): number {
  const wide = BigInt(value.toString());
  if (wide > MAX_SAFE || wide < -MAX_SAFE) {
    throw new Error(`timestamp out of safe number range: ${wide}`);
  }
  return Number(wide);
}

/** Fixed [u8; N] arrays decode as number[] (or Uint8Array depending on path). */
export function toBytes(value: number[] | Uint8Array): Uint8Array {
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

export function mapNullable<T, U>(value: T | null, map: (value: T) => U): U | null {
  return value === null ? null : map(value);
}
