// Reveal-ticket persistence. A taker who loses their salt can NEVER reveal
// (the on-chain reveal re-derives the commit hash from salt + amount and must
// match), so we back the reveal inputs up two ways at commit time:
//   1. localStorage keyed by the RFQ pubkey — the happy path, auto-loaded by
//      the reveal cockpit.
//   2. a downloadable JSON "reveal ticket" — the escape hatch for a cleared
//      cache / different browser.
//
// The salt is `wallet.signMessage(rfq.pubkey.toBytes())` — an ed25519 signature
// over a PUBLIC value (the RFQ address), deterministic per (wallet, rfq). It is
// NOT a wallet secret and does not expose the private key, so localStorage is an
// acceptable store. It is, however, the only way to reveal, hence the redundancy.

export const REVEAL_TICKET_VERSION = 1 as const;

export interface RevealTicket {
  version: number;
  rfq: string; // base58 RFQ pubkey
  taker: string; // base58 taker pubkey
  quoteMint: string; // base58 quote mint
  salt: string; // hex-encoded 64-byte ed25519 signature
  quoteAmount: string; // base units (bigint as string)
  bondAmount: string; // base units (bigint as string)
  takerFeeBps: number;
}

function storageKey(rfq: string): string {
  return `unleak.reveal.${rfq}`;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase().replace(/^0x/, "");
  if (clean.length % 2 !== 0) throw new Error("hex string has odd length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    const byte = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error("invalid hex");
    out[i] = byte;
  }
  return out;
}

/** Persist the ticket to localStorage (best-effort — never throws). */
export function saveTicket(ticket: RevealTicket): void {
  try {
    localStorage.setItem(storageKey(ticket.rfq), JSON.stringify(ticket));
  } catch {
    // storage disabled / full — the downloadable ticket is the fallback.
  }
}

/** Load a previously-saved ticket for an RFQ, or null if absent / unreadable. */
export function loadTicket(rfq: string): RevealTicket | null {
  try {
    const raw = localStorage.getItem(storageKey(rfq));
    if (!raw) return null;
    return normaliseTicket(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Drop the saved ticket once the quote is revealed. The sealed amount + salt
 * only need to persist through the commit→reveal window; once the amount is
 * on-chain there's nothing left to recover, so clearing it shrinks the
 * same-origin read surface for the confidential bid (see the file header).
 * Best-effort — never throws.
 */
export function clearTicket(rfq: string): void {
  try {
    localStorage.removeItem(storageKey(rfq));
  } catch {
    // storage disabled — nothing to clear.
  }
}

/** Validate + normalise an unknown object into a RevealTicket. Throws on a bad
 * shape so the "import ticket" path can surface a clear error. */
export function parseTicket(input: unknown): RevealTicket {
  if (typeof input !== "object" || input === null) throw new Error("not a ticket object");
  const t = normaliseTicket(input as Record<string, unknown>);
  if (t === null) throw new Error("invalid or incomplete reveal ticket");
  return t;
}

function normaliseTicket(o: Record<string, unknown> | unknown): RevealTicket | null {
  if (typeof o !== "object" || o === null) return null;
  const r = o as Record<string, unknown>;
  const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
  const rfq = str(r.rfq);
  const taker = str(r.taker);
  const quoteMint = str(r.quoteMint);
  const salt = str(r.salt);
  const quoteAmount = str(r.quoteAmount);
  const bondAmount = str(r.bondAmount);
  const takerFeeBps = typeof r.takerFeeBps === "number" ? r.takerFeeBps : null;
  if (
    !rfq ||
    !taker ||
    !quoteMint ||
    !salt ||
    !quoteAmount ||
    !bondAmount ||
    takerFeeBps === null
  ) {
    return null;
  }
  // salt must decode to 64 bytes; fail fast rather than at reveal time.
  try {
    if (hexToBytes(salt).length !== 64) return null;
  } catch {
    return null;
  }
  return {
    version: typeof r.version === "number" ? r.version : REVEAL_TICKET_VERSION,
    rfq,
    taker,
    quoteMint,
    salt,
    quoteAmount,
    bondAmount,
    takerFeeBps,
  };
}

/** Trigger a browser download of the ticket JSON. No-op outside the DOM. */
export function downloadTicket(ticket: RevealTicket): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(ticket, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reveal-ticket-${ticket.rfq.slice(0, 8)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
