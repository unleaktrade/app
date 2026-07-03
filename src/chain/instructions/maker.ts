// Transaction builders for the maker (RFQ owner) + facilitator-claim
// instructions. Each returns an unsigned `Transaction`; the caller submits via
// `sendAndConfirmWithToast`. Account maps mirror the devnet-proven driver in
// scripts/seed.ts 1:1, swapping the script's Keypair signers for the connected
// wallet (Anchor's provider wallet signs). ATAs are computed explicitly with
// getAssociatedTokenAddressSync (matching seed.ts) rather than relying on
// Anchor's resolver, so the built account list is deterministic.
//
// Amounts are base-unit bigints from the UI (TokenAmountInput / view-model);
// they cross into Anchor as BN. All protocol math stays bigint upstream.

import { BN, type Program } from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  PublicKey,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { SettlementEngine } from "@/chain/idl/settlement_engine";
import {
  deriveConfigPda,
  deriveFacilitatorRewardPda,
  deriveRfqPda,
  deriveSettlementPda,
  deriveSlashedBondsTrackerPda,
} from "@/chain/pda";
import { env } from "@/chain/env";
import { toFacilitatorUpdateArg, type FacilitatorUpdateArg } from "./shared";
import type { FacilitatorUpdate } from "@/types/rfq";

type SettlementProgram = Program<SettlementEngine>;

function bn(value: bigint): BN {
  return new BN(value.toString());
}

/** ATA(owner, mint) with the standard SPL Token program; `allowOwnerOffCurve`
 * for PDA owners (bonds_escrow / vaults are owned by the RFQ PDA). */
function ata(mint: PublicKey, owner: PublicKey, ownerOffCurve = false): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner, ownerOffCurve);
}

// ---------------------------------------------------------------------------
// init_rfq — create a Draft RFQ. uuid derives the RFQ PDA; the maker must hold
// Config.usdc_mint for the (later) bond, but init moves no tokens.
// ---------------------------------------------------------------------------

export interface InitRfqParams {
  program: SettlementProgram;
  maker: PublicKey;
  usdcMint: PublicKey;
  uuid: Uint8Array; // 16 bytes
  baseMint: PublicKey;
  quoteMint: PublicKey;
  bondAmount: bigint;
  baseAmount: bigint;
  minQuoteAmount: bigint;
  takerFeeBps: number;
  commitTtlSecs: number;
  revealTtlSecs: number;
  selectionTtlSecs: number;
  fundTtlSecs: number;
  facilitator: PublicKey | null;
}

export async function buildInitRfqTx(p: InitRfqParams): Promise<Transaction> {
  const rfq = deriveRfqAddress(p.maker, p.uuid);
  return p.program.methods
    .initRfq(
      Array.from(p.uuid),
      p.baseMint,
      p.quoteMint,
      bn(p.bondAmount),
      bn(p.baseAmount),
      bn(p.minQuoteAmount),
      p.takerFeeBps,
      p.commitTtlSecs,
      p.revealTtlSecs,
      p.selectionTtlSecs,
      p.fundTtlSecs,
      p.facilitator,
    )
    .accountsPartial({
      maker: p.maker,
      config: configPda(),
      usdcMint: p.usdcMint,
      bondsEscrow: ata(p.usdcMint, rfq, true),
      makerPaymentAccount: ata(p.usdcMint, p.maker),
    })
    .transaction();
}

// ---------------------------------------------------------------------------
// update_rfq — patch a Draft RFQ. Only changed fields are sent (null = keep).
// ---------------------------------------------------------------------------

export interface UpdateRfqFields {
  newBaseMint?: PublicKey | null;
  newQuoteMint?: PublicKey | null;
  newBondAmount?: bigint | null;
  newBaseAmount?: bigint | null;
  newMinQuoteAmount?: bigint | null;
  newTakerFeeBps?: number | null;
  newCommitTtlSecs?: number | null;
  newRevealTtlSecs?: number | null;
  newSelectionTtlSecs?: number | null;
  newFundTtlSecs?: number | null;
  newFacilitatorUpdate?: FacilitatorUpdate | null;
}

export interface UpdateRfqParams extends UpdateRfqFields {
  program: SettlementProgram;
  maker: PublicKey;
  rfq: PublicKey;
}

export async function buildUpdateRfqTx(p: UpdateRfqParams): Promise<Transaction> {
  const facilitatorUpdate: FacilitatorUpdateArg | null = p.newFacilitatorUpdate
    ? toFacilitatorUpdateArg(p.newFacilitatorUpdate)
    : null;
  return p.program.methods
    .updateRfq(
      p.newBaseMint ?? null,
      p.newQuoteMint ?? null,
      nullableBn(p.newBondAmount),
      nullableBn(p.newBaseAmount),
      nullableBn(p.newMinQuoteAmount),
      p.newTakerFeeBps ?? null,
      p.newCommitTtlSecs ?? null,
      p.newRevealTtlSecs ?? null,
      p.newSelectionTtlSecs ?? null,
      p.newFundTtlSecs ?? null,
      facilitatorUpdate,
    )
    .accountsPartial({ maker: p.maker, rfq: p.rfq })
    .transaction();
}

// ---------------------------------------------------------------------------
// open_rfq — Draft → Open. Posts the maker bond; starts the clock.
// ---------------------------------------------------------------------------

export interface OpenRfqParams {
  program: SettlementProgram;
  maker: PublicKey;
  rfq: PublicKey;
  usdcMint: PublicKey;
}

export async function buildOpenRfqTx(p: OpenRfqParams): Promise<Transaction> {
  return p.program.methods
    .openRfq()
    .accountsPartial({
      maker: p.maker,
      rfq: p.rfq,
      config: configPda(),
      bondsEscrow: ata(p.usdcMint, p.rfq, true),
      makerPaymentAccount: ata(p.usdcMint, p.maker),
      usdcMint: p.usdcMint,
    })
    .transaction();
}

// ---------------------------------------------------------------------------
// set_rfq_facilitator — assign / clear the RFQ facilitator (pre-selection).
// ---------------------------------------------------------------------------

export interface SetRfqFacilitatorParams {
  program: SettlementProgram;
  maker: PublicKey;
  rfq: PublicKey;
  update: FacilitatorUpdate;
}

export async function buildSetRfqFacilitatorTx(p: SetRfqFacilitatorParams): Promise<Transaction> {
  return p.program.methods
    .setRfqFacilitator(toFacilitatorUpdateArg(p.update))
    .accountsPartial({ maker: p.maker, rfq: p.rfq })
    .transaction();
}

// ---------------------------------------------------------------------------
// cancel_rfq — Draft only. Closes the RFQ account, refunding rent to the maker.
// ---------------------------------------------------------------------------

export interface CancelRfqParams {
  program: SettlementProgram;
  maker: PublicKey;
  rfq: PublicKey;
}

export async function buildCancelRfqTx(p: CancelRfqParams): Promise<Transaction> {
  return p.program.methods
    .cancelRfq()
    .accountsPartial({ maker: p.maker, rfq: p.rfq })
    .transaction();
}

// ---------------------------------------------------------------------------
// select_quote — Revealed → Selected. Escrows the maker's base tokens.
// ---------------------------------------------------------------------------

export interface SelectQuoteParams {
  program: SettlementProgram;
  maker: PublicKey;
  rfq: PublicKey;
  quote: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
}

export async function buildSelectQuoteTx(p: SelectQuoteParams): Promise<Transaction> {
  return p.program.methods
    .selectQuote()
    .accountsPartial({
      maker: p.maker,
      rfq: p.rfq,
      quote: p.quote,
      baseMint: p.baseMint,
      quoteMint: p.quoteMint,
      vaultBaseAta: ata(p.baseMint, p.rfq, true),
      makerBaseAccount: ata(p.baseMint, p.maker),
      config: configPda(),
    })
    .transaction();
}

// ---------------------------------------------------------------------------
// close_expired — Open/Committed with no reveals, past the reveal deadline.
// Refunds the maker bond; slashes unrevealed taker bonds to the treasury.
// ---------------------------------------------------------------------------

export interface CloseExpiredParams {
  program: SettlementProgram;
  maker: PublicKey;
  rfq: PublicKey;
  usdcMint: PublicKey;
  treasuryWallet: PublicKey;
}

export async function buildCloseExpiredTx(p: CloseExpiredParams): Promise<Transaction> {
  return p.program.methods
    .closeExpired()
    .accountsPartial({
      maker: p.maker,
      rfq: p.rfq,
      config: configPda(),
      usdcMint: p.usdcMint,
      bondsEscrow: ata(p.usdcMint, p.rfq, true),
      treasuryWallet: p.treasuryWallet,
      treasuryAta: ata(p.usdcMint, p.treasuryWallet),
      makerPaymentAccount: ata(p.usdcMint, p.maker),
      slashedBondsTracker: slashedBondsTrackerPda(p.rfq),
    })
    .transaction();
}

// ---------------------------------------------------------------------------
// close_incomplete — Selected but never funded in time. Refunds the maker bond
// + escrowed base; slashes the selected taker's bond. Needs the CU bump because
// it touches many token accounts.
// ---------------------------------------------------------------------------

export interface CloseIncompleteParams {
  program: SettlementProgram;
  maker: PublicKey;
  rfq: PublicKey;
  baseMint: PublicKey;
  usdcMint: PublicKey;
  treasuryWallet: PublicKey;
}

export async function buildCloseIncompleteTx(p: CloseIncompleteParams): Promise<Transaction> {
  return p.program.methods
    .closeIncomplete()
    .accountsPartial({
      maker: p.maker,
      config: configPda(),
      rfq: p.rfq,
      settlement: settlementPda(p.rfq),
      baseMint: p.baseMint,
      vaultBaseAta: ata(p.baseMint, p.rfq, true),
      makerBaseAccount: ata(p.baseMint, p.maker),
      usdcMint: p.usdcMint,
      bondsEscrow: ata(p.usdcMint, p.rfq, true),
      makerPaymentAccount: ata(p.usdcMint, p.maker),
      treasuryWallet: p.treasuryWallet,
      treasuryAta: ata(p.usdcMint, p.treasuryWallet),
      slashedBondsTracker: slashedBondsTrackerPda(p.rfq),
    })
    .preInstructions([computeBudgetIx(400_000)])
    .transaction();
}

// ---------------------------------------------------------------------------
// withdraw_reward — facilitator claims the fee share once the RFQ is Settled.
// Not covered by seed.ts; account map built straight from the IDL. `quote` is
// the winning quote PDA (rfq.selectedQuote); the reward is in the quote mint.
// ---------------------------------------------------------------------------

export interface WithdrawRewardParams {
  program: SettlementProgram;
  facilitator: PublicKey;
  rfq: PublicKey;
  quote: PublicKey; // the selected quote PDA (rfq.selectedQuote)
  quoteMint: PublicKey;
}

export async function buildWithdrawRewardTx(p: WithdrawRewardParams): Promise<Transaction> {
  return p.program.methods
    .withdrawReward()
    .accountsPartial({
      facilitator: p.facilitator,
      config: configPda(),
      rfq: p.rfq,
      settlement: settlementPda(p.rfq),
      quote: p.quote,
      quoteMint: p.quoteMint,
      feeEscrow: ata(p.quoteMint, p.rfq, true),
      facilitatorAta: ata(p.quoteMint, p.facilitator),
      facilitatorRewardTracker: facilitatorRewardPda(p.rfq, p.facilitator),
    })
    .transaction();
}

// ---------------------------------------------------------------------------
// PDA + misc helpers (thin wrappers dropping the bump the derivers return).
// ---------------------------------------------------------------------------

function nullableBn(value: bigint | null | undefined): BN | null {
  return value === null || value === undefined ? null : bn(value);
}

function computeBudgetIx(units: number): TransactionInstruction {
  return ComputeBudgetProgram.setComputeUnitLimit({ units });
}

function configPda(): PublicKey {
  return deriveConfigPda(env.programId)[0];
}

function deriveRfqAddress(maker: PublicKey, uuid: Uint8Array): PublicKey {
  return deriveRfqPda(env.programId, maker, uuid)[0];
}

function settlementPda(rfq: PublicKey): PublicKey {
  return deriveSettlementPda(env.programId, rfq)[0];
}

function slashedBondsTrackerPda(rfq: PublicKey): PublicKey {
  return deriveSlashedBondsTrackerPda(env.programId, rfq)[0];
}

function facilitatorRewardPda(rfq: PublicKey, facilitator: PublicKey): PublicKey {
  return deriveFacilitatorRewardPda(env.programId, rfq, facilitator)[0];
}
