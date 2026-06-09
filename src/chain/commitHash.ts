import type { PublicKey } from "@solana/web3.js";

export interface CommitPreimageInput {
  salt: Uint8Array; // 64B ed25519 signature, from deriveSalt()
  rfq: PublicKey;
  taker: PublicKey;
  quoteMint: PublicKey;
  quoteAmount: bigint;
  bondAmount: bigint;
  takerFeeBps: number;
}

const PREIMAGE_LEN = 64 + 32 + 32 + 32 + 8 + 8 + 2; // 186

function writeU64LE(view: DataView, offset: number, value: bigint): void {
  view.setBigUint64(offset, value, true);
}

function writeU16LE(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

export function buildCommitPreimage(input: CommitPreimageInput): Uint8Array {
  if (input.salt.length !== 64) {
    throw new Error(`Salt must be 64 bytes, got ${input.salt.length}`);
  }
  if (input.takerFeeBps < 0 || input.takerFeeBps > 0xffff) {
    throw new Error(`takerFeeBps out of u16 range: ${input.takerFeeBps}`);
  }
  const out = new Uint8Array(PREIMAGE_LEN);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  let off = 0;
  out.set(input.salt, off);
  off += 64;
  out.set(input.rfq.toBytes(), off);
  off += 32;
  out.set(input.taker.toBytes(), off);
  off += 32;
  out.set(input.quoteMint.toBytes(), off);
  off += 32;
  writeU64LE(view, off, input.quoteAmount);
  off += 8;
  writeU64LE(view, off, input.bondAmount);
  off += 8;
  writeU16LE(view, off, input.takerFeeBps);
  off += 2;
  if (off !== PREIMAGE_LEN) throw new Error("preimage length mismatch");
  return out;
}

export async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  // SubtleCrypto's BufferSource typing rejects Uint8Array<ArrayBufferLike>; copy
  // the view into a fresh ArrayBuffer-backed Uint8Array to satisfy the type.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return new Uint8Array(digest);
}

export async function commitHash(
  input: CommitPreimageInput,
): Promise<{ preimage: Uint8Array; hash: Uint8Array }> {
  const preimage = buildCommitPreimage(input);
  const hash = await sha256(preimage);
  return { preimage, hash };
}
