// Transaction builders for the taker (quote) instructions. Same contract as
// maker.ts: each returns an unsigned `Transaction`; the caller submits via
// submitRfqTx. Account maps mirror the devnet-proven scripts/seed.ts 1:1,
// swapping the script's Keypair signers for the connected wallet.
//
// commit_quote is the load-bearing one: it requires an Ed25519 signature-verify
// instruction IMMEDIATELY BEFORE it in the same transaction (the on-chain
// verifier reads it from the instructions sysvar). We build that preinstruction
// with Ed25519Program.createInstructionWithPublicKey over the liquidity-guard
// pubkey / commit hash / proof, exactly as seed.ts does.

import { BN, type Program } from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  Ed25519Program,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { SettlementEngine } from "@/chain/idl/settlement_engine";
import type { RfqAccount } from "@/chain/accounts/rfq";
import {
  deriveConfigPda,
  deriveQuotePda,
  deriveSettlementPda,
  deriveSlashedBondsTrackerPda,
  deriveFeesTrackerPda,
} from "@/chain/pda";
import { env } from "@/chain/env";
import { toFacilitatorUpdateArg } from "./shared";
import type { FacilitatorUpdate } from "@/types/rfq";

type SettlementProgram = Program<SettlementEngine>;

function ata(mint: PublicKey, owner: PublicKey, ownerOffCurve = false): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner, ownerOffCurve);
}

function configPda(): PublicKey {
  return deriveConfigPda(env.programId)[0];
}

function quotePda(rfq: PublicKey, taker: PublicKey): PublicKey {
  return deriveQuotePda(env.programId, rfq, taker)[0];
}

// ---------------------------------------------------------------------------
// commit_quote — post the SHA-256 commit hash + liquidity_proof and the bond.
// The Ed25519 preinstruction proves the liquidity-guard signed the hash.
// ---------------------------------------------------------------------------

export interface CommitQuoteParams {
  program: SettlementProgram;
  taker: PublicKey;
  rfq: PublicKey;
  usdcMint: PublicKey;
  /** 32-byte SHA-256 commit hash from the attestation. */
  commitHash: Uint8Array;
  /** 64-byte ed25519 signature over the commit hash (the liquidity proof). */
  liquidityProof: Uint8Array;
  /** Config.liquidity_guard — the pubkey the on-chain verifier checks against. */
  liquidityGuardPubkey: PublicKey;
  facilitator: PublicKey | null;
}

export async function buildCommitQuoteTx(p: CommitQuoteParams): Promise<Transaction> {
  const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
    publicKey: p.liquidityGuardPubkey.toBytes(),
    message: p.commitHash,
    signature: p.liquidityProof,
  });
  const commitIx = await p.program.methods
    .commitQuote(Array.from(p.commitHash), Array.from(p.liquidityProof), p.facilitator)
    .accountsPartial({
      taker: p.taker,
      rfq: p.rfq,
      usdcMint: p.usdcMint,
      config: configPda(),
      instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      takerPaymentAccount: ata(p.usdcMint, p.taker),
    })
    .instruction();
  // The verify instruction MUST precede commit_quote in the same tx.
  return new Transaction().add(ed25519Ix).add(commitIx);
}

// ---------------------------------------------------------------------------
// reveal_quote — disclose salt + quote_amount; the program re-derives the hash.
// ---------------------------------------------------------------------------

export interface RevealQuoteParams {
  program: SettlementProgram;
  taker: PublicKey;
  rfq: PublicKey;
  salt: Uint8Array; // 64 bytes
  quoteAmount: bigint;
}

export async function buildRevealQuoteTx(p: RevealQuoteParams): Promise<Transaction> {
  return p.program.methods
    .revealQuote(Array.from(p.salt), new BN(p.quoteAmount.toString()))
    .accountsPartial({
      rfq: p.rfq,
      quote: quotePda(p.rfq, p.taker),
      taker: p.taker,
      config: configPda(),
    })
    .transaction();
}

// ---------------------------------------------------------------------------
// complete_settlement — the taker funds; base/quote/fees route, bonds refund.
// quote + slashed_bonds_tracker are passed as remaining accounts (the handler
// looks them up by derivation). Needs the CU bump (many token transfers).
// ---------------------------------------------------------------------------

export interface CompleteSettlementParams {
  program: SettlementProgram;
  taker: PublicKey;
  rfqPda: PublicKey;
  rfq: RfqAccount;
}

export async function buildCompleteSettlementTx(p: CompleteSettlementParams): Promise<Transaction> {
  const { rfq, rfqPda, taker } = p;
  const maker = rfq.maker;
  const usdc = rfq.usdcMint;
  const base = rfq.baseMint;
  const quoteMint = rfq.quoteMint;
  const treasury = rfq.treasuryWallet;

  const ix = await p.program.methods
    .completeSettlement()
    .accountsPartial({
      taker,
      config: configPda(),
      treasuryWallet: treasury,
      rfq: rfqPda,
      settlement: deriveSettlementPda(env.programId, rfqPda)[0],
      usdcMint: usdc,
      baseMint: base,
      quoteMint,
      takerPaymentAccount: ata(usdc, taker),
      makerPaymentAccount: ata(usdc, maker),
      vaultBaseAta: ata(base, rfqPda, true),
      takerBaseAccount: ata(base, taker),
      makerQuoteAccount: ata(quoteMint, maker),
      takerQuoteAccount: ata(quoteMint, taker),
      feesTracker: deriveFeesTrackerPda(env.programId, rfqPda)[0],
      treasuryAta: ata(usdc, treasury),
      treasuryQuoteAta: ata(quoteMint, treasury),
      feeEscrow: ata(quoteMint, rfqPda, true),
      bondsEscrow: ata(usdc, rfqPda, true),
    })
    .remainingAccounts([
      { pubkey: quotePda(rfqPda, taker), isSigner: false, isWritable: true },
      {
        pubkey: deriveSlashedBondsTrackerPda(env.programId, rfqPda)[0],
        isSigner: false,
        isWritable: true,
      },
    ])
    .instruction();

  return new Transaction()
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
    .add(ix);
}

// ---------------------------------------------------------------------------
// refund_quote_bonds — reclaim a revealed-but-unselected bond after funding.
// ---------------------------------------------------------------------------

export interface RefundQuoteBondsParams {
  program: SettlementProgram;
  taker: PublicKey;
  rfqPda: PublicKey;
  rfq: RfqAccount;
}

export async function buildRefundQuoteBondsTx(p: RefundQuoteBondsParams): Promise<Transaction> {
  const { rfq, rfqPda, taker } = p;
  return p.program.methods
    .refundQuoteBonds()
    .accountsPartial({
      taker,
      config: configPda(),
      treasuryWallet: rfq.treasuryWallet,
      rfq: rfqPda,
      usdcMint: rfq.usdcMint,
      treasuryAta: ata(rfq.usdcMint, rfq.treasuryWallet),
      bondsEscrow: ata(rfq.usdcMint, rfqPda, true),
      takerPaymentAccount: ata(rfq.usdcMint, taker),
      slashedBondsTracker: deriveSlashedBondsTrackerPda(env.programId, rfqPda)[0],
    })
    .transaction();
}

// ---------------------------------------------------------------------------
// set_quote_facilitator — assign / clear the facilitator on the taker's quote.
// ---------------------------------------------------------------------------

export interface SetQuoteFacilitatorParams {
  program: SettlementProgram;
  taker: PublicKey;
  rfqPda: PublicKey;
  update: FacilitatorUpdate;
}

export async function buildSetQuoteFacilitatorTx(
  p: SetQuoteFacilitatorParams,
): Promise<Transaction> {
  return p.program.methods
    .setQuoteFacilitator(toFacilitatorUpdateArg(p.update))
    .accountsPartial({
      taker: p.taker,
      rfq: p.rfqPda,
      quote: quotePda(p.rfqPda, p.taker),
    })
    .transaction();
}
