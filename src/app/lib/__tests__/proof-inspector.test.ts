import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { describePreimageSegments, recomputeCommitHash } from "../proof-inspector";
import { bytesToHex, type RevealTicket } from "../reveal-ticket";
import { commitHash } from "@/chain/commitHash";

const SALT = new Uint8Array(Array.from({ length: 64 }, (_, i) => i));
const RFQ = new PublicKey(new Uint8Array(32).fill(0xaa));
const TAKER = new PublicKey(new Uint8Array(32).fill(0xbb));
const MINT = new PublicKey(new Uint8Array(32).fill(0xcc));

const TICKET: RevealTicket = {
  version: 1,
  rfq: RFQ.toBase58(),
  taker: TAKER.toBase58(),
  quoteMint: MINT.toBase58(),
  salt: bytesToHex(SALT),
  quoteAmount: "1234567890",
  bondAmount: "1",
  takerFeeBps: 258, // 0x0102
};

describe("describePreimageSegments", () => {
  it("covers the full 178 bytes contiguously in layout order", () => {
    const segments = describePreimageSegments(TICKET);
    expect(segments.map((s) => s.key)).toEqual([
      "salt",
      "rfq",
      "taker",
      "quoteMint",
      "quoteAmount",
      "bondAmount",
      "takerFeeBps",
    ]);
    let cursor = 0;
    for (const seg of segments) {
      expect(seg.offset).toBe(cursor);
      expect(seg.hex).toHaveLength(seg.length * 2);
      cursor += seg.length;
    }
    expect(cursor).toBe(178);
  });

  it("decodes pubkeys and amounts human-readably", () => {
    const byKey = Object.fromEntries(describePreimageSegments(TICKET).map((s) => [s.key, s]));
    expect(byKey.rfq?.decoded).toBe(RFQ.toBase58());
    expect(byKey.taker?.decoded).toBe(TAKER.toBase58());
    expect(byKey.quoteMint?.decoded).toBe(MINT.toBase58());
    expect(byKey.quoteAmount?.decoded).toBe("1234567890");
    expect(byKey.bondAmount?.decoded).toBe("1");
    expect(byKey.takerFeeBps?.decoded).toBe("258 bps");
    // LE check: 258 = 0x0102 -> bytes 02 01
    expect(byKey.takerFeeBps?.hex).toBe("0201");
  });

  it("segment hex reassembles into the exact preimage", async () => {
    const segments = describePreimageSegments(TICKET);
    const reassembled = segments.map((s) => s.hex).join("");
    const { preimageHex } = await recomputeCommitHash(TICKET);
    expect(reassembled).toBe(preimageHex);
  });
});

describe("recomputeCommitHash", () => {
  it("matches src/chain/commitHash.ts on the same inputs", async () => {
    const { hashHex } = await recomputeCommitHash(TICKET);
    const direct = await commitHash({
      salt: SALT,
      rfq: RFQ,
      taker: TAKER,
      quoteMint: MINT,
      quoteAmount: 1234567890n,
      bondAmount: 1n,
      takerFeeBps: 258,
    });
    expect(hashHex).toBe(bytesToHex(direct.hash));
  });

  it("throws on a corrupt salt", async () => {
    await expect(recomputeCommitHash({ ...TICKET, salt: "zz" })).rejects.toThrow();
  });
});
