/**
 * Phase 2b devnet/localnet seed driver.
 *
 * Drives RFQs through all 9 lifecycle states against a LIVE cluster so the
 * Marketplace / RFQ-detail / My-Activity screens render real chain state.
 * Self-contained — it copies the patterns from
 * ../settlement-engine/tests/*.spec.ts (PDA derivers, the liquidity-guard
 * attestation + Ed25519 commit flow, TTL-based state advancement) rather than
 * importing them, and builds the Anchor Program from the committed IDL.
 *
 *   npm run seed -- --cluster devnet  [--payer <id.json>] \
 *                   [--maker-keypair <id.json>] [--facilitator <pubkey>] \
 *                   [--liquidity-guard <url>] [--usdc-source <id.json>] \
 *                   [--only draft,open,committed,…]
 *
 * Time cannot be warped on a live cluster: interactive states (Draft/Open/
 * Committed) use long TTLs so they stay actionable; end states use short TTLs
 * and real waiting. Every run APPENDS (fresh uuids) — the chain can't be wiped.
 *
 * Only Draft moves no tokens. open_rfq posts the *maker's* USDC bond and
 * commit_quote posts *taker* USDC bonds — all in Config.usdc_mint, which the
 * payer can't mint on devnet. So anything past Draft needs --usdc-source (a
 * wallet already holding that USDC, possibly the maker itself); without one only
 * Draft seeds. See scripts/README.md for prerequisites and the localnet recipe.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// @coral-xyz/anchor is CommonJS; under tsx's ESM loader the cjs-module-lexer
// can't see re-exported names like `BN` (it comes from bn.js), so a named
// `import { BN }` throws "does not provide an export named 'BN'". Import the
// default (the whole module.exports) and destructure values from it. The `Idl`
// type is erased at compile time, so a named type-only import is still fine.
import anchorPkg from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
const { AnchorProvider, BN, Program, Wallet, web3 } = anchorPkg;
import {
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
} from "@solana/spl-token";
import nacl from "tweetnacl";
import { v4 as uuidv4, parse as uuidParse } from "uuid";

const {
  ComputeBudgetProgram,
  Connection,
  Ed25519Program,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} = web3;
type PublicKeyT = InstanceType<typeof PublicKey>;
type KeypairT = InstanceType<typeof Keypair>;
type ConnectionT = InstanceType<typeof Connection>;

const HERE = dirname(fileURLToPath(import.meta.url));
const IDL_PATH = resolve(HERE, "../src/chain/idl/settlement_engine.json");
const LIB_DIR = resolve(HERE, "../src/app/lib");

type Cluster = "devnet" | "localnet";

interface ClusterConfig {
  endpoint: string;
  liquidityGuard: string;
  manifest: string;
  solscan: (addr: string) => string;
}

const CLUSTERS: Record<Cluster, ClusterConfig> = {
  devnet: {
    endpoint: "https://api.devnet.solana.com",
    // The REAL devnet guard (skip_fund_checks:false). Its ed25519 key matches the
    // on-chain Config.liquidity_guard, so commit_quote's signature check passes.
    // The "skip" instance signs with a different key and would be rejected.
    // Because this guard validates balances, takers need real Config.usdc_mint
    // funds (see --usdc-source). Override with --liquidity-guard <url>.
    liquidityGuard: "https://liquidity-guard-devnet-e1779e87cf84.herokuapp.com",
    manifest: "seed-manifest.devnet.json",
    solscan: (a) => `https://solscan.io/account/${a}?cluster=devnet`,
  },
  localnet: {
    endpoint: "http://127.0.0.1:8899",
    liquidityGuard: "http://127.0.0.1:8080",
    manifest: "seed-manifest.localnet.json",
    solscan: (a) => `(localnet) ${a}`,
  },
};

const ALL_GROUPS = [
  "draft",
  "open",
  "committed",
  "revealed",
  "selected",
  "settled",
  "expired",
  "ignored",
  "incomplete",
] as const;
type Group = (typeof ALL_GROUPS)[number];

// Draft is the only state that moves no tokens. Every other state runs open_rfq,
// which transfers the *maker's* USDC bond (init_rfq only needs the ATA to exist).
// These six additionally run commit_quote, which transfers a *taker* USDC bond.
// All bonds are Config.usdc_mint, which the payer can't mint on devnet, so any
// state past Draft needs --usdc-source.
const TAKER_BOND_GROUPS: ReadonlySet<Group> = new Set<Group>([
  "committed",
  "revealed",
  "selected",
  "settled",
  "ignored",
  "incomplete",
]);

// ---------------------------------------------------------------------------
// CLI + keypair loading
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok?.startsWith("--")) {
      const key = tok.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = "true";
      }
    }
  }
  return out;
}

function loadKeypair(path: string): KeypairT {
  const expanded = path.startsWith("~")
    ? resolve(homedir(), path.slice(1).replace(/^\//, ""))
    : path;
  const secret = JSON.parse(readFileSync(expanded, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function uuidBytes(): number[] {
  return Array.from(uuidParse(uuidv4()) as Uint8Array);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// PDA derivation (seeds identical to src/chain/pda.ts + the program)
// ---------------------------------------------------------------------------

function pda(programId: PublicKeyT, seeds: (Buffer | Uint8Array)[]): PublicKeyT {
  return PublicKey.findProgramAddressSync(seeds, programId)[0];
}

const seed = (s: string) => Buffer.from(s);

// ---------------------------------------------------------------------------
// Chain time helper (real waiting — no warp on a live cluster)
// ---------------------------------------------------------------------------

async function chainTime(connection: ConnectionT): Promise<number> {
  const slot = await connection.getSlot();
  const ts = await connection.getBlockTime(slot);
  if (ts === null) throw new Error("block time unavailable");
  return ts;
}

async function waitForChainTime(
  connection: ConnectionT,
  target: number,
  label: string,
): Promise<void> {
  let now = await chainTime(connection);
  while (now <= target) {
    const remaining = target - now + 1;
    process.stdout.write(
      `\r  ⏳ ${label}: waiting ~${remaining}s (chain=${now}, target=${target})   `,
    );
    await sleep(Math.min(2000, remaining * 1000));
    now = await chainTime(connection);
  }
  process.stdout.write("\n");
}

// ---------------------------------------------------------------------------
// liquidity-guard attestation (POST /check) — mirrors the test helper
// ---------------------------------------------------------------------------

interface Attestation {
  salt: Uint8Array;
  commitHash: Buffer;
  liquidityProof: Buffer;
}

async function fetchHealthPubkey(lgUrl: string): Promise<string> {
  // The Heroku guard can cold-start; poll briefly.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`${lgUrl}/health`);
      if (res.ok) {
        const body = (await res.json()) as { service_pubkey: string };
        return body.service_pubkey;
      }
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`liquidity-guard /health unreachable at ${lgUrl}: ${String(lastErr)}`);
}

async function attest(
  lgUrl: string,
  taker: KeypairT,
  rfq: PublicKeyT,
  quoteMint: PublicKeyT,
  quoteAmount: number,
  bondAmount: number,
  takerFeeBps: number,
): Promise<Attestation> {
  const salt = nacl.sign.detached(rfq.toBytes(), taker.secretKey); // 64-byte ed25519 sig
  const payload = {
    rfq: rfq.toBase58(),
    taker: taker.publicKey.toBase58(),
    salt: Buffer.from(salt).toString("hex"),
    quote_mint: quoteMint.toBase58(),
    quote_amount: String(quoteAmount),
    bond_amount_usdc: String(bondAmount),
    taker_fee_bps: String(takerFeeBps),
  };
  const res = await fetch(`${lgUrl}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as Record<string, string>;
  if (!res.ok || "error" in data) {
    throw new Error(`liquidity-guard /check failed: ${data.error ?? `HTTP ${res.status}`}`);
  }
  return {
    salt,
    commitHash: Buffer.from(data.commit_hash, "hex"),
    liquidityProof: Buffer.from(data.liquidity_proof, "hex"),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface SeededRfq {
  state: string;
  pair: string;
  rfq: PublicKeyT;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cluster = (args.cluster ?? "devnet") as Cluster;
  if (cluster !== "devnet" && cluster !== "localnet") {
    throw new Error(`--cluster must be devnet|localnet, got: ${args.cluster}`);
  }
  const cfg = CLUSTERS[cluster];
  const groups: Set<Group> = new Set(
    args.only ? (args.only.split(",") as Group[]) : [...ALL_GROUPS],
  );

  const payerPath =
    args.payer ?? process.env.ANCHOR_WALLET ?? resolve(homedir(), ".config/solana/id.json");
  const payer = loadKeypair(payerPath);
  const maker = args["maker-keypair"] ? loadKeypair(args["maker-keypair"]) : payer;
  const facilitator = args.facilitator ? new PublicKey(args.facilitator) : null;
  // Liquidity-guard URL: cluster default (the matching, balance-checking guard)
  // unless overridden. A wallet holding Config.usdc_mint funds the maker + taker
  // bonds; without it only Draft seeds (unless the maker already holds the USDC).
  const lgUrl = args["liquidity-guard"] ?? cfg.liquidityGuard;
  const usdcSource = args["usdc-source"] ? loadKeypair(args["usdc-source"]) : null;
  // Public api.devnet.solana.com aggressively rate-limits (429) the burst of
  // funding/setup txns. Point --rpc (or RPC_URL) at a private devnet endpoint.
  const endpoint = args.rpc ?? process.env.RPC_URL ?? cfg.endpoint;

  const connection = new Connection(endpoint, "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(payer), { commitment: "confirmed" });
  const idl = JSON.parse(readFileSync(IDL_PATH, "utf8")) as Idl;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = new Program(idl, provider) as any;
  const programId = program.programId as PublicKeyT;

  console.log(`\n🌱 Seeding ${cluster}`);
  console.log(`   endpoint        ${endpoint}`);
  console.log(`   program         ${programId.toBase58()}`);
  console.log(`   payer           ${payer.publicKey.toBase58()}`);
  console.log(`   maker           ${maker.publicKey.toBase58()}`);
  console.log(`   facilitator     ${facilitator?.toBase58() ?? "(none)"}`);
  console.log(`   liquidity-guard ${lgUrl}`);
  console.log(
    `   usdc-source     ${
      usdcSource?.publicKey.toBase58() ?? "(none → Draft only, unless the maker already holds USDC)"
    }`,
  );
  console.log(`   state groups    ${[...groups].join(", ")}\n`);

  // --- Preflight -----------------------------------------------------------
  const configPda = pda(programId, [seed("config")]);
  const config = await program.account.config.fetchNullable(configPda);
  if (!config) {
    throw new Error(
      `Config PDA ${configPda.toBase58()} does not exist on ${cluster}.\n` +
        `Run ../settlement-engine/scripts/init-config-devnet.ts first.`,
    );
  }
  const usdcMint = config.usdcMint as PublicKeyT;
  const treasuryWallet = config.treasuryWallet as PublicKeyT;
  const onChainGuard = (config.liquidityGuard as PublicKeyT).toBase58();
  const healthPubkey = await fetchHealthPubkey(lgUrl);
  if (onChainGuard !== healthPubkey) {
    throw new Error(
      `liquidity-guard pubkey drift: Config.liquidityGuard=${onChainGuard} but ` +
        `${lgUrl}/health.service_pubkey=${healthPubkey}. commit_quote would fail.\n` +
        `Point --liquidity-guard at the instance whose key matches Config (its /health.service_pubkey).`,
    );
  }
  // A full bonded run also pays ~0.1 SOL of rent+fees per generated taker and
  // the account rents for up to 8 RFQs, so require more headroom than a Draft run.
  const seedsBonded = [...groups].some((g) => g !== "draft");
  const minSol = seedsBonded ? 0.6 : 0.2;
  const payerSol = await connection.getBalance(payer.publicKey);
  if (payerSol < minSol * web3.LAMPORTS_PER_SOL) {
    throw new Error(
      `Payer has ${(payerSol / web3.LAMPORTS_PER_SOL).toFixed(3)} SOL — needs ≥${minSol} for ` +
        `this run (rent + per-taker SOL). Fund it (devnet faucet) before seeding.`,
    );
  }
  console.log(`   ✓ Config OK, liquidity-guard pubkey matches (${healthPubkey})`);
  console.log(`   ✓ USDC (bond) mint ${usdcMint.toBase58()}\n`);

  // --- Test mints + manifest ----------------------------------------------
  console.log("Creating test mints (sBASE 9dp, sALT 6dp)…");
  const sBase = await createMint(connection, payer, payer.publicKey, null, 9);
  const sAlt = await createMint(connection, payer, payer.publicKey, null, 6);
  const manifest: Record<string, { symbol: string; decimals: number }> = {
    [usdcMint.toBase58()]: { symbol: "USDC", decimals: 6 },
    [sBase.toBase58()]: { symbol: "sBASE", decimals: 9 },
    [sAlt.toBase58()]: { symbol: "sALT", decimals: 6 },
  };
  writeFileSync(resolve(LIB_DIR, cfg.manifest), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`   sBASE ${sBase.toBase58()}`);
  console.log(`   sALT  ${sAlt.toBase58()}`);
  console.log(`   wrote src/app/lib/${cfg.manifest}\n`);

  // Economics — base = sBASE, quote = sALT (UI shows sBASE/sALT); bond = USDC.
  const BASE_MINT = sBase;
  const QUOTE_MINT = sAlt;
  const PAIR = "sBASE/sALT";
  const BASE_AMOUNT = 10_000_000_000; // 10 sBASE (9dp)
  const MIN_QUOTE = 9_000_000; // 9 sALT (6dp)
  const BOND = 1_000_000; // 1 USDC (6dp)
  const TAKER_FEE_BPS = 100; // 1%

  // Test takers (seed-controlled) — funded with base/quote/USDC.
  const takers = [Keypair.generate(), Keypair.generate(), Keypair.generate()];

  async function fundToken(mint: PublicKeyT, owner: KeypairT, amount: number) {
    const ata = await getOrCreateAssociatedTokenAccount(connection, payer, mint, owner.publicKey);
    await mintTo(connection, payer, mint, ata.address, payer, amount);
    return ata.address;
  }

  // Generated signers start with 0 SOL but pay rent for the accounts the program
  // `init`s with payer = <them> — commit_quote (Quote + CommitGuard) and
  // complete_settlement/refund (settlement + ATAs) — plus per-tx fees. Top them up
  // from the payer so those CPIs don't fail with `insufficient lamports`.
  async function fundSol(owner: PublicKeyT, lamports: number) {
    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: owner, lamports }),
    );
    await provider.sendAndConfirm(tx, []);
  }

  // init_rfq/open_rfq/close_expired all reference the maker's USDC payment ATA —
  // init_rfq needs it only to exist, but open_rfq *moves* the maker's bond out of
  // it — so always ensure it exists.
  const makerUsdcAta = (
    await getOrCreateAssociatedTokenAccount(connection, payer, usdcMint, maker.publicKey)
  ).address;

  // Draft is the only state that moves no tokens. Every other state runs open_rfq
  // (maker USDC bond); the six quote-bearing ones also run commit_quote (taker
  // USDC bonds). The payer can't mint Config.usdc_mint on devnet, so those bonds
  // come from --usdc-source (which may be the maker itself if it already holds
  // USDC). Funding also mints the sBASE the maker escrows at select_quote and the
  // sALT the guard's quote-balance check reads.
  const wantBonded = [...groups].some((g) => g !== "draft");
  const MAKER_USDC = BOND * 10; // ≥ one bond per non-draft open this run, with margin
  const PER_TAKER_USDC = BOND * 8; // takers[0] may bond in up to 6 scenarios
  // SOL each taker needs for account rent (Quote, CommitGuard, settlement, ATAs)
  // across commit/reveal/complete/refund, plus tx fees.
  const TAKER_SOL = Math.floor(0.1 * web3.LAMPORTS_PER_SOL);
  if (usdcSource && wantBonded) {
    try {
      // A separate --maker-keypair starts empty too; the payer-as-maker already has SOL.
      if (!maker.publicKey.equals(payer.publicKey)) {
        await fundSol(maker.publicKey, Math.floor(0.5 * web3.LAMPORTS_PER_SOL));
      }
      for (const a of [maker, ...takers]) {
        await fundToken(sBase, a, 1_000_000_000_000); // 1k sBASE
        await fundToken(sAlt, a, 1_000_000_000); // 1k sALT
      }
      const srcAta = getAssociatedTokenAddressSync(usdcMint, usdcSource.publicKey);
      // Maker bond float — skip if the source *is* the maker (it already holds it).
      if (!usdcSource.publicKey.equals(maker.publicKey)) {
        await transfer(connection, payer, srcAta, makerUsdcAta, usdcSource, MAKER_USDC);
      }
      for (const t of takers) {
        await fundSol(t.publicKey, TAKER_SOL); // rent + fees for taker-signed ixns
        const dst = (
          await getOrCreateAssociatedTokenAccount(connection, payer, usdcMint, t.publicKey)
        ).address;
        await transfer(connection, payer, srcAta, dst, usdcSource, PER_TAKER_USDC);
      }
      console.log(
        `   ✓ funded maker (${MAKER_USDC / 1_000_000} USDC) + ${takers.length} takers ` +
          `(${PER_TAKER_USDC / 1_000_000} USDC + ${TAKER_SOL / web3.LAMPORTS_PER_SOL} SOL each)\n`,
      );
    } catch (e) {
      console.log(
        `   ✗ USDC bond funding failed (source ${usdcSource.publicKey.toBase58()} likely ` +
          `underfunded — needs ~${(MAKER_USDC + PER_TAKER_USDC * takers.length) / 1_000_000} USDC ` +
          `of ${usdcMint.toBase58()}): ${e instanceof Error ? e.message : String(e)}\n`,
      );
    }
  }

  // Readiness from actual on-chain balances — works whether funded just now or
  // pre-held by the maker. makerBonded gates open/expired (and is a prerequisite
  // for everything past Draft); takersBonded additionally gates the six
  // quote-bearing states.
  const usdcBalance = async (owner: PublicKeyT) =>
    (await getAccount(connection, getAssociatedTokenAddressSync(usdcMint, owner)).catch(() => null))
      ?.amount ?? 0n;
  const makerBonded = (await usdcBalance(maker.publicKey)) >= BigInt(BOND);
  const takersBonded = (await usdcBalance(takers[0]!.publicKey)) >= BigInt(BOND);

  if (wantBonded && !makerBonded) {
    console.log(
      `ℹ Maker holds no ${usdcMint.toBase58()} USDC ` +
        `(${usdcSource ? "source underfunded" : "no --usdc-source"}). open_rfq can't post its ` +
        `bond, so only Draft will seed. Pass --usdc-source <keypair holding that USDC>.\n`,
    );
  } else if (makerBonded && !takersBonded && [...groups].some((g) => TAKER_BOND_GROUPS.has(g))) {
    console.log(
      `ℹ Takers hold no ${usdcMint.toBase58()} USDC. commit_quote can't post taker bonds, so the ` +
        `quote-bearing states (committed/revealed/selected/settled/ignored/incomplete) are skipped; ` +
        `Draft/Open/Expired still seed.\n`,
    );
  }

  const seeded: SeededRfq[] = [];

  // Scenario builder ---------------------------------------------------------
  function rfqPdaFor(makerPk: PublicKeyT, uuid: number[]): PublicKeyT {
    return pda(programId, [seed("rfq"), makerPk.toBytes(), Uint8Array.from(uuid)]);
  }

  async function initRfq(
    makerKp: KeypairT,
    ttls: { commit: number; reveal: number; selection: number; fund: number },
    withFacilitator: boolean,
  ): Promise<{ rfq: PublicKeyT; uuid: number[] }> {
    const uuid = uuidBytes();
    const rfq = rfqPdaFor(makerKp.publicKey, uuid);
    const bondsEscrow = getAssociatedTokenAddressSync(usdcMint, rfq, true);
    const makerPayment = getAssociatedTokenAddressSync(usdcMint, makerKp.publicKey);
    await program.methods
      .initRfq(
        uuid,
        BASE_MINT,
        QUOTE_MINT,
        new BN(BOND),
        new BN(BASE_AMOUNT),
        new BN(MIN_QUOTE),
        TAKER_FEE_BPS,
        ttls.commit,
        ttls.reveal,
        ttls.selection,
        ttls.fund,
        withFacilitator ? facilitator : null,
      )
      .accounts({
        maker: makerKp.publicKey,
        config: configPda,
        usdcMint,
        bondsEscrow,
        makerPaymentAccount: makerPayment,
      })
      .signers([makerKp])
      .rpc();
    return { rfq, uuid };
  }

  async function openRfq(makerKp: KeypairT, rfq: PublicKeyT) {
    const bondsEscrow = getAssociatedTokenAddressSync(usdcMint, rfq, true);
    const makerPayment = getAssociatedTokenAddressSync(usdcMint, makerKp.publicKey);
    await program.methods
      .openRfq()
      .accounts({
        maker: makerKp.publicKey,
        rfq,
        config: configPda,
        bondsEscrow,
        makerPaymentAccount: makerPayment,
        usdcMint,
      })
      .signers([makerKp])
      .rpc();
  }

  async function commitQuote(taker: KeypairT, rfq: PublicKeyT, withFacilitator: boolean) {
    const att = await attest(lgUrl, taker, rfq, QUOTE_MINT, MIN_QUOTE, BOND, TAKER_FEE_BPS);
    const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
      publicKey: (config.liquidityGuard as PublicKeyT).toBytes(),
      message: att.commitHash,
      signature: att.liquidityProof,
    });
    const takerPayment = getAssociatedTokenAddressSync(usdcMint, taker.publicKey);
    const commitIx = await program.methods
      .commitQuote(
        Array.from(att.commitHash),
        Array.from(att.liquidityProof),
        withFacilitator ? facilitator : null,
      )
      .accounts({
        taker: taker.publicKey,
        rfq,
        usdcMint,
        config: configPda,
        instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        takerPaymentAccount: takerPayment,
      })
      .instruction();
    const tx = new Transaction().add(ed25519Ix).add(commitIx);
    await provider.sendAndConfirm(tx, [taker]);
    return att.salt;
  }

  async function revealQuote(taker: KeypairT, rfq: PublicKeyT, salt: Uint8Array) {
    const quote = pda(programId, [seed("quote"), rfq.toBytes(), taker.publicKey.toBytes()]);
    await program.methods
      .revealQuote(Array.from(salt), new BN(MIN_QUOTE))
      .accounts({ rfq, quote, taker: taker.publicKey, config: configPda })
      .signers([taker])
      .rpc();
  }

  async function setRfqFacilitator(makerKp: KeypairT, rfq: PublicKeyT) {
    if (!facilitator) return;
    await program.methods
      .setRfqFacilitator({ set: [facilitator] })
      .accounts({ maker: makerKp.publicKey, rfq })
      .signers([makerKp])
      .rpc();
  }

  async function selectQuote(makerKp: KeypairT, rfq: PublicKeyT, taker: KeypairT) {
    const quote = pda(programId, [seed("quote"), rfq.toBytes(), taker.publicKey.toBytes()]);
    const vaultBase = getAssociatedTokenAddressSync(BASE_MINT, rfq, true);
    const makerBase = getAssociatedTokenAddressSync(BASE_MINT, makerKp.publicKey);
    await program.methods
      .selectQuote()
      .accounts({
        maker: makerKp.publicKey,
        rfq,
        quote,
        baseMint: BASE_MINT,
        quoteMint: QUOTE_MINT,
        vaultBaseAta: vaultBase,
        makerBaseAccount: makerBase,
        config: configPda,
      })
      .signers([makerKp])
      .rpc();
  }

  async function completeSettlement(makerKp: KeypairT, rfq: PublicKeyT, taker: KeypairT) {
    const settlement = pda(programId, [seed("settlement"), rfq.toBytes()]);
    const quote = pda(programId, [seed("quote"), rfq.toBytes(), taker.publicKey.toBytes()]);
    const slashed = pda(programId, [seed("slashed_bonds_tracker"), rfq.toBytes()]);
    const feesTracker = pda(programId, [seed("fees_tracker"), rfq.toBytes()]);
    await getOrCreateAssociatedTokenAccount(connection, payer, BASE_MINT, taker.publicKey);
    await getOrCreateAssociatedTokenAccount(connection, payer, QUOTE_MINT, makerKp.publicKey);
    await getOrCreateAssociatedTokenAccount(connection, payer, QUOTE_MINT, treasuryWallet).catch(
      () => null,
    );
    await getOrCreateAssociatedTokenAccount(connection, payer, usdcMint, treasuryWallet).catch(
      () => null,
    );
    const budgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 });
    const ix = await program.methods
      .completeSettlement()
      .accounts({
        taker: taker.publicKey,
        config: configPda,
        treasuryWallet,
        rfq,
        settlement,
        usdcMint,
        baseMint: BASE_MINT,
        quoteMint: QUOTE_MINT,
        takerPaymentAccount: getAssociatedTokenAddressSync(usdcMint, taker.publicKey),
        makerPaymentAccount: getAssociatedTokenAddressSync(usdcMint, makerKp.publicKey),
        vaultBaseAta: getAssociatedTokenAddressSync(BASE_MINT, rfq, true),
        takerBaseAccount: getAssociatedTokenAddressSync(BASE_MINT, taker.publicKey),
        makerQuoteAccount: getAssociatedTokenAddressSync(QUOTE_MINT, makerKp.publicKey),
        takerQuoteAccount: getAssociatedTokenAddressSync(QUOTE_MINT, taker.publicKey),
        feesTracker,
        treasuryAta: getAssociatedTokenAddressSync(usdcMint, treasuryWallet),
        treasuryQuoteAta: getAssociatedTokenAddressSync(QUOTE_MINT, treasuryWallet),
        feeEscrow: getAssociatedTokenAddressSync(QUOTE_MINT, rfq, true),
        bondsEscrow: getAssociatedTokenAddressSync(usdcMint, rfq, true),
      })
      .remainingAccounts([
        { pubkey: quote, isSigner: false, isWritable: true },
        { pubkey: slashed, isSigner: false, isWritable: true },
      ])
      .instruction();
    const tx = new Transaction().add(budgetIx).add(ix);
    await provider.sendAndConfirm(tx, [taker]);
  }

  async function closeExpired(makerKp: KeypairT, rfq: PublicKeyT) {
    await program.methods
      .closeExpired()
      .accounts({
        maker: makerKp.publicKey,
        rfq,
        config: configPda,
        usdcMint,
        bondsEscrow: getAssociatedTokenAddressSync(usdcMint, rfq, true),
        treasuryWallet,
        makerPaymentAccount: getAssociatedTokenAddressSync(usdcMint, makerKp.publicKey),
      })
      .signers([makerKp])
      .rpc();
  }

  async function refundQuoteBonds(taker: KeypairT, rfq: PublicKeyT) {
    const slashed = pda(programId, [seed("slashed_bonds_tracker"), rfq.toBytes()]);
    await program.methods
      .refundQuoteBonds()
      .accounts({
        taker: taker.publicKey,
        config: configPda,
        rfq,
        usdcMint,
        bondsEscrow: getAssociatedTokenAddressSync(usdcMint, rfq, true),
        takerPaymentAccount: getAssociatedTokenAddressSync(usdcMint, taker.publicKey),
        treasuryWallet,
        slashBoundsTracker: slashed,
      })
      .signers([taker])
      .rpc();
  }

  async function closeIncomplete(makerKp: KeypairT, rfq: PublicKeyT) {
    const settlement = pda(programId, [seed("settlement"), rfq.toBytes()]);
    const slashed = pda(programId, [seed("slashed_bonds_tracker"), rfq.toBytes()]);
    await program.methods
      .closeIncomplete()
      .accounts({
        maker: makerKp.publicKey,
        config: configPda,
        rfq,
        settlement,
        baseMint: BASE_MINT,
        vaultBaseAta: getAssociatedTokenAddressSync(BASE_MINT, rfq, true),
        makerBaseAccount: getAssociatedTokenAddressSync(BASE_MINT, makerKp.publicKey),
        usdcMint,
        bondsEscrow: getAssociatedTokenAddressSync(usdcMint, rfq, true),
        makerPaymentAccount: getAssociatedTokenAddressSync(usdcMint, makerKp.publicKey),
        treasuryWallet,
        slashBoundsTracker: slashed,
      })
      .signers([makerKp])
      .rpc();
  }

  const LONG = { commit: 86_400, reveal: 86_400, selection: 86_400, fund: 86_400 };
  const record = (state: string, rfq: PublicKeyT) => seeded.push({ state, pair: PAIR, rfq });

  async function run(group: Group, fn: () => Promise<void>) {
    if (!groups.has(group)) return;
    if (group !== "draft" && !makerBonded) {
      console.log(`⏭  ${group}: skipped — open_rfq needs the maker funded with USDC (see above)`);
      return;
    }
    if (TAKER_BOND_GROUPS.has(group) && !takersBonded) {
      console.log(`⏭  ${group}: skipped — commit_quote needs takers funded with USDC (see above)`);
      return;
    }
    console.log(`▶ ${group}`);
    try {
      await fn();
    } catch (e) {
      console.error(`  ✗ ${group} failed:`, e instanceof Error ? e.message : e);
    }
  }

  // --- Scenarios -----------------------------------------------------------
  await run("draft", async () => {
    const { rfq } = await initRfq(maker, LONG, true);
    await setRfqFacilitator(maker, rfq);
    record("Draft", rfq);
  });

  await run("open", async () => {
    const { rfq } = await initRfq(maker, LONG, true);
    await setRfqFacilitator(maker, rfq);
    await openRfq(maker, rfq);
    record("Open", rfq);
  });

  await run("committed", async () => {
    const { rfq } = await initRfq(maker, LONG, true);
    await setRfqFacilitator(maker, rfq);
    await openRfq(maker, rfq);
    await commitQuote(takers[0]!, rfq, true);
    await commitQuote(takers[1]!, rfq, true); // multiple quotes; left un-revealed
    record("Committed", rfq);
  });

  await run("revealed", async () => {
    const ttls = { commit: 15, reveal: 86_400, selection: 86_400, fund: 86_400 };
    const { rfq } = await initRfq(maker, ttls, true);
    await setRfqFacilitator(maker, rfq);
    await openRfq(maker, rfq);
    const opened = await chainTime(connection);
    const salt0 = await commitQuote(takers[0]!, rfq, true);
    await commitQuote(takers[1]!, rfq, true); // never revealed → slashing data
    await waitForChainTime(connection, opened + ttls.commit, "reveal window");
    await revealQuote(takers[0]!, rfq, salt0);
    record("Revealed", rfq);
  });

  await run("selected", async () => {
    const ttls = { commit: 15, reveal: 15, selection: 86_400, fund: 86_400 };
    const { rfq } = await initRfq(maker, ttls, true);
    await setRfqFacilitator(maker, rfq);
    await openRfq(maker, rfq);
    const opened = await chainTime(connection);
    const salt0 = await commitQuote(takers[0]!, rfq, true);
    await waitForChainTime(connection, opened + ttls.commit, "reveal window");
    await revealQuote(takers[0]!, rfq, salt0);
    await waitForChainTime(connection, opened + ttls.commit + ttls.reveal, "selection window");
    await selectQuote(maker, rfq, takers[0]!);
    record("Selected", rfq);
  });

  await run("settled", async () => {
    const ttls = { commit: 15, reveal: 15, selection: 86_400, fund: 86_400 };
    const { rfq } = await initRfq(maker, ttls, true);
    await setRfqFacilitator(maker, rfq);
    await openRfq(maker, rfq);
    const opened = await chainTime(connection);
    const salt0 = await commitQuote(takers[0]!, rfq, true);
    await waitForChainTime(connection, opened + ttls.commit, "reveal window");
    await revealQuote(takers[0]!, rfq, salt0);
    await waitForChainTime(connection, opened + ttls.commit + ttls.reveal, "selection window");
    await selectQuote(maker, rfq, takers[0]!);
    await completeSettlement(maker, rfq, takers[0]!); // leaves a claimable facilitator reward
    record("Settled", rfq);
  });

  await run("expired", async () => {
    // No commits needed: an Open RFQ expires once the reveal deadline lapses with
    // revealed_count == 0 (close_expired accepts state Open|Committed;
    // reveal_deadline = opened_at + commit_ttl + reveal_ttl). Still needs the maker
    // bond from open_rfq, so Expired requires makerBonded but no taker funding.
    const ttls = { commit: 15, reveal: 15, selection: 15, fund: 15 };
    const { rfq } = await initRfq(maker, ttls, false);
    await openRfq(maker, rfq);
    const opened = await chainTime(connection);
    await waitForChainTime(connection, opened + ttls.commit + ttls.reveal, "expiry");
    await closeExpired(maker, rfq);
    record("Expired", rfq);
  });

  await run("ignored", async () => {
    const ttls = { commit: 15, reveal: 15, selection: 15, fund: 15 };
    const { rfq } = await initRfq(maker, ttls, false);
    await openRfq(maker, rfq);
    const opened = await chainTime(connection);
    const salt0 = await commitQuote(takers[0]!, rfq, false);
    await waitForChainTime(connection, opened + ttls.commit, "reveal window");
    await revealQuote(takers[0]!, rfq, salt0); // revealed but never selected
    const funding = opened + ttls.commit + ttls.reveal + ttls.selection + ttls.fund;
    await waitForChainTime(connection, funding, "funding lapse");
    await refundQuoteBonds(takers[0]!, rfq);
    record("Ignored", rfq);
  });

  await run("incomplete", async () => {
    const ttls = { commit: 15, reveal: 15, selection: 86_400, fund: 15 };
    const { rfq } = await initRfq(maker, ttls, false);
    await openRfq(maker, rfq);
    const opened = await chainTime(connection);
    const salt0 = await commitQuote(takers[0]!, rfq, false);
    await waitForChainTime(connection, opened + ttls.commit, "reveal window");
    await revealQuote(takers[0]!, rfq, salt0);
    await waitForChainTime(connection, opened + ttls.commit + ttls.reveal, "selection window");
    await selectQuote(maker, rfq, takers[0]!);
    const selected = await chainTime(connection);
    await waitForChainTime(connection, selected + ttls.fund, "funding lapse"); // never funded
    await closeIncomplete(maker, rfq);
    record("Incomplete", rfq);
  });

  // --- Summary -------------------------------------------------------------
  console.log("\n✅ Seed complete\n");
  console.log("STATE        PAIR        RFQ / Solscan");
  for (const s of seeded) {
    console.log(`${s.state.padEnd(12)} ${s.pair.padEnd(11)} ${cfg.solscan(s.rfq.toBase58())}`);
  }
  console.log(`\nCommit src/app/lib/${cfg.manifest} so the UI resolves sBASE/sALT symbols.`);
  if (facilitator && seeded.some((s) => s.state === "Settled")) {
    console.log(
      `Facilitator ${facilitator.toBase58()} now has a claimable reward on the Settled RFQ.`,
    );
  }
}

main().catch((err) => {
  console.error("\n💥", err);
  process.exit(1);
});
