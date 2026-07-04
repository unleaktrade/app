import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, ShieldX, ShieldQuestion } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ResponsiveModal } from "@/app/components/ResponsiveModal";
import { AddressDisplay } from "@/app/components/AddressDisplay";
import { useConfigAccount } from "@/chain/accounts/config";
import { verifyAttestation } from "@/chain/liquidityGuard";
import { bytesToHex, loadTicket, type RevealTicket } from "@/app/lib/reveal-ticket";
import {
  describePreimageSegments,
  recomputeCommitHash,
  type PreimageSegmentKey,
} from "@/app/lib/proof-inspector";
import { cn } from "@/app/components/ui/utils";

interface ProofInspectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfqPda: string;
  /** On-chain quote data (tier 1 — anyone can verify the guard's signature). */
  quote: { commitHash: Uint8Array; liquidityProof: Uint8Array } | null;
  /** Reveal ticket (tier 2 — the preimage breakdown). Pass the in-memory
   * ticket right after attestation; when omitted, the localStorage backup for
   * this RFQ is tried. */
  ticket?: RevealTicket | null;
}

const SEGMENT_TINTS: Record<PreimageSegmentKey, string> = {
  salt: "border-state-committed/40 bg-state-committed/10 text-state-committed",
  rfq: "border-state-open/40 bg-state-open/10 text-state-open",
  taker: "border-state-revealed/40 bg-state-revealed/10 text-state-revealed",
  quoteMint: "border-state-selected/40 bg-state-selected/10 text-state-selected",
  quoteAmount: "border-state-settled/40 bg-state-settled/10 text-state-settled",
  bondAmount: "border-state-expired/40 bg-state-expired/10 text-state-expired",
  takerFeeBps: "border-state-incomplete/40 bg-state-incomplete/10 text-state-incomplete",
};

type Verdict = "unknown" | "valid" | "invalid";

/**
 * Transparency window into the commit_quote attestation (issue #16): the
 * liquidity-guard's ed25519 signature over the on-chain commit hash can be
 * verified by anyone against the pubkey published in the on-chain Config —
 * never an env var. With a reveal ticket, the full 178-byte preimage is laid
 * out byte-by-byte and the SHA-256 recomputed locally.
 */
export function ProofInspector({ open, onOpenChange, rfqPda, quote, ticket }: ProofInspectorProps) {
  const configQuery = useConfigAccount();
  const guardPubkey = configQuery.data?.liquidityGuard ?? null;

  const effectiveTicket = useMemo(
    () => (ticket !== undefined ? ticket : open ? loadTicket(rfqPda) : null),
    [ticket, rfqPda, open],
  );

  const [sigVerdict, setSigVerdict] = useState<Verdict>("unknown");
  const [hashVerdict, setHashVerdict] = useState<Verdict>("unknown");
  const [localHashHex, setLocalHashHex] = useState<string | null>(null);

  useEffect(() => {
    // Fresh verdicts per subject.
    setSigVerdict("unknown");
    setHashVerdict("unknown");
    setLocalHashHex(null);
  }, [rfqPda, open]);

  function verifySignature() {
    if (!quote || !guardPubkey) return;
    setSigVerdict(
      verifyAttestation(quote.commitHash, quote.liquidityProof, guardPubkey) ? "valid" : "invalid",
    );
  }

  async function verifyLocally() {
    if (!effectiveTicket) return;
    try {
      const { hashHex } = await recomputeCommitHash(effectiveTicket);
      setLocalHashHex(hashHex);
      if (quote) {
        setHashVerdict(hashHex === bytesToHex(quote.commitHash) ? "valid" : "invalid");
      }
    } catch {
      setHashVerdict("invalid");
    }
  }

  const segments = useMemo(() => {
    if (!effectiveTicket) return null;
    try {
      return describePreimageSegments(effectiveTicket);
    } catch {
      return null;
    }
  }, [effectiveTicket]);

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Liquidity proof inspector"
      description="Verify the attestation locally — no server involved."
      contentClassName="sm:max-w-2xl"
    >
      <div className="space-y-5 text-sm">
        {/* Tier 1 — on-chain hash + guard signature */}
        {quote ? (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">
              On-chain commitment
            </h3>
            <HexField label="commit_hash (SHA-256, 32 bytes)" hex={bytesToHex(quote.commitHash)} />
            <HexField
              label="liquidity_proof (ed25519 signature, 64 bytes)"
              hex={bytesToHex(quote.liquidityProof)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                onClick={verifySignature}
                disabled={guardPubkey === null}
                className="bg-white/10 text-white hover:bg-white/20"
              >
                <ShieldQuestion className="mr-2 h-4 w-4" />
                Verify signature
              </Button>
              <VerdictBadge verdict={sigVerdict} validText="Signed by the on-chain guard key" />
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span>Guard key (from on-chain Config):</span>
              {guardPubkey ? (
                <AddressDisplay address={guardPubkey.toBase58()} />
              ) : (
                <span>loading…</span>
              )}
            </div>
          </section>
        ) : (
          <p className="text-white/50">
            No on-chain commitment loaded for this RFQ — the signature check needs a committed
            quote.
          </p>
        )}

        {/* Tier 2 — preimage hex map (needs the reveal ticket) */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">
            Commit-hash preimage (178 bytes)
          </h3>
          {segments ? (
            <>
              <div className="space-y-2">
                {segments.map((seg) => (
                  <div
                    key={seg.key}
                    className={cn("rounded-lg border px-3 py-2", SEGMENT_TINTS[seg.key])}
                  >
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="text-xs font-semibold">{seg.label}</span>
                      <span className="font-mono text-[10px] opacity-70">
                        bytes {seg.offset}–{seg.offset + seg.length - 1}
                      </span>
                    </div>
                    <div className="break-all font-mono text-[10px] leading-relaxed opacity-90">
                      {seg.hex}
                    </div>
                    <div className="mt-1 truncate text-[10px] text-white/50">= {seg.decoded}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => void verifyLocally()}
                  className="bg-white/10 text-white hover:bg-white/20"
                >
                  <ShieldQuestion className="mr-2 h-4 w-4" />
                  Verify locally
                </Button>
                <VerdictBadge
                  verdict={hashVerdict}
                  validText="SHA-256 matches the on-chain hash"
                  invalidText="Recomputed hash does NOT match"
                />
              </div>
              {localHashHex && <HexField label="Recomputed SHA-256" hex={localHashHex} />}
            </>
          ) : (
            <p className="text-xs text-white/40">
              The preimage breakdown needs this commitment's reveal ticket (kept locally at commit
              time). Import it in the reveal cockpit if you have the JSON backup.
            </p>
          )}
        </section>
      </div>
    </ResponsiveModal>
  );
}

function HexField({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="mb-1 text-xs text-white/40">{label}</div>
      <div className="break-all font-mono text-[10px] leading-relaxed text-white/80">{hex}</div>
    </div>
  );
}

function VerdictBadge({
  verdict,
  validText,
  invalidText = "Signature does NOT verify",
}: {
  verdict: Verdict;
  validText: string;
  invalidText?: string;
}) {
  if (verdict === "unknown") return null;
  return verdict === "valid" ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-state-settled">
      <ShieldCheck className="h-4 w-4" />
      {validText}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-state-incomplete">
      <ShieldX className="h-4 w-4" />
      {invalidText}
    </span>
  );
}
