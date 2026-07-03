// Thin shell around the shared RFQForm wizard for editing a Draft RFQ. The
// decoded on-chain account is the authoritative source for the pre-fill and
// the diff (base units + taker_fee_bps + real decimals), which the display
// view-model doesn't carry — that mapping stays here, not in RFQForm. Only
// changed fields are sent to update_rfq (null = keep). Every update_rfq arg is
// optional-updatable on-chain, so no fields are locked.

import { useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { ResponsiveModal } from "@/app/components/ResponsiveModal";
import { RFQForm, type RFQFormValues } from "@/app/components/RFQForm";
import { useSettlementProgram } from "@/chain/program";
import { useRfqAccount } from "@/chain/accounts/rfq";
import { canUpdateRfq } from "@/chain/state-machine";
import { buildUpdateRfqTx, type UpdateRfqFields } from "@/chain/instructions/maker";
import { submitRfqTx } from "@/chain/instructions/shared";
import { formatTokenAmount, parseTokenAmount } from "@/app/lib/format";
import { resolveTokenMeta } from "@/app/lib/tokens";
import type { FacilitatorUpdate, RFQ } from "@/types/rfq";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface UpdateRFQModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfq: RFQ | null;
}

export function UpdateRFQModal({ open, onOpenChange, rfq }: UpdateRFQModalProps) {
  const program = useSettlementProgram();
  const { connection } = useConnection();
  const wallet = useWallet();
  const queryClient = useQueryClient();

  const pda = useMemo(() => {
    if (!rfq) return null;
    try {
      return new PublicKey(rfq.publicKey);
    } catch {
      return null;
    }
  }, [rfq]);
  const accountQuery = useRfqAccount(pda);
  const account = accountQuery.data ?? null;
  const isDraft = account !== null && canUpdateRfq(account);

  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from the decoded account (correct decimals + bps). RFQForm reads
  // these once at mount; the `key` below only changes when the account first
  // loads (or the RFQ changes), so later subscription pushes never clobber
  // in-progress edits.
  const initialValues = useMemo<Partial<RFQFormValues> | undefined>(() => {
    if (!account) return undefined;

    const baseMeta = resolveTokenMeta(account.baseMint.toBase58());
    const quoteMeta = resolveTokenMeta(account.quoteMint.toBase58());
    const usdcMeta = resolveTokenMeta(account.usdcMint.toBase58());

    return {
      baseToken: {
        symbol: baseMeta.symbol,
        name: baseMeta.symbol,
        mint: account.baseMint.toBase58(),
        decimals: baseMeta.decimals,
        logoURI: baseMeta.logoURI ?? "",
      },
      quoteToken: {
        symbol: quoteMeta.symbol,
        name: quoteMeta.symbol,
        mint: account.quoteMint.toBase58(),
        decimals: quoteMeta.decimals,
        logoURI: quoteMeta.logoURI ?? "",
      },
      baseAmount: formatTokenAmount(account.baseAmount, baseMeta.decimals),
      minQuoteAmount: formatTokenAmount(account.minQuoteAmount, quoteMeta.decimals),
      bondAmount: formatTokenAmount(account.bondAmount, usdcMeta.decimals),
      takerFeeBps: String(account.takerFeeBps),
      commitTtlSecs: String(account.commitTtlSecs),
      revealTtlSecs: String(account.revealTtlSecs),
      selectionTtlSecs: String(account.selectionTtlSecs),
      fundTtlSecs: String(account.fundTtlSecs),
      facilitatorAddress: account.facilitator?.toBase58() ?? "",
    };
  }, [account]);

  const handleUpdate = async (values: RFQFormValues) => {
    const { baseToken, quoteToken } = values;
    if (!program || !wallet.publicKey || !account || !pda || !baseToken || !quoteToken) return;
    if (!canUpdateRfq(account)) {
      toast.error("Only draft RFQs can be edited");
      return;
    }

    const usdcDecimals = resolveTokenMeta(account.usdcMint.toBase58()).decimals;
    const nextBase = parseTokenAmount(values.baseAmount, baseToken.decimals);
    const nextQuote = parseTokenAmount(values.minQuoteAmount, quoteToken.decimals);
    const nextBond = parseTokenAmount(values.bondAmount, usdcDecimals);
    if (nextBase === null || nextBase <= 0n) return void toast.error("Invalid base amount");
    if (nextQuote === null || nextQuote <= 0n) return void toast.error("Invalid quote amount");
    if (nextBond === null || nextBond <= 0n) return void toast.error("Invalid bond amount");

    let nextBaseMint: PublicKey;
    let nextQuoteMint: PublicKey;
    try {
      nextBaseMint = new PublicKey(baseToken.mint);
      nextQuoteMint = new PublicKey(quoteToken.mint);
    } catch {
      return void toast.error("Invalid token mint");
    }

    // Diff against the on-chain account — only changed fields are sent (null = keep).
    const fields: UpdateRfqFields = {};
    if (nextBaseMint.toBase58() !== account.baseMint.toBase58()) fields.newBaseMint = nextBaseMint;
    if (nextQuoteMint.toBase58() !== account.quoteMint.toBase58())
      fields.newQuoteMint = nextQuoteMint;
    if (nextBond !== account.bondAmount) fields.newBondAmount = nextBond;
    if (nextBase !== account.baseAmount) fields.newBaseAmount = nextBase;
    if (nextQuote !== account.minQuoteAmount) fields.newMinQuoteAmount = nextQuote;
    if (Number(values.takerFeeBps) !== account.takerFeeBps)
      fields.newTakerFeeBps = Number(values.takerFeeBps);
    if (Number(values.commitTtlSecs) !== account.commitTtlSecs)
      fields.newCommitTtlSecs = Number(values.commitTtlSecs);
    if (Number(values.revealTtlSecs) !== account.revealTtlSecs)
      fields.newRevealTtlSecs = Number(values.revealTtlSecs);
    if (Number(values.selectionTtlSecs) !== account.selectionTtlSecs)
      fields.newSelectionTtlSecs = Number(values.selectionTtlSecs);
    if (Number(values.fundTtlSecs) !== account.fundTtlSecs)
      fields.newFundTtlSecs = Number(values.fundTtlSecs);

    const facInput = values.facilitatorAddress.trim();
    const originalFac = account.facilitator?.toBase58() ?? null;
    if (facInput !== (originalFac ?? "")) {
      if (facInput === "") {
        fields.newFacilitatorUpdate = { kind: "clear" } satisfies FacilitatorUpdate;
      } else {
        try {
          new PublicKey(facInput);
        } catch {
          return void toast.error("Invalid facilitator address");
        }
        fields.newFacilitatorUpdate = { kind: "set", pubkey: facInput } satisfies FacilitatorUpdate;
      }
    }

    if (Object.keys(fields).length === 0) {
      toast.info("No changes to save");
      return;
    }

    setSubmitting(true);
    try {
      await submitRfqTx({
        connection,
        wallet,
        queryClient,
        rfq: pda,
        build: () => buildUpdateRfqTx({ program, maker: account.maker, rfq: pda, ...fields }),
        pendingMessage: "Updating RFQ…",
        successMessage: "RFQ updated",
      });
      // Closing unmounts the form, which resets it for the next open.
      onOpenChange(false);
    } catch {
      // sendAndConfirmWithToast already surfaced the error toast.
    } finally {
      setSubmitting(false);
    }
  };

  if (!rfq) return null;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
          Update RFQ Draft
        </span>
      }
      description={
        <span className="sr-only">Modify your RFQ parameters before opening to the market</span>
      }
      contentClassName="max-w-3xl"
    >
      <RFQForm
        key={`${pda?.toBase58() ?? "no-pda"}:${account ? "loaded" : "loading"}`}
        mode="update"
        initialValues={initialValues}
        submitting={submitting}
        submitLabel="Update RFQ"
        submitDisabled={!isDraft}
        onSubmit={handleUpdate}
        notice={
          account && !isDraft ? (
            <div className="mt-3 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                This RFQ is {account.state.toLowerCase()} and can no longer be edited — only drafts
                are editable.
              </span>
            </div>
          ) : undefined
        }
      />
    </ResponsiveModal>
  );
}
