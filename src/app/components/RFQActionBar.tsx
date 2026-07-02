// The single action bar on the RFQ detail page. It renders exactly the CTAs
// that are legal for the connected wallet × current RFQ state, derived by
// deriveRfqActions (src/app/lib/rfq-actions.ts) from the state-machine guards.
// There is no role label anywhere in the copy — role is an internal derivation.
//
// The bar owns the confirm/preview dialogs and submits each write through
// submitRfqTx (build → toast + Solscan link → invalidate). select_quote is not
// here: picking a winner needs the comparison table, so it lives per-row there.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { RfqAccount } from "@/chain/accounts/rfq";
import type { QuoteAccount } from "@/chain/accounts/quote";
import type { ConfigAccount } from "@/chain/accounts/config";
import type { ProgramAccount } from "@/chain/accounts/lists";
import { useSettlementProgram } from "@/chain/program";
import { submitRfqTx } from "@/chain/instructions/shared";
import {
  buildCancelRfqTx,
  buildCloseExpiredTx,
  buildCloseIncompleteTx,
  buildOpenRfqTx,
  buildSetRfqFacilitatorTx,
  buildWithdrawRewardTx,
} from "@/chain/instructions/maker";
import { buildRefundQuoteBondsTx, buildSetQuoteFacilitatorTx } from "@/chain/instructions/taker";
import {
  deriveRfqActions,
  type RfqActionDescriptor,
  type RfqActionId,
  type RfqActionTone,
} from "@/app/lib/rfq-actions";
import { findQuoteByPda } from "@/app/lib/quote-lookup";
import { resolveTokenMeta } from "@/app/lib/tokens";
import type { FacilitatorUpdate } from "@/types/rfq";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { RFQActionSheet } from "@/app/components/RFQActionSheet";
import { BondBreakdown } from "@/app/components/BondBreakdown";
import { cn } from "@/app/components/ui/utils";

interface RFQActionBarProps {
  rfqPda: PublicKey;
  rfq: RfqAccount;
  quotes: ProgramAccount<QuoteAccount>[];
  config: ConfigAccount | null;
  /** Opens the UpdateRFQModal (mounted at DashboardLayout). */
  onEdit: () => void;
  /** Opens the SubmitQuoteModal (commit_quote flow). */
  onCommit: () => void;
  /** Called after an account-closing action (cancel) so the page can navigate away. */
  onClosed: () => void;
}

const toneClass: Record<RfqActionTone, string> = {
  primary:
    "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white",
  reward:
    "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black",
  default: "bg-white/5 border border-white/20 text-white hover:bg-white/10",
  danger: "bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20",
};

export function RFQActionBar({
  rfqPda,
  rfq,
  quotes,
  config,
  onEdit,
  onCommit,
  onClosed,
}: RFQActionBarProps) {
  const program = useSettlementProgram();
  const { connection } = useConnection();
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<RfqActionId | null>(null);
  const [facilitatorInput, setFacilitatorInput] = useState("");

  const connected = wallet.publicKey?.toBase58() ?? null;
  // Recompute per render so the countdown-driven guards flip exactly on deadline.
  const now = Math.floor(Date.now() / 1000);

  const selectedQuoteFacilitator = useMemo(() => {
    const winning = findQuoteByPda(quotes, rfq.selectedQuote?.toBase58() ?? null);
    return winning?.account.facilitator?.toBase58() ?? null;
  }, [rfq.selectedQuote, quotes]);

  // The connected wallet's own quote on this RFQ (drives the taker CTAs).
  const myQuoteRow = useMemo(
    () =>
      connected === null
        ? null
        : (quotes.find((q) => q.account.taker.toBase58() === connected) ?? null),
    [quotes, connected],
  );

  const actions = deriveRfqActions({
    rfq: {
      ...rfq,
      maker: rfq.maker.toBase58(),
      facilitator: rfq.facilitator?.toBase58() ?? null,
      settlementCompletedAt: rfq.completedAt,
      selectedQuoteFacilitator,
    },
    myQuote: myQuoteRow
      ? {
          revealedAt: myQuoteRow.account.revealedAt,
          bondsRefundedAt: myQuoteRow.account.bondsRefundedAt,
          selected: myQuoteRow.account.selected,
        }
      : null,
    connected,
    now,
    facilitatorFeeBps: config?.facilitatorFeeBps ?? 0,
  });

  const emptyStateMessage =
    connected === null
      ? "Connect a wallet to see what you can do here."
      : "No pending action for your wallet on this RFQ.";

  const quoteMeta = resolveTokenMeta(rfq.quoteMint.toBase58());
  const usdcMeta = resolveTokenMeta(rfq.usdcMint.toBase58());

  async function run(
    build: () => Promise<import("@solana/web3.js").Transaction>,
    messages: { pending: string; success: string },
    opts?: { onDone?: () => void },
  ) {
    if (!program || !wallet.publicKey) {
      toast.error("Connect a wallet to continue");
      return;
    }
    setBusy(true);
    try {
      await submitRfqTx({
        connection,
        wallet,
        queryClient,
        rfq: rfqPda,
        build,
        pendingMessage: messages.pending,
        successMessage: messages.success,
      });
      setConfirm(null);
      opts?.onDone?.();
    } catch {
      // sendAndConfirmWithToast already surfaced the error toast.
    } finally {
      setBusy(false);
    }
  }

  function onActionClick(id: RfqActionId) {
    // Immediate actions (no confirm dialog).
    if (id === "edit") return void onEdit();
    if (id === "commit") return void onCommit();
    if (id === "reveal" || id === "settle") {
      const quotePda = myQuoteRow?.publicKey.toBase58();
      if (!quotePda) return void toast.error("Your quote isn't loaded yet");
      navigate(`/dashboard/quote/${quotePda}/${id}`);
      return;
    }
    // Dialog-confirmed actions.
    if (id === "setFacilitator") {
      setFacilitatorInput(rfq.facilitator?.toBase58() ?? "");
    }
    if (id === "setQuoteFacilitator") {
      setFacilitatorInput(myQuoteRow?.account.facilitator?.toBase58() ?? "");
    }
    setConfirm(id);
  }

  const maker = rfq.maker;

  function submitConfirmed() {
    if (!program || !wallet.publicKey) return;
    switch (confirm) {
      case "open":
        void run(() => buildOpenRfqTx({ program, maker, rfq: rfqPda, usdcMint: rfq.usdcMint }), {
          pending: "Opening RFQ…",
          success: "RFQ opened — the clock is running",
        });
        break;
      case "cancel":
        void run(
          () => buildCancelRfqTx({ program, maker, rfq: rfqPda }),
          {
            pending: "Cancelling draft…",
            success: "Draft cancelled and rent refunded",
          },
          { onDone: onClosed },
        );
        break;
      case "closeExpired":
        void run(
          () =>
            buildCloseExpiredTx({
              program,
              maker,
              rfq: rfqPda,
              usdcMint: rfq.usdcMint,
              treasuryWallet: rfq.treasuryWallet,
            }),
          { pending: "Reclaiming bond…", success: "Bond reclaimed" },
        );
        break;
      case "closeIncomplete":
        void run(
          () =>
            buildCloseIncompleteTx({
              program,
              maker,
              rfq: rfqPda,
              baseMint: rfq.baseMint,
              usdcMint: rfq.usdcMint,
              treasuryWallet: rfq.treasuryWallet,
            }),
          { pending: "Reclaiming escrow…", success: "Escrow and bond reclaimed" },
        );
        break;
      case "claimReward": {
        const selected = rfq.selectedQuote;
        if (!selected) {
          toast.error("No selected quote to claim against");
          return;
        }
        void run(
          () =>
            buildWithdrawRewardTx({
              program,
              facilitator: wallet.publicKey!,
              rfq: rfqPda,
              quote: selected,
              quoteMint: rfq.quoteMint,
            }),
          { pending: "Claiming reward…", success: "Reward claimed to your wallet" },
        );
        break;
      }
      case "setFacilitator":
      case "setQuoteFacilitator": {
        const trimmed = facilitatorInput.trim();
        let update: FacilitatorUpdate;
        if (trimmed === "") {
          update = { kind: "clear" };
        } else {
          try {
            new PublicKey(trimmed); // validate before building
          } catch {
            toast.error("That is not a valid address");
            return;
          }
          update = { kind: "set", pubkey: trimmed };
        }
        const messages = {
          pending: "Updating facilitator…",
          success: trimmed === "" ? "Facilitator cleared" : "Facilitator assigned",
        };
        if (confirm === "setFacilitator") {
          void run(
            () => buildSetRfqFacilitatorTx({ program, maker, rfq: rfqPda, update }),
            messages,
          );
        } else {
          void run(
            () => buildSetQuoteFacilitatorTx({ program, taker: wallet.publicKey!, rfqPda, update }),
            messages,
          );
        }
        break;
      }
      case "refundBond":
        void run(
          () => buildRefundQuoteBondsTx({ program, taker: wallet.publicKey!, rfqPda, rfq }),
          { pending: "Reclaiming bond…", success: "Bond reclaimed to your wallet" },
        );
        break;
      default:
        break;
    }
  }

  const pending = actions.find((a) => a.id === confirm);

  return (
    <>
      {actions.length > 0 ? (
        <RFQActionSheet title="Actions" className="justify-end">
          {actions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              onClick={() => onActionClick(action.id)}
            />
          ))}
        </RFQActionSheet>
      ) : (
        <p className="text-right text-sm text-white/40">{emptyStateMessage}</p>
      )}

      <Dialog
        open={confirm !== null && confirm !== "edit"}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <DialogContent className="border-white/10 bg-[#0a0a0f] text-white">
          <DialogHeader>
            <DialogTitle>{pending?.label ?? "Confirm"}</DialogTitle>
            <DialogDescription className="text-white/60">{pending?.description}</DialogDescription>
          </DialogHeader>

          {confirm === "open" && (
            <BondBreakdown
              bondAmount={rfq.bondAmount}
              bondSymbol={usdcMeta.symbol}
              bondDecimals={usdcMeta.decimals}
              quoteAmount={rfq.minQuoteAmount}
              quoteSymbol={quoteMeta.symbol}
              quoteDecimals={quoteMeta.decimals}
              takerFeeBps={rfq.takerFeeBps}
              facilitatorFeeBps={config?.facilitatorFeeBps ?? 0}
            />
          )}

          {(confirm === "setFacilitator" || confirm === "setQuoteFacilitator") && (
            <div className="space-y-2">
              <Label htmlFor="facilitator-address">Facilitator address</Label>
              <Input
                id="facilitator-address"
                placeholder="Leave blank to clear"
                value={facilitatorInput}
                onChange={(e) => setFacilitatorInput(e.target.value)}
                className="border-white/15 bg-white/5 font-mono text-sm text-white"
              />
              <p className="text-xs text-white/40">
                The facilitator earns the configured share of the protocol fee on settlement.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirm(null)}
              disabled={busy}
              className="text-white/60 hover:bg-white/5 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={submitConfirmed}
              disabled={busy}
              className={cn(toneClass[pending?.tone ?? "primary"])}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {pending?.label ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ActionButton({ action, onClick }: { action: RfqActionDescriptor; onClick: () => void }) {
  return (
    <Button onClick={onClick} className={cn("flex-1 md:flex-none", toneClass[action.tone])}>
      {action.label}
    </Button>
  );
}
