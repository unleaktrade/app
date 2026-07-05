import { PublicKey } from "@solana/web3.js";
import { buildCommitPreimage, commitHash } from "@/chain/commitHash";
import { hexToBytes, bytesToHex, type RevealTicket } from "@/app/lib/reveal-ticket";

// Pure layout logic for the liquidity-guard proof inspector (issue #16).
// Splits the 178-byte commit-hash preimage into its documented segments so the
// UI can render an offset-annotated hex map, and recomputes the SHA-256
// locally so a taker can verify their own commitment without trusting the
// service. Layout (must stay byte-identical across settlement-engine /
// liquidity-guard / commitHash.ts): salt[64] ‖ rfq[32] ‖ taker[32] ‖
// quote_mint[32] ‖ quote_amount_LE[8] ‖ bond_amount_LE[8] ‖ taker_fee_bps_LE[2].

export type PreimageSegmentKey =
  "salt" | "rfq" | "taker" | "quoteMint" | "quoteAmount" | "bondAmount" | "takerFeeBps";

export interface PreimageSegment {
  key: PreimageSegmentKey;
  label: string;
  /** Absolute byte offset into the 178-byte preimage. */
  offset: number;
  /** Segment length in bytes. */
  length: number;
  hex: string;
  /** Human-readable decoded value (base58 pubkey, decimal amount, bps). */
  decoded: string;
}

function ticketPreimage(ticket: RevealTicket): Uint8Array {
  return buildCommitPreimage({
    salt: hexToBytes(ticket.salt),
    rfq: new PublicKey(ticket.rfq),
    taker: new PublicKey(ticket.taker),
    quoteMint: new PublicKey(ticket.quoteMint),
    quoteAmount: BigInt(ticket.quoteAmount),
    bondAmount: BigInt(ticket.bondAmount),
    takerFeeBps: ticket.takerFeeBps,
  });
}

/** Split a ticket's preimage into offset-annotated, decoded segments. */
export function describePreimageSegments(ticket: RevealTicket): PreimageSegment[] {
  const pre = ticketPreimage(ticket);
  const slice = (from: number, len: number) => bytesToHex(pre.slice(from, from + len));
  return [
    {
      key: "salt",
      label: "salt (ed25519 sig over the RFQ address)",
      offset: 0,
      length: 64,
      hex: slice(0, 64),
      decoded: `${ticket.salt.slice(0, 16)}…`,
    },
    {
      key: "rfq",
      label: "rfq",
      offset: 64,
      length: 32,
      hex: slice(64, 32),
      decoded: ticket.rfq,
    },
    {
      key: "taker",
      label: "taker",
      offset: 96,
      length: 32,
      hex: slice(96, 32),
      decoded: ticket.taker,
    },
    {
      key: "quoteMint",
      label: "quote_mint",
      offset: 128,
      length: 32,
      hex: slice(128, 32),
      decoded: ticket.quoteMint,
    },
    {
      key: "quoteAmount",
      label: "quote_amount (u64 LE)",
      offset: 160,
      length: 8,
      hex: slice(160, 8),
      decoded: BigInt(ticket.quoteAmount).toString(),
    },
    {
      key: "bondAmount",
      label: "bond_amount (u64 LE)",
      offset: 168,
      length: 8,
      hex: slice(168, 8),
      decoded: BigInt(ticket.bondAmount).toString(),
    },
    {
      key: "takerFeeBps",
      label: "taker_fee_bps (u16 LE)",
      offset: 176,
      length: 2,
      hex: slice(176, 2),
      decoded: `${ticket.takerFeeBps} bps`,
    },
  ];
}

/** Recompute the commit hash from a ticket, entirely client-side. */
export async function recomputeCommitHash(
  ticket: RevealTicket,
): Promise<{ preimageHex: string; hashHex: string; hash: Uint8Array }> {
  const { preimage, hash } = await commitHash({
    salt: hexToBytes(ticket.salt),
    rfq: new PublicKey(ticket.rfq),
    taker: new PublicKey(ticket.taker),
    quoteMint: new PublicKey(ticket.quoteMint),
    quoteAmount: BigInt(ticket.quoteAmount),
    bondAmount: BigInt(ticket.bondAmount),
    takerFeeBps: ticket.takerFeeBps,
  });
  return { preimageHex: bytesToHex(preimage), hashHex: bytesToHex(hash), hash };
}
