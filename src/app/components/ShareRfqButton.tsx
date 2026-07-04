import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ResponsiveModal } from "@/app/components/ResponsiveModal";
import { rfqDeepLinkUrl } from "@/app/lib/share-links";
import type { RFQState } from "@/types/rfq";

interface ShareRfqButtonProps {
  rfqPda: string;
  state: RFQState;
  className?: string;
}

/**
 * Share affordance on the RFQ detail header: copy-link + QR code for mobile
 * handoff. When the RFQ is Open, a second variant shares a link that preloads
 * the quote flow (?action=commit) for whoever opens it — the action only fires
 * if it is legal for that wallet.
 */
export function ShareRfqButton({ rfqPda, state, className }: ShareRfqButtonProps) {
  const [open, setOpen] = useState(false);
  const [withAction, setWithAction] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canPreloadCommit = state === "Open" || state === "Committed";
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = rfqDeepLinkUrl(origin, rfqPda, withAction && canPreloadCommit ? "commit" : undefined);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: "#0a0a0f", light: "#ffffff" } })
      .then((data) => {
        if (!cancelled) setQr(data);
      })
      .catch(() => setQr(null));
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Share this RFQ"
        onClick={() => setOpen(true)}
        className={className ?? "text-white/60 hover:text-white hover:bg-white/5"}
      >
        <Share2 className="h-4 w-4" />
      </Button>
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="Share this RFQ"
        description="Anyone with the link sees the live on-chain state."
        contentClassName="sm:max-w-sm"
      >
        <div className="flex flex-col items-center gap-4 py-2">
          {qr ? (
            <img
              src={qr}
              width={240}
              height={240}
              alt={`QR code linking to RFQ ${rfqPda}`}
              className="rounded-xl border border-white/10"
            />
          ) : (
            <div className="skeleton-shimmer h-[240px] w-[240px] rounded-xl border border-white/10 bg-white/[0.03]" />
          )}
          <p className="max-w-full truncate font-mono text-xs text-white/40">{url}</p>
          <div className="flex w-full flex-col gap-2">
            <Button onClick={() => void copy()} className="w-full bg-white/10 hover:bg-white/20">
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              Copy link
            </Button>
            {canPreloadCommit && (
              <label className="flex items-center justify-center gap-2 text-xs text-white/50">
                <input
                  type="checkbox"
                  checked={withAction}
                  onChange={(e) => setWithAction(e.target.checked)}
                  className="h-3.5 w-3.5 accent-cyan-400"
                />
                Open the quote flow automatically
              </label>
            )}
          </div>
        </div>
      </ResponsiveModal>
    </>
  );
}
