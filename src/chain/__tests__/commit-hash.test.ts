import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { buildCommitPreimage, commitHash, sha256 } from "../commitHash";

// The 178-byte commit-hash preimage is a load-bearing, byte-identical contract
// across three repos: ../settlement-engine (on-chain verifier),
// ../liquidity-guard src/main.rs (signer) and src/chain/commitHash.ts (this
// preflight). Layout: salt[64] ‖ rfq[32] ‖ taker[32] ‖ quote_mint[32] ‖
// quote_amount_LE[8] ‖ bond_amount_LE[8] ‖ taker_fee_bps_LE[2].
// The digest below is a known-answer vector computed independently of
// buildCommitPreimage (Buffer.concat + writeBigUInt64LE + node:crypto), so a
// silent layout/endianness regression here fails loudly.

const SALT = new Uint8Array(Array.from({ length: 64 }, (_, i) => i));
const RFQ = new PublicKey(new Uint8Array(32).fill(0xaa));
const TAKER = new PublicKey(new Uint8Array(32).fill(0xbb));
const QUOTE_MINT = new PublicKey(new Uint8Array(32).fill(0xcc));

const FIXTURE = {
  salt: SALT,
  rfq: RFQ,
  taker: TAKER,
  quoteMint: QUOTE_MINT,
  quoteAmount: 0x1122334455667788n,
  bondAmount: 1n,
  takerFeeBps: 0x0102,
};

const EXPECTED_PREIMAGE_HEX =
  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f" +
  "202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f" + // salt 0..63
  "aa".repeat(32) + // rfq
  "bb".repeat(32) + // taker
  "cc".repeat(32) + // quote mint
  "8877665544332211" + // quote_amount u64 LE
  "0100000000000000" + // bond_amount u64 LE
  "0201"; // taker_fee_bps u16 LE

const EXPECTED_SHA256_HEX = "656e5b183aea7915d097e3428d6dd2cd074c0d56359840509d1f64a387ed4588";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

describe("buildCommitPreimage", () => {
  it("produces exactly 178 bytes", () => {
    expect(buildCommitPreimage(FIXTURE).length).toBe(178);
  });

  it("lays out every field at its documented offset", () => {
    const pre = buildCommitPreimage(FIXTURE);
    expect(pre.slice(0, 64)).toEqual(SALT);
    expect(pre.slice(64, 96)).toEqual(RFQ.toBytes());
    expect(pre.slice(96, 128)).toEqual(TAKER.toBytes());
    expect(pre.slice(128, 160)).toEqual(QUOTE_MINT.toBytes());
    // u64 little-endian: lowest byte (0x88 of 0x1122334455667788) first.
    expect(pre[160]).toBe(0x88);
    expect(pre.slice(160, 168)).toEqual(
      new Uint8Array([0x88, 0x77, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11]),
    );
    expect(pre.slice(168, 176)).toEqual(new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0]));
    // u16 little-endian: 0x0102 -> [0x02, 0x01].
    expect(pre.slice(176, 178)).toEqual(new Uint8Array([0x02, 0x01]));
  });

  it("matches the independently-computed preimage hex", () => {
    expect(toHex(buildCommitPreimage(FIXTURE))).toBe(EXPECTED_PREIMAGE_HEX);
  });

  it("rejects a salt that is not 64 bytes", () => {
    expect(() => buildCommitPreimage({ ...FIXTURE, salt: new Uint8Array(63) })).toThrow(
      /Salt must be 64 bytes/,
    );
    expect(() => buildCommitPreimage({ ...FIXTURE, salt: new Uint8Array(65) })).toThrow(
      /Salt must be 64 bytes/,
    );
  });

  it("rejects takerFeeBps outside u16 range", () => {
    expect(() => buildCommitPreimage({ ...FIXTURE, takerFeeBps: -1 })).toThrow(/u16/);
    expect(() => buildCommitPreimage({ ...FIXTURE, takerFeeBps: 0x10000 })).toThrow(/u16/);
  });
});

describe("commitHash", () => {
  it("SHA-256 known-answer vector holds", async () => {
    const { preimage, hash } = await commitHash(FIXTURE);
    expect(toHex(preimage)).toBe(EXPECTED_PREIMAGE_HEX);
    expect(toHex(hash)).toBe(EXPECTED_SHA256_HEX);
  });

  it("sha256 handles subarray views correctly", async () => {
    // The copy inside sha256() must respect byteOffset — hash a view into a
    // larger buffer and compare against hashing a standalone copy.
    const backing = new Uint8Array(200);
    backing.set(buildCommitPreimage(FIXTURE), 11);
    const view = backing.subarray(11, 11 + 178);
    expect(toHex(await sha256(view))).toBe(EXPECTED_SHA256_HEX);
  });
});
