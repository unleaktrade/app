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
import { useCluster } from "@/app/providers/ClusterProvider";
import { useTokenBalanceState, type TokenBalanceState } from "@/app/hooks/useTokenBalanceState";
import { BetaTokenNotice } from "@/app/components/BetaTokenNotice";
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
  const { cluster } = useCluster();

  const [submitting, setSubmitting] = useState(false);
  // Bond amount (base units) that a blocked submit needed — renders the beta
  // token notice above the form until funding lands or the modal closes.
  const [bondGate, setBondGate] = useState<bigint | null>(null);

  // The maker bond is posted in the Config's USDC mint — the beta token.
  const usdcMint = configQuery.data?.usdcMint ?? null;
  const usdcState = useTokenBalanceState(usdcMint);

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

    // Pre-signing gate (#67): don't build the tx when the bond obviously can't
    // be posted — surface waitlist guidance instead of a wallet-sign → chain
    // rejection round-trip. Loading/error reads never block (the chain stays
    // the final arbiter); wallet/config-not-ready keep their toast paths above.
    if (
      usdcState.status === "no-ata" ||
      usdcState.status === "zero" ||
      (usdcState.status === "ok" && usdcState.balance < bondUnits)
    ) {
      setBondGate(bondUnits);
      return;
    }
    setBondGate(null);

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
      onOpenChange={(o) => {
        if (!o) setBondGate(null);
        onOpenChange(o);
      }}
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
      {(() => {
        if (bondGate === null || usdcMint === null) return null;
        // Re-derive against the live read so the notice clears once funding
        // lands; an `ok` balance below the gate renders as `insufficient`.
        const gateState: TokenBalanceState | null =
          usdcState.status === "ok"
            ? usdcState.balance < bondGate
              ? { status: "insufficient", balance: usdcState.balance, required: bondGate }
              : null
            : usdcState.status === "no-ata" || usdcState.status === "zero"
              ? usdcState
              : null;
        if (gateState === null) return null;
        const meta = resolveTokenMeta(usdcMint.toBase58());
        return (
          <div className="mb-4">
            <BetaTokenNotice
              state={gateState}
              cluster={cluster}
              symbol={meta.symbol}
              decimals={meta.decimals}
              required={bondGate}
              variant="inline"
            />
          </div>
        );
      })()}
      <RFQForm
        mode="create"
        submitting={submitting}
        submitLabel="Create RFQ"
        onSubmit={handleCreate}
      />
    </ResponsiveModal>
  );
}
