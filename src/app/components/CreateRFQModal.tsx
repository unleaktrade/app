// Thin shell around the shared RFQForm wizard: supplies create-mode defaults,
// maps the submitted values onto buildInitRfqTx and hosts the form inside
// ResponsiveModal (Dialog ≥ md, vaul bottom sheet below).

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { ResponsiveModal } from "@/app/components/ResponsiveModal";
import { RFQForm, type RFQFormValues } from "@/app/components/RFQForm";
import { useSettlementProgram } from "@/chain/program";
import { useConfigAccount } from "@/chain/accounts/config";
import { buildInitRfqTx } from "@/chain/instructions/maker";
import { newRfqUuid, submitRfqTx } from "@/chain/instructions/shared";
import { parseTokenAmount } from "@/app/lib/format";
import { resolveTokenMeta } from "@/app/lib/tokens";
import { toast } from "sonner";

interface CreateRFQModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRFQModal({ open, onOpenChange }: CreateRFQModalProps) {
  const program = useSettlementProgram();
  const { connection } = useConnection();
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const configQuery = useConfigAccount();

  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (values: RFQFormValues) => {
    if (!program || !wallet.publicKey) {
      toast.error("Connect a wallet to create an RFQ");
      return;
    }
    const config = configQuery.data;
    if (!config) {
      toast.error("On-chain config not loaded yet — try again in a moment");
      return;
    }
    const { baseToken, quoteToken } = values;
    if (!baseToken || !quoteToken) return;

    // Convert display decimals → base-unit bigints (no floats).
    const usdcDecimals = resolveTokenMeta(config.usdcMint.toBase58()).decimals;
    const baseUnits = parseTokenAmount(values.baseAmount, baseToken.decimals);
    const quoteUnits = parseTokenAmount(values.minQuoteAmount, quoteToken.decimals);
    const bondUnits = parseTokenAmount(values.bondAmount, usdcDecimals);
    if (baseUnits === null || baseUnits <= 0n) return void toast.error("Invalid base amount");
    if (quoteUnits === null || quoteUnits <= 0n) return void toast.error("Invalid quote amount");
    if (bondUnits === null || bondUnits <= 0n) return void toast.error("Invalid bond amount");

    let baseMint: PublicKey;
    let quoteMint: PublicKey;
    let facilitator: PublicKey | null = null;
    try {
      baseMint = new PublicKey(baseToken.mint);
      quoteMint = new PublicKey(quoteToken.mint);
      const fac = values.facilitatorAddress.trim();
      if (fac !== "") facilitator = new PublicKey(fac);
    } catch {
      return void toast.error("Invalid token mint or facilitator address");
    }

    setSubmitting(true);
    try {
      const uuid = newRfqUuid();
      await submitRfqTx({
        connection,
        wallet,
        queryClient,
        build: () =>
          buildInitRfqTx({
            program,
            maker: wallet.publicKey!,
            usdcMint: config.usdcMint,
            uuid,
            baseMint,
            quoteMint,
            bondAmount: bondUnits,
            baseAmount: baseUnits,
            minQuoteAmount: quoteUnits,
            takerFeeBps: Number(values.takerFeeBps),
            commitTtlSecs: parseInt(values.commitTtlSecs, 10),
            revealTtlSecs: parseInt(values.revealTtlSecs, 10),
            selectionTtlSecs: parseInt(values.selectionTtlSecs, 10),
            fundTtlSecs: parseInt(values.fundTtlSecs, 10),
            facilitator,
          }),
        pendingMessage: "Creating draft RFQ…",
        successMessage: "Draft RFQ created — open it to go live",
      });
      // Closing unmounts the form, which resets it for the next open.
      onOpenChange(false);
    } catch {
      // sendAndConfirmWithToast already surfaced the error toast.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
          Create Request for Quote
        </span>
      }
      description={
        <span className="sr-only">
          Multi-step form to create a new RFQ with token selection, economics configuration, timing
          settings, and final review
        </span>
      }
      contentClassName="max-w-3xl"
    >
      <RFQForm
        mode="create"
        submitting={submitting}
        submitLabel="Create RFQ"
        onSubmit={handleCreate}
      />
    </ResponsiveModal>
  );
}
