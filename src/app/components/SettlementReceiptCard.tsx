import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { CheckCircle2, Copy, Download, ExternalLink } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { rfqDeepLinkUrl } from "@/app/lib/share-links";
import { truncateAddress } from "@/app/lib/format";
import type { Cluster } from "@/chain/env";

interface SettlementReceiptCardProps {
  rfqPda: string;
  pair: string;
  /** Formatted amount received by this wallet, with its own mint symbol —
   * never aggregated to USD. */
  receivedAmount: string;
  receivedSymbol: string;
  txSignature: string;
  solscanUrl: string;
  cluster: Cluster;
  onDone: () => void;
}

/**
 * Shareable settlement receipt (issue #16): a fixed-geometry glass card that
 * exports to PNG via html-to-image, plus copy-link / QR for the RFQ deep link.
 * The deep link goes to the public detail page (the Settled panel shows the
 * on-chain summary to anyone); the tx signature stays in this session only.
 */
export function SettlementReceiptCard({
  rfqPda,
  pair,
  receivedAmount,
  receivedSymbol,
  txSignature,
  solscanUrl,
  cluster,
  onDone,
}: SettlementReceiptCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = rfqDeepLinkUrl(origin, rfqPda);
  const settledAt = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(link, { margin: 1, width: 96, color: { dark: "#0a0a0f", light: "#ffffff" } })
      .then((data) => {
        if (!cancelled) setQr(data);
      })
      .catch(() => setQr(null));
    return () => {
      cancelled = true;
    };
  }, [link]);

  async function downloadPng() {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: "#0a0a0f",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `unleak-settlement-${txSignature.slice(0, 8)}.png`;
      a.click();
      toast.success("Receipt saved");
    } catch {
      toast.error("Couldn't render the receipt image");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      {/* The exported card — fixed geometry, everything inline so html-to-image
          captures it faithfully. */}
      <div
        ref={cardRef}
        className="glass-panel rounded-2xl p-6 text-center"
        data-testid="settlement-receipt"
      >
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-state-settled" />
        <h1 className="text-2xl font-bold text-white">Settlement complete</h1>
        <p className="mt-1 text-sm text-white/60">
          Received {receivedAmount} {receivedSymbol} on {pair}
        </p>
        <div className="mt-5 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left text-xs">
          <ReceiptRow label="RFQ" value={truncateAddress(rfqPda)} />
          <ReceiptRow label="Transaction" value={truncateAddress(txSignature)} />
          <ReceiptRow label="Cluster" value={cluster} />
          <ReceiptRow label="Settled" value={settledAt} />
        </div>
        <div className="mt-5 flex items-center justify-between">
          <div className="text-left">
            <div className="font-display text-sm font-bold text-white">UnleakTrade</div>
            <div className="text-[10px] text-white/40">confidential OTC on Solana</div>
          </div>
          {qr && (
            <img
              src={qr}
              width={72}
              height={72}
              alt={`QR code linking to RFQ ${truncateAddress(rfqPda)}`}
              className="rounded-md"
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          onClick={() => void downloadPng()}
          disabled={saving}
          className="bg-white/10 text-white hover:bg-white/20"
        >
          <Download className="mr-2 h-4 w-4" />
          {saving ? "Rendering…" : "Download PNG"}
        </Button>
        <Button
          onClick={() => void copyLink()}
          className="bg-white/10 text-white hover:bg-white/20"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy link
        </Button>
        <a href={solscanUrl} target="_blank" rel="noreferrer">
          <Button className="w-full bg-white/5 text-white hover:bg-white/10">
            <ExternalLink className="mr-2 h-4 w-4" />
            Solscan
          </Button>
        </a>
        <Button
          onClick={onDone}
          className="bg-gradient-to-r from-state-settled-deep to-state-settled text-black hover:opacity-90"
        >
          Done
        </Button>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/40">{label}</span>
      <span className="font-mono text-white/80">{value}</span>
    </div>
  );
}
