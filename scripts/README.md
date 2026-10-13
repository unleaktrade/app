# Scripts

| File                    | Run with                                                  | What it does                                                                                                                  |
| ----------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `seed.ts`               | `npm run seed`                                            | Seeds RFQs in all 9 lifecycle states (documented below)                                                                       |
| `copy-idl.sh`           | `npm run copy-idl`                                        | Copies the IDL and generated types from `../settlement-engine/target` into `src/chain/idl/` (run `anchor build` there first)  |
| `dev-localnet.sh`       | `bash scripts/dev-localnet.sh`                            | Starts `anchor localnet`, airdrops 10 SOL to the CLI wallet, builds and deploys the program. Does **not** initialise `Config` |
| `gen-dev-wallets.mjs`   | `node scripts/gen-dev-wallets.mjs <dir>`                  | Writes three throwaway, unfunded keypairs (`maker`, `taker1`, `taker2`) for use as `DEV_WALLET_KEYPAIR_DIR`                   |
| `check-bundle-size.mjs` | `node scripts/check-bundle-size.mjs [--markdown\|--json]` | Gzips the JS in `build/` and fails when it exceeds `bundle-budget.json` (run `npm run build` first)                           |
| `bundle-budget.json`    | —                                                         | The gzip budgets: 600 kB initial load, 650 kB total JS                                                                        |

## Seeding on-chain RFQ data (`seed.ts`)

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
  [--api-key <key>] \
  [--usdc-source ~/usdc-holder.json] \
  [--fresh-mints] \
  [--only draft,open,committed,revealed,selected,settled,expired,ignored,incomplete]
```

> **Use a private `--rpc`.** The public `api.devnet.solana.com` rate-limits (HTTP 429)
> the burst of mint/ATA/funding transactions and the run aborts mid-setup. Pass a
> private devnet RPC via `--rpc` (or the `RPC_URL` env var). Verified: preflight and
> mint creation succeed on the public RPC, then it 429s in the funding loop.

`--cluster` is `devnet` (default) or `localnet`. `--payer` falls back to
`$ANCHOR_WALLET`, then `~/.config/solana/id.json`. The devnet liquidity-guard defaults to the **real**
(balance-checking) instance whose ed25519 key matches the on-chain `Config.liquidity_guard` —
**not** a `skip_fund_checks` instance, because the program's `commit_quote` rejects a signature
from any other key. Override the URL with `--liquidity-guard` only if Config points elsewhere
(the preflight cross-checks `Config.liquidity_guard` against the instance's `/health.service_pubkey`
and aborts on drift).

When the guard runs with `API_KEYS`, `/check` needs a key: pass `--api-key <key>` (or set
`LG_API_KEY`). Use a key issued for scripts, not the one baked into the app bundle. Without
it the seed aborts at the first commit with a 401 hint; `/health` never needs a key.

> **Past Draft, the seed needs USDC.** Only `init_rfq` (Draft) moves no tokens. `open_rfq`
> transfers the **maker's** USDC bond and `commit_quote` transfers each **taker's** — all in
> `Config.usdc_mint`, which the payer can't mint on devnet. Supply `--usdc-source <keypair>`
> (a wallet already holding that USDC) and the seed funds the maker + takers; without it, only
> **Draft** seeds (unless the maker wallet already holds the USDC). See "USDC bonds gate" below.

## What it does

1. **Preflight** — checks the RPC is reachable, the `Config` PDA exists, that
   `Config.liquidity_guard` matches the liquidity-guard `/health.service_pubkey`
   (commit_quote fails otherwise), and that the payer has enough SOL (≥ 0.2 SOL
   for a Draft-only run, ≥ 0.6 SOL for any run that goes past Draft).
2. **Mints** — uses the on-chain `Config.usdc_mint` as the bond mint and
   **reuses** the `sBASE` (9dp) / `sALT` (6dp) test mints recorded in the
   committed **seed manifest** (`src/app/lib/seed-manifest.<cluster>.json`,
   mint → {symbol, decimals}) that the UI token resolver reads so seeded pairs
   render as `sBASE/sALT`. Nothing is written in that case. New mints are
   created and the manifest rewritten only with `--fresh-mints` (or when no
   manifest exists yet): use it for a first-ever seed or a deliberate reset,
   after which every wallet must be re-funded with the new mints.
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

The seed mints `sBASE`/`sALT` tokens to its actors itself, but it **cannot mint**
`Config.usdc_mint` (the payer isn't its authority). Pass `--usdc-source <keypair>` — a wallet already holding it —
and the seed funds the maker's bond float plus each generated taker (~34 USDC total for a full
run: 10 to the maker, 8×3 to takers). The seed checks live balances, so if the maker wallet
already holds the USDC, `--usdc-source` isn't needed for Open/Expired. **Without sufficient
USDC, the affected states are skipped (logged with the blocking instruction), never silently
truncated — at minimum Draft always seeds.**

Every run **appends** (fresh uuids) — on-chain data can't be wiped. Use `--only`
to (re-)run a subset; the short-TTL groups take a few real minutes each.

## Prerequisites (devnet)

- **Payer keypair** funded with **SOL** (devnet faucet / `solana airdrop`):
  at least 0.2 SOL for Draft only, 0.6 SOL otherwise. It pays rent + fees,
  sends 0.1 SOL to each generated taker (and 0.5 SOL to a separate
  `--maker-keypair`), and (by default) is the maker. It must be the **mint
  authority of the `sBASE`/`sALT` mints in the manifest**, i.e. the keypair
  that created them; otherwise pass `--fresh-mints`.
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
  needs the facilitator's key). Pass your own wallet here to see it under
  **My Activity ▸ Needs your attention** and claim it in the app.

## After seeding

After a `--fresh-mints` run, commit the regenerated
`src/app/lib/seed-manifest.devnet.json` so the deployed UI resolves the seeded
mint symbols/decimals (a default run reuses the mints and changes nothing). (The UI currently imports the
**devnet** manifest; localnet symbol resolution is a follow-up.)

## Localnet

```bash
# 1. program + validator (sibling repo)
bash scripts/dev-localnet.sh
# 2. local liquidity-guard on :8080, signing key == Config.liquidity_guard
SIGNING_KEY=<…> USDC_MINT=<local USDC mint> SKIP_FUND_CHECKS=true SOLANA_NETWORK=localnet cargo run  # in ../liquidity-guard
# 3. initialise Config once (the seed aborts without it), in ../settlement-engine
ANCHOR_PROVIDER_URL=localnet LIQUIDITY_GUARD=<guard /health service_pubkey> \
  USDC_MINT=<local USDC mint> yarn init-config
# 4. seed
npm run seed -- --cluster localnet --usdc-source <keypair holding the local USDC mint> \
  --facilitator <YOUR_WALLET_PUBKEY>
```

There is no localnet shortcut for bond USDC: the seed only ever **transfers**
`Config.usdc_mint` from `--usdc-source`, exactly as on devnet. On localnet you
control that mint, so create it and mint to the source wallet yourself first
(`spl-token create-token`, `spl-token mint`). Without `--usdc-source` only Draft
seeds. `dev-localnet.sh` prints a hint to run `anchor run init-config`; that
alias does not exist, use the command in step 3. There is no committed localnet
manifest, so the first localnet seed creates the `sBASE`/`sALT` mints.
