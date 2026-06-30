# Seeding on-chain RFQ data (`seed.ts`)

`npm run seed` drives RFQs through **all 9 lifecycle states** on a live cluster
so the Marketplace / RFQ-detail / My-Activity screens render real chain state
(Phase 2b, #30). It is self-contained: it mirrors the patterns from
`../../settlement-engine/tests/*.spec.ts` and builds the Anchor program from the
committed IDL (`src/chain/idl/settlement_engine.json`).

```bash
npm run seed -- --cluster devnet \
  [--rpc https://your-devnet-rpc] \
  [--payer ~/.config/solana/id.json] \
  [--maker-keypair ~/maker.json] \
  [--facilitator <YOUR_WALLET_PUBKEY>] \
  [--liquidity-guard <url>] \
  [--usdc-source ~/usdc-holder.json] \
  [--only draft,open,committed,revealed,selected,settled,expired,ignored,incomplete]
```

> **Use a private `--rpc`.** The public `api.devnet.solana.com` rate-limits (HTTP 429)
> the burst of mint/ATA/funding transactions and the run aborts mid-setup. Pass a
> private devnet RPC via `--rpc` (or the `RPC_URL` env var). Verified: preflight and
> mint creation succeed on the public RPC, then it 429s in the funding loop.

`--cluster` defaults to **devnet**. The devnet liquidity-guard defaults to the **real**
(balance-checking) instance whose ed25519 key matches the on-chain `Config.liquidity_guard` —
**not** a `skip_fund_checks` instance, because the program's `commit_quote` rejects a signature
from any other key. Override the URL with `--liquidity-guard` only if Config points elsewhere
(the preflight cross-checks `Config.liquidity_guard` against the instance's `/health.service_pubkey`
and aborts on drift).

> **Past Draft, the seed needs USDC.** Only `init_rfq` (Draft) moves no tokens. `open_rfq`
> transfers the **maker's** USDC bond and `commit_quote` transfers each **taker's** — all in
> `Config.usdc_mint`, which the payer can't mint on devnet. Supply `--usdc-source <keypair>`
> (a wallet already holding that USDC) and the seed funds the maker + takers; without it, only
> **Draft** seeds (unless the maker wallet already holds the USDC). See "USDC bonds gate" below.

## What it does

1. **Preflight** — checks the RPC is reachable, the `Config` PDA exists, that
   `Config.liquidity_guard` matches the liquidity-guard `/health.service_pubkey`
   (commit_quote fails otherwise), and that the payer has SOL.
2. **Mints** — creates `sBASE` (9dp) and `sALT` (6dp) test mints, uses the
   on-chain `Config.usdc_mint` as the bond mint, and writes a **seed manifest**
   (`src/app/lib/seed-manifest.<cluster>.json`, mint → {symbol, decimals}) the UI
   token resolver reads so seeded pairs render as `sBASE/sALT`.
3. **Scenarios** — one RFQ per state. Interactive states (Draft/Open/Committed)
   use long TTLs so they stay actionable; end states use short TTLs (15 s) and
   real waiting (`waitForChainTime`). Committed/Revealed carry multiple quotes,
   some never revealed, so slashing data is visible.
4. **Summary** — prints `state → RFQ pubkey → Solscan link`.

### USDC bonds gate 8 of the 9 states

Only `init_rfq` (**Draft**) moves no tokens — it just requires the maker's USDC ATA to exist.
Every other state runs `open_rfq`, which transfers the **maker's** `Config.usdc_mint` bond
(`bond_amount`). The six quote-bearing states (**Committed / Revealed / Selected / Settled /
Ignored / Incomplete**) additionally run `commit_quote`, which transfers a **taker** bond that
the balance-checking guard also verifies. So:

- **Draft** — seeds with SOL only.
- **Open / Expired** — need the **maker** holding `Config.usdc_mint` USDC.
- **Committed … Incomplete** — need the **maker and takers** holding it.

The seed mints `sBASE`/`sALT` itself, but it **cannot mint** `Config.usdc_mint` (the payer
isn't its authority on devnet). Pass `--usdc-source <keypair>` — a wallet already holding it —
and the seed funds the maker's bond float plus each generated taker (~34 USDC total for a full
run: 10 to the maker, 8×3 to takers). The seed checks live balances, so if the maker wallet
already holds the USDC, `--usdc-source` isn't needed for Open/Expired. **Without sufficient
USDC, the affected states are skipped (logged with the blocking instruction), never silently
truncated — at minimum Draft always seeds.**

Every run **appends** (fresh uuids) — on-chain data can't be wiped. Use `--only`
to (re-)run a subset; the short-TTL groups take a few real minutes each.

## Prerequisites (devnet)

- **Payer keypair** funded with **SOL** (devnet faucet / `solana airdrop`). Pays
  rent + fees, is the mint authority for `sBASE`/`sALT`, and (by default) is the
  maker.
- **USDC for every state past Draft.** `open_rfq` transfers the maker's
  `Config.usdc_mint` bond and `commit_quote` transfers each taker's (the non-skip
  guard verifies balances). The payer can't mint that mint, so supply
  `--usdc-source <keypair>` holding it (~34 USDC for a full run). Only Draft needs
  none. See "USDC bonds gate" above.
- The devnet **liquidity-guard** must be up and its `/health.service_pubkey` must
  match `Config.liquidity_guard` (the script polls `/health` with backoff and
  aborts on drift; Heroku cold-starts take a few seconds).

## Wallet-aware flags

- `--maker-keypair` — this key signs a subset of RFQs. Import it into Phantom →
  **My Activity ▸ RFQs I posted** populates.
- `--facilitator <pubkey>` — assigned via `set_rfq_facilitator` (maker) and the
  `commit_quote` facilitator arg (taker); both are seed-controlled keys, so the
  facilitator wallet needs no signature. RFQs driven to **Settled** leave a
  **claimable** facilitator reward (the seed cannot call `withdraw_reward` — that
  needs the facilitator's key; the claim UI is #15). Pass your own wallet here to
  see it under **My Activity ▸ Needs your attention**.

## After seeding

Commit the regenerated `src/app/lib/seed-manifest.devnet.json` so the deployed UI
resolves the seeded mint symbols/decimals. (The UI currently imports the
**devnet** manifest; localnet symbol resolution is a follow-up.)

## Localnet

```bash
# 1. program + validator (sibling repo)
bash scripts/dev-localnet.sh
# 2. local liquidity-guard, signing key == Config.liquidity_guard
SIGNING_KEY=<…> SKIP_FUND_CHECKS=true SOLANA_NETWORK=localnet cargo run  # in ../liquidity-guard
# 3. seed
npm run seed -- --cluster localnet --facilitator <YOUR_WALLET_PUBKEY>
```

On localnet the test USDC mint is controllable, so the script can mint bond USDC
to all actors directly.
