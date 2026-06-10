# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Frontend for **UnleakTrade**, a confidential OTC / RFQ trading d-app on Solana. It is the app at `app.unleak.trade`; the separate marketing site lives in `../landing-page` (at `unleak.trade`). Phase 1 (#11 + #26) shipped the `src/chain/` foundations: SWA + Anchor wiring, a `signMessage` ownership gate, a TanStack-Query-backed `useConfigAccount()` that live-subscribes to the on-chain `Config` PDA, and the liquidity-guard attestation client. Maker / taker / facilitator screens (Phase 3–5) still render against `src/data/mock.ts`; on-chain tx building lands in #14.

## Stack direction (locked)

On-chain integration uses **Solana Wallet Adapter** (`@solana/wallet-adapter-react` + `-react-ui`) and **Anchor** (`@coral-xyz/anchor`). Do not introduce bespoke auth abstractions, handwritten wallet detection, or a homemade `WalletContext` — SWA owns wallet connection and multi-wallet UI. We do **not** install the `@solana/wallet-adapter-wallets` meta-package (it drags Keystone/Torus/WalletConnect transitive deps with React-19-incompatible peers); Wallet Standard auto-discovery via `WalletProvider wallets={[]}` handles every modern wallet (Phantom / Solflare / Backpack / Glow / MetaMask-Solana / Jupiter / …). Closed in #24.

Goals the stack has to deliver:

- **Multi-wallet** first-class via Wallet Standard auto-discovery. No wallet-specific branches in our code. SWA's themed `WalletMultiButton` is the connect UI and the navbar disconnect control.
- **DX** — one hook per concern (`useWallet`, `useConnection`, `useSettlementProgram`). No bespoke hierarchies or context soup on top of SWA.
- **Performance** — TanStack Query for reads, websocket account subscriptions for live RFQ / Quote updates (Phase 1 task). No polling loops.

**`autoConnect` is scoped, not global** in `src/app/providers/WalletProviders.tsx`. It is the function form `() => Promise.resolve(hasCachedAuthSession())`, so SWA eagerly reconnects **only** when the current tab session was already authenticated (a `signMessage` signature is cached in `sessionStorage`). A fresh tab / first visit returns `false`, so we never eager-connect on a cold load — that is what kept wedging SWA when a previously-authorised but locked wallet was detected (`WalletConnectionError: Connection rejected`) and what swallowed the user-activation gesture Chrome needs for the first extension popup. Those failure modes only ever happened on cold loads, which we no longer auto-connect. SWA catches eager-connect errors internally (`WalletProviderBase` drops them) and falls back to the connect screen, so a locked wallet on refresh degrades gracefully instead of wedging. Because `sessionStorage` survives a refresh but not a tab close, this delivers "refresh stays signed in (no re-prompt)" while preserving "close tab = re-prompt". The `signMessage` challenge in `src/app/providers/AuthProvider.tsx` (#26) still proves the wallet is unlocked; `AuthProvider` holds a `restoring` status during the eager reconnect (and `RootRedirect` / `DashboardLayout` render blank for it) so the dashboard is not flashed away and back. Closed in #27.

## Source of truth is the issues, not the README

`README.md` is pre-refactor and stale — it says React 18, references deleted components (`DashboardHome`, `BrowseRFQs`, `CreateRFQ`, `RFQDetails`), and describes a 3-role UI (per-role tabs, facilitator dashboard, role switcher) that has been **explicitly rejected**. Do not use it as a guide. The authoritative plan lives in:

- **#19** — roadmap (links every phase)
- **#10** — Phase 0: repo hygiene + `My Activity` consolidation
- **#11 + #26** — Phase 1 (Solana/Anchor foundations + signMessage auth gate)
- **#12–#15** — Phases 2–5 (data model, maker/taker/facilitator instructions)
- **#17** — tests & CI
- **#18** — docs (includes a README rewrite)
- **#21** — Figma design file as the visual source of truth: https://www.figma.com/design/vmyQPE8WnUX4a5JEl6C2BA

Re-read the linked issues before starting substantive work.

## UI direction (non-negotiable)

The app has **no role concept in user-facing copy**. The strings `maker`, `taker`, `facilitator` must not appear in UI text, route paths, tab labels, or badges (only in tooltips). Role is derived internally from on-chain state (is the connected wallet `rfq.maker`? does it own a `Quote` PDA on this RFQ? is it `rfq.facilitator`?) and used only to decide which CTAs are legal.

Consequences for the code:

- `src/app/components/MyActivity.tsx` (shipped with Phase 0 #10 + redesigned in #25) is the single activity view — pinned summary bar with a `Claim` CTA above the fold, a `Needs your attention` ribbon of direct-CTA chips, and three collapsible sections (`RFQs I posted` / `Quotes I submitted` / `Rewards history`) with horizontal-scrolling cards inside. Each section auto-expands when it has pending items. Never re-introduce the old `My RFQs` / `My Quotes` / `My Earnings` split.
- One action bar on the RFQ detail page, not three. It shows whichever CTAs are legal for the connected wallet × current state, driven by `state-machine.ts` (Phase 2).
- No `/dashboard/<role>` routes, no role switcher, no role badges.
- **Rewards are denominated in the quote mint of the RFQ being facilitated**, not USD. No oracle in Phase 0/1 — never aggregate amounts into a single `$X.XX`. Show counts in aggregates; show `{amount} {quoteSymbol}` (symbol derived from `getRFQById(reward.rfq).pair.split("/")[1]`) per-row. Same applies to taker fees / per-RFQ fee amounts. See the `project_reward_denomination` memory entry.

## Origin: Figma Make (important gotcha)

The codebase was bootstrapped from **Figma Make** (AI prompt-to-code), not hand-written. Phase 0 (#10) swept the whitespace/naming artefacts; two load-bearing pieces remain:

- `figma:asset` Vite alias → `src/assets/` — still in use by `WalletConnect.tsx` and `MainNavbar.tsx` for the logo.
- `src/app/components/figma/ImageWithFallback.tsx` — thin scaffold wrapper, kept as-is.

`src/app/components/ui/` is the shadcn/ui catalog wrapping Radix primitives. Phase 0 pruned it to the files actually imported by the surviving tree (`button`, `dialog`, `drawer`, `input`, `label`, `select`, `separator`, `sonner`, `tabs`, `utils` — `drawer` is the vaul wrapper added in Phase 2). Don't reintroduce the full catalog — add only the specific ui file you need.

**Never regenerate via Figma Make against this repo again** — it would clobber committed work. The new visual source of truth is the Figma Design file in #21, to be filled in iteratively.

## Commands

```bash
npm install           # install deps — must be zero ERESOLVE / deprecated warnings (#24)
npm run dev           # Vite dev server on :3000, auto-opens browser
npm run build         # production build → build/ (git-ignored)
npm run typecheck     # tsc --noEmit (strict, noUncheckedIndexedAccess, verbatimModuleSyntax)
npm run lint          # eslint src (flat config at eslint.config.js)
npm run format        # prettier --write .
npm run format:check  # prettier --check .
npm test              # vitest run — decoders, state-machine guards, deadline + fee math, PDAs
npm run test:watch    # vitest watch mode
npm run copy-idl      # refresh src/chain/idl/ from ../settlement-engine/target (after `anchor build` there)
bash scripts/dev-localnet.sh   # bring up anchor localnet + deploy program (requires sibling repo)
```

`npm run build` intentionally **does not type-check** — Vite + `@vitejs/plugin-react` only transpile TypeScript. Always run `npm run typecheck` alongside for the real type signal. Pre-commit hook (`.husky/pre-commit` → `lint-staged`) auto-formats staged files and runs ESLint on `.ts`/`.tsx`. Vitest landed with Phase 2 (#12) for the pure-logic suites under `src/chain/__tests__/` (the `test` block in `vite.config.ts` injects hermetic `VITE_*` env vars so CI needs no `.env.local`); RTL + Playwright still land in #17. There is **no Storybook/Ladle** — Ladle's transitive peers break the zero-warning install rule (#24); the DEV-only `/dev/stories` route is the component gallery instead.

The IDL files in `src/chain/idl/` are **committed**, so fresh clones can `npm install && npm run dev` without `../settlement-engine` checked out. Re-run `npm run copy-idl` after the Anchor program changes shape; `.prettierignore` and `eslint.config.js` exclude that directory because the files are generated.

## Browser-testing policy

Any change that touches the running app (routes, wallet flow, modals, styling, anything rendered) **must be end-to-end tested by Claude itself via the `claude-in-chrome` MCP tools** before the task is reported complete. Do not hand a build back to the user with "go test it in your browser" — that wastes a round-trip when Claude has a browser driver available.

Minimum flow on every UI-affecting change:

1. `npm run dev` in the background.
2. `mcp__claude-in-chrome__navigate` to the relevant route.
3. `mcp__claude-in-chrome__javascript_tool` to inspect DOM / `localStorage` / global state.
4. `mcp__claude-in-chrome__read_console_messages` to catch runtime errors (especially the SWA `WalletConnectionError: Request of type 'wallet_requestPermissions' already pending` class of issues — these only surface at click-time, never in `tsc` or `vite build`).
5. Kill the dev server when done (`pkill -f vite`).

If a wallet interaction can't be driven end-to-end by automation (e.g. the extension popup itself requires a real user gesture), drive it as far as possible — click through the modal, verify the adapter fires without errors, check SWA state via `window.phantom?.solana?.isConnected` / `localStorage.walletName` — and explicitly flag the remaining manual step. Silence = assumed-broken.

## Architecture

Entry flow: `index.html` → `src/main.tsx` (side-effect imports `./polyfills` first to set `globalThis.Buffer` / `process` / `global` before any Solana SDK module eval) → `src/app/App.tsx` → `src/app/routes.tsx` (react-router v7 `createBrowserRouter`).

Provider tree (composed in `App.tsx` + `WalletProviders.tsx`):

```
<ErrorBoundary>
  <AppShell>                                   // mounts the single <Toaster/>
    <ClusterProvider>                          // {cluster, setCluster}, persisted to localStorage "unleak.cluster"
      <ConnectionProvider endpoint={endpointFor(cluster)}>
        <WalletProvider wallets={[]} autoConnect={() => hasCachedAuthSession()}>
          <WalletModalProvider>
            <QueryProvider>                     // singleton TanStack QueryClient
              <AuthProvider>                    // signMessage ownership gate (#26)
                <RouterProvider router={router}/>
              </AuthProvider>
            </QueryProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ClusterProvider>
  </AppShell>
</ErrorBoundary>
```

`AuthProvider` (`src/app/providers/AuthProvider.tsx`) is the post-`adapter.connect()` gate. On `connected && publicKey` it asks the wallet to sign `UnleakTrade sign-in nonce=<uuid> ts=<ms>`, caches the signature in **`sessionStorage`** keyed `unleak.auth.<pubkey>` (so tab refresh stays signed in but closing the tab re-prompts), and categorises errors into `locked` / `rejected` / `unsupported` / `unknown`. Failure → toast + `adapter.disconnect()` + stay on `/`. **Never write the signature to `localStorage`** — that breaks the "close tab = re-prompt" guarantee #26 needs. `RootRedirect` and `DashboardLayout` both gate on `useAuth().authenticated`, not the raw `connected` flag.

Type / data layout:

- **Types**: `src/types/rfq.ts` — single source of truth for `RFQState`, `RFQ`, `Quote`, `Settlement`, `FacilitatorReward`, `UserRole`. Mirrors on-chain account shapes.
- **Mock data**: `src/data/mock.ts` — `mockRFQs`, `mockQuotes`, `mockFacilitatorRewards` plus data helpers (`getMyRFQs`, `getMyQuotes`, `getMyFacilitatorRewards`, `getRFQById`). The visual helpers (`getStatusConfig`, `getCardGradient` / `Border` / `Glow`) moved to `src/app/lib/rfq-visuals.ts` in Phase 2 so they survive the mock removal. Mock data itself is replaced in Phases 3–5 with the on-chain hooks from `src/chain/accounts/`; keep call sites stable.
- **Polyfills**: `src/polyfills.ts` + `vite.config.ts` alias `buffer: "buffer/"` + `resolve.alias.process` + `define.global = "globalThis"`. Solana SDKs read these at module-eval time, so the polyfill import must stay the first line of `main.tsx`.

Path aliases (`vite.config.ts`):

- `@/` → `src/`
- `figma:asset` → `src/assets/` (Figma Make artefact — still in use)

Styling: Tailwind v4 via `@tailwindcss/vite`. Global styles are split across `src/styles/{fonts,tailwind,theme}.css`, all imported from `src/styles/index.css` (with `@solana/wallet-adapter-react-ui/styles.css` as the first import so its `@import url(fonts.googleapis.com)` lands before any rule). PostCSS config is intentionally empty (`postcss.config.mjs`) — `@tailwindcss/vite` handles everything.

The RFQ lifecycle has **9 states** (`Draft → Open → Committed → Revealed → Selected → Settled` plus terminal `Expired`, `Ignored`, `Incomplete`). Mirrored from `../settlement-engine/programs/settlement-engine/src/state/rfq.rs` — the Rust is the authoritative spec. The Rust discriminant order is `… Settled=5, Ignored=6, Expired=7, Incomplete=8`; decoders map enum variants **by name**, and a unit test asserts the order against the committed IDL.

### `src/chain/` (Phase 1 + 2)

Everything that touches the chain or the attestation service. One concern per file:

- `env.ts` — typed access to `import.meta.env`. `VITE_SETTLEMENT_PROGRAM_ID` / `VITE_USDC_MINT` are **optional overrides**: absent values fall back to committed defaults (the IDL's `address` field / devnet USDC) with a `console.warn`, so an unconfigured deploy (e.g. Vercel preview) still boots; an explicitly-set invalid value still throws. **The ed25519 attestation pubkey is intentionally NOT in env** — see "liquidity-guard pubkey" rule below.
- `cluster.ts` — `Cluster` type, `endpointFor()`, `useClusterState()` (persists to `localStorage "unleak.cluster"`).
- `pda.ts` — PDA derivation for every program account (config, rfq, quote, commit-guard, settlement, fees_tracker, slashed_bonds_tracker, facilitator_reward).
- `program.ts` — `useSettlementProgram()` returns a typed Anchor `Program<SettlementEngine>` once a wallet is connected.
- `commitHash.ts` — 186-byte preimage builder + SHA-256. Byte-exact match required vs. settlement-engine + liquidity-guard.
- `math.ts` — `computeTotalFee` / `computeFacilitatorShare` / `takerUplift` / `totalToFund`, mirroring `settlement.rs` + `complete_settlement.rs` (bigint, floor division, min-1 fee when bps > 0). **The protocol fee is paid on top of the quote amount** — the RFQ poster receives the full quote amount; the funding side needs `quote + fee`.
- `state-machine.ts` — deadline math (`commitDeadline` … `fundingDeadline`) and every instruction guard (`canCommitQuote`, `canRevealQuote`, `canSelectQuote`, …) ported 1:1 from the Rust instruction files, plus `nextAllowedStates(state, role)`. Inputs are structural so mock and decoded accounts both satisfy them; `now` is passed explicitly in unix seconds.
- `liquidityGuard.ts` — `deriveSalt` (calls `wallet.signMessage(rfq.toBytes())` → 64-byte ed25519 sig), `fetchAttestation` (POST `/check`, exp-backoff on 429), `verifyAttestation(hash, sig, pubkey)` (the pubkey arg is `config.liquidityGuard`), `fetchHealth` (GET `/health`).
- `tx.ts` — `sendAndConfirmWithToast()` Sonner-wrapped tx submit helper.
- `accountSubscription.ts` — `useAccountSubscription<T>(pubkey, decoder, queryKey)` glues `connection.onAccountChange` into `queryClient.setQueryData`. No polling loops.
- `accounts/` — one file per program account (`config`, `rfq`, `quote`, `commitGuard`, `settlement`, `feesTracker`, `slashedBondsTracker`, `facilitatorRewardTracker`): zod schema (`z.infer` is the exported type) + `normaliseX()` (Anchor raw → validated normalised shape: u64→bigint, i64→number unix secs, `[u8;N]`→Uint8Array, enum→`RFQState` string) + `useXAccount(address)` hook. All hooks share `accounts/useDecodedAccount.ts` (fetch + websocket subscription plumbing); zod atoms/converters live in `accounts/shared.ts`. **The Borsh coder is keyed by camelCase account names** (`"rfq"`, not `"Rfq"`) because Anchor's `Program` camelCases the IDL at construction.
- `__tests__/` — Vitest suites; fixtures encode Raw accounts through `BorshCoder(convertIdlToCamelCase(idl))` from the committed IDL, so decode round-trips prove decoder ↔ IDL parity without a validator.
- `idl/settlement_engine.{json,ts}` — copied from `../settlement-engine/target/` by `npm run copy-idl`. **Committed**, not generated at install time.

### Three load-bearing on-chain rules

- **Commit-hash preimage (186 bytes)** lives in three repos and must stay byte-identical: `../settlement-engine/.../instructions/quote/commit_quote.rs` (verifier), `../liquidity-guard/src/main.rs` (signer), `src/chain/commitHash.ts` (preflight). Layout: `salt[64] ‖ rfq[32] ‖ taker[32] ‖ quote_mint[32] ‖ quote_amount_LE[8] ‖ bond_amount_LE[8] ‖ taker_fee_bps_LE[2]`. Endianness is little-endian for the numeric fields. Update all three together.
- **liquidity-guard ed25519 pubkey is on-chain, not in env**. Source of truth is `Config.liquidity_guard` (read via `useConfigAccount()`). `verifyAttestation()` takes the pubkey as an argument — pass `config.data.liquidityGuard`. The service's `/health.service_pubkey` is cross-checked against Config and surfaces drift in `HealthPill` (amber). Do not re-introduce a `VITE_LIQUIDITY_GUARD_PUBKEY` env var.
- **liquidity-guard is per-cluster and sets no CORS headers**. Each cluster has its own upstream (localnet `http://localhost:8080`, devnet/mainnet on Heroku — see `vite.config.ts` `LG_DEFAULTS`, overridable via `VITE_LG_URL_{LOCALNET,DEVNET,MAINNET}`). Because the dev proxy is static but the cluster is a runtime choice, we expose **one path per cluster**: `/liquidity-guard/<cluster>/*` (`<cluster>` ∈ `localnet|devnet|mainnet`; `mainnet-beta`→`mainnet`). All client code must call `/liquidity-guard/<cluster>/health` and `/liquidity-guard/<cluster>/check` via `liquidityGuard.ts` (which takes the active `Cluster`), never a raw URL — there is no `env.liquidityGuardUrl` anymore. Production deployment needs same-origin hosting or a CORS-enabled reverse proxy per cluster — open follow-up after #11/#26.

### Dev-only UI

- `<HealthPill/>` (`src/app/components/HealthPill.tsx`) — pings `/health` every 15s, gated by `import.meta.env.DEV`. States: green (ok), amber (network or pubkey drift vs Config), red (down), pulsing (loading).
- `<DevConfigPanel/>` (`src/app/components/DevConfigPanel.tsx`) — dumps decoded Config fields. Renders only when `import.meta.env.DEV && URLSearchParams.get("debug") === "1"`. Use `/dashboard?debug=1` to verify chain wiring end-to-end.
- `/dev/stories` (`src/app/components/ComponentStories.tsx`) — DEV-only gallery of the Phase 2 shared primitives (`RFQStatePipeline` in all 9 states, `DeadlineRing`, `BondBreakdown`, `TokenAmountInput`, `AddressDisplay`, empty/skeleton/error states). The Storybook/Ladle stand-in.

## Companion repositories

Both sibling repos live next to this one under `../`. When anything on-chain looks ambiguous, the Rust wins — this frontend is a consumer, not a spec.

### `../settlement-engine` (Anchor program)

- Program ID (devnet + localnet): `7wrjbU1NbVtUCUGP1obi3aiT6QrjXZnH5XJDXMsKtkPG` (from `Anchor.toml`)
- Account state definitions — `programs/settlement-engine/src/state/{config,rfq,quote,settlement,fees_tracker,slashed_bonds_tracker,facilitator_reward_tracker}.rs`. All are decoded by the Zod + Anchor decoders under `src/chain/accounts/` (Phase 2 #12).
- Generated IDL — `target/idl/settlement_engine.json` + `target/types/settlement_engine.ts` after `anchor build`; copy into `src/chain/idl/` via `npm run copy-idl`. The copies are committed so fresh clones don't depend on this sibling.
- **14 user-facing instructions** the frontend must wire (admin `init_config` / `update_config` / `close_config` are out of scope):
  - RFQ (maker) — `init_rfq`, `update_rfq`, `open_rfq`, `set_rfq_facilitator`, `cancel_rfq`, `close_expired`, `close_incomplete`
  - Quote (taker) — `commit_quote`, `reveal_quote`, `set_quote_facilitator`, `refund_quote_bonds`
  - Settlement — `select_quote` (maker), `complete_settlement` (taker), `withdraw_reward` (facilitator)
- State-machine guards live in the instruction files (e.g. `cancel_rfq.rs` checks which states are cancellable). Port every guard 1:1 into `src/chain/state-machine.ts`; #17 adds parity tests.
- Fee math (`computeTotalFee`, facilitator share) comes from `programs/settlement-engine/src/instructions/settlement/complete_settlement.rs` — `floor` division, min `1` when `bps > 0`.

### `../liquidity-guard` (ed25519 attestation service)

Minimal REST microservice that gates `commit_quote`. Two endpoints:

- `GET /health` — returns `{status, network, service_pubkey, timestamp, skip_fund_checks}`. The `service_pubkey` is the runtime ed25519 key — the frontend cross-checks it against the on-chain `Config.liquidity_guard` (read via `useConfigAccount()`) and shows drift in `HealthPill`. Source of truth for the expected value is **on-chain Config**, not env.
- `POST /check` — body `{rfq, taker, salt(hex), quote_mint, quote_amount, bond_amount_usdc, taker_fee_bps}`. Returns `commit_hash` (SHA-256) + `liquidity_proof` (ed25519 signature over `commit_hash`). Validation rules the service enforces (so the UI should surface clear errors that match these):
  - USDC balance ≥ `bond_amount_usdc`
  - Quote-token balance ≥ `quote_amount + ceil(quote_amount * taker_fee_bps / 10_000)` (min `1` uplift when `taker_fee_bps > 0`)
  - `taker_fee_bps ≤ 10_000`
- Rate limit: 2 req/s sustained, burst 5. Treat 429 as a user-visible wait with exponential backoff (`fetchAttestation` already does 300/900/2700ms).
- **Commit-hash preimage** see "Three load-bearing on-chain rules" above. The taker's `salt` is `wallet.signMessage(rfq.pubkey.toBytes())` — 64-byte ed25519 signature, deterministic per (wallet, rfq). Losing the salt = the taker can never reveal, so #14 requires both a `localStorage` backup keyed by `rfq_pubkey` and a downloadable "reveal ticket" JSON fallback.

## Deployment

- **Production** (`app.unleak.trade`) — GitHub Pages via `.github/workflows/deploy.yml`, triggered on push to `main`. Workflow copies `build/index.html` to `build/404.html` for SPA fallback and writes a `CNAME` file.
- **PR previews** — Vercel via `.github/workflows/preview.yml`. Internal PRs only (skips forks because secrets are unavailable there).
- Both workflows pin Node 22 and use the latest `actions/*` versions.

## Commit style

Sign every commit (`git commit -S`). Keep messages short (single-line conventional subject preferred — `chore(ci): ...`, `feat: ...`). **Do not add a `Co-Authored-By: Claude ...` trailer** or any mention of Claude / Claude Code in the message. This is the user's explicit preference and applies to every commit in this repo.

When running `npm run build` produces a `build/` directory — it is `.gitignored`, leave it alone. Never stage it.
