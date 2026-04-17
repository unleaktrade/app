# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Frontend for **UnleakTrade**, a confidential OTC / RFQ trading d-app on Solana. It is the app at `app.unleak.trade`; the separate marketing site lives in `../landing-page` (at `unleak.trade`). Today the app is a **mock UI with no on-chain calls**. The work in flight is wiring it into the `settlement-engine` Anchor program and the `liquidity-guard` attestation service.

## Stack direction (locked)

On-chain integration uses **Solana Wallet Adapter** (`@solana/wallet-adapter-react` + `-react-ui`) and **Anchor** (`@coral-xyz/anchor`). Do not introduce bespoke auth abstractions, handwritten wallet detection, or a homemade `WalletContext` — SWA owns wallet connection and multi-wallet UI. We do **not** install the `@solana/wallet-adapter-wallets` meta-package (it drags Keystone/Torus/WalletConnect transitive deps with React-19-incompatible peers); Wallet Standard auto-discovery via `WalletProvider wallets={[]}` handles every modern wallet (Phantom / Solflare / Backpack / Glow / MetaMask-Solana / Jupiter / …). Closed in #24.

Goals the stack has to deliver:

- **Multi-wallet** first-class via Wallet Standard auto-discovery. No wallet-specific branches in our code. SWA's themed `WalletMultiButton` is the connect UI and the navbar disconnect control.
- **DX** — one hook per concern (`useWallet`, `useConnection`, `useSettlementProgram`). No bespoke hierarchies or context soup on top of SWA.
- **Performance** — TanStack Query for reads, websocket account subscriptions for live RFQ / Quote updates (Phase 1 task). No polling loops.

**`autoConnect` is intentionally off** in `src/app/providers/WalletProviders.tsx`. Keeping it on wedges SWA when a previously-authorised but locked wallet is detected on load (`WalletConnectionError: Connection rejected`), and also swallows the user-activation gesture Chrome needs to open the extension popup on first click. Trade-off: every session requires one explicit `Select Wallet → Connect` click. Phase 1 (#26) adds a `signMessage` challenge to prove the wallet is actually unlocked and can then safely re-enable persistence.

## Source of truth is the issues, not the README

`README.md` is pre-refactor and stale — it says React 18, references deleted components (`DashboardHome`, `BrowseRFQs`, `CreateRFQ`, `RFQDetails`), and describes a 3-role UI (per-role tabs, facilitator dashboard, role switcher) that has been **explicitly rejected**. Do not use it as a guide. The authoritative plan lives in:

- **#19** — roadmap (links every phase)
- **#10** — Phase 0: repo hygiene + `My Activity` consolidation
- **#11–#15** — Phases 1–5 (Solana wiring, data model, maker/taker/facilitator instructions)
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

`src/app/components/ui/` is the shadcn/ui catalog wrapping Radix primitives. Phase 0 pruned it to the nine files actually imported by the surviving tree (`button`, `dialog`, `input`, `label`, `select`, `separator`, `sonner`, `tabs`, `utils`). Don't reintroduce the full catalog — add only the specific ui file you need.

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
```

`npm run build` intentionally **does not type-check** — Vite + `@vitejs/plugin-react` only transpile TypeScript. Always run `npm run typecheck` alongside for the real type signal. Pre-commit hook (`.husky/pre-commit` → `lint-staged`) auto-formats staged files and runs ESLint on `.ts`/`.tsx`. Test runner (Vitest + RTL + Playwright) lands in #17.

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

Entry flow: `index.html` → `src/main.tsx` (side-effect imports `./polyfills` first to set `globalThis.Buffer` / `process` / `global` before any Solana SDK module eval) → `src/app/App.tsx` (wraps `<RouterProvider>` in `<WalletProviders>`) → `src/app/routes.tsx` (react-router v7 `createBrowserRouter`). `DashboardLayout` guards `/dashboard/**` with `useWallet()` and bounces disconnected users to `/`; `WalletConnect` (at `/`) auto-clears any stale persisted wallet on mount so users always see a fresh `Select Wallet` button.

Type / data layout after Phase 0:

- **Types**: `src/types/rfq.ts` — single source of truth for `RFQState`, `RFQ`, `Quote`, `Settlement`, `FacilitatorReward`, `UserRole`. Mirrors on-chain account shapes.
- **Mock data**: `src/data/mock.ts` — `mockRFQs`, `mockQuotes`, `mockFacilitatorRewards` plus helpers (`getMyRFQs`, `getMyQuotes`, `getMyFacilitatorRewards`, `getRFQById`, `getStatusConfig`, `getCardGradient` / `Border` / `Glow`). Replaced in Phase 2 (#12) with Zod-decoded on-chain data; keep call sites stable.
- **Providers**: `src/app/providers/WalletProviders.tsx` wraps `ConnectionProvider` + `WalletProvider wallets={[]}` + `WalletModalProvider`. Passing `[]` + no `autoConnect` is deliberate — see Stack direction.
- **Polyfills**: `src/polyfills.ts` + `vite.config.ts` alias `buffer: "buffer/"` + `resolve.alias.process` + `define.global = "globalThis"`. Solana SDKs read these at module-eval time, so the polyfill import must stay the first line of `main.tsx`.

Path aliases (`vite.config.ts`):

- `@/` → `src/`
- `figma:asset` → `src/assets/` (Figma Make artefact — still in use)

Styling: Tailwind v4 via `@tailwindcss/vite`. Global styles are split across `src/styles/{fonts,tailwind,theme}.css`, all imported from `src/styles/index.css` (with `@solana/wallet-adapter-react-ui/styles.css` as the first import so its `@import url(fonts.googleapis.com)` lands before any rule). PostCSS config is intentionally empty (`postcss.config.mjs`) — `@tailwindcss/vite` handles everything.

The RFQ lifecycle has **9 states** (`Draft → Open → Committed → Revealed → Selected → Settled` plus terminal `Expired`, `Ignored`, `Incomplete`). Mirrored from `../settlement-engine/programs/settlement-engine/src/state/rfq.rs` — the Rust is the authoritative spec. When Phase 2 (#12) lands, look for `src/chain/` with Zod decoders, PDA helpers, state-machine guards, and deadline math.

## Companion repositories

Both sibling repos live next to this one under `../`. When anything on-chain looks ambiguous, the Rust wins — this frontend is a consumer, not a spec.

### `../settlement-engine` (Anchor program)

- Program ID (devnet + localnet): `7wrjbU1NbVtUCUGP1obi3aiT6QrjXZnH5XJDXMsKtkPG` (from `Anchor.toml`)
- Account state definitions — `programs/settlement-engine/src/state/{config,rfq,quote,settlement,fees_tracker,slashed_bonds_tracker,facilitator_reward_tracker}.rs`. Mirror every one into Zod + Anchor decoders under `src/chain/accounts/` during Phase 2 (#12).
- Generated IDL — `target/idl/settlement_engine.json` after `anchor build`; copy into `src/chain/idl/` per #11.
- **14 user-facing instructions** the frontend must wire (admin `init_config` / `update_config` / `close_config` are out of scope):
  - RFQ (maker) — `init_rfq`, `update_rfq`, `open_rfq`, `set_rfq_facilitator`, `cancel_rfq`, `close_expired`, `close_incomplete`
  - Quote (taker) — `commit_quote`, `reveal_quote`, `set_quote_facilitator`, `refund_quote_bonds`
  - Settlement — `select_quote` (maker), `complete_settlement` (taker), `withdraw_reward` (facilitator)
- State-machine guards live in the instruction files (e.g. `cancel_rfq.rs` checks which states are cancellable). Port every guard 1:1 into `src/chain/state-machine.ts`; #17 adds parity tests.
- Fee math (`computeTotalFee`, facilitator share) comes from `programs/settlement-engine/src/instructions/settlement/complete_settlement.rs` — `floor` division, min `1` when `bps > 0`.

### `../liquidity-guard` (ed25519 attestation service)

Minimal REST microservice that gates `commit_quote`. Two endpoints:

- `GET /health` — returns service status, configured network, and the **ed25519 public key** the frontend must pin in `VITE_LIQUIDITY_GUARD_PUBKEY` (#11) and use to verify every `liquidity_proof` locally before building the tx.
- `POST /check` — body `{rfq, taker, salt(hex), quote_mint, quote_amount, bond_amount_usdc, taker_fee_bps}`. Returns `commit_hash` (SHA-256) + `liquidity_proof` (ed25519 signature over `commit_hash`). Validation rules the service enforces (so the UI should surface clear errors that match these):
  - USDC balance ≥ `bond_amount_usdc`
  - Quote-token balance ≥ `quote_amount + ceil(quote_amount * taker_fee_bps / 10_000)` (min `1` uplift when `taker_fee_bps > 0`)
  - `taker_fee_bps ≤ 10_000`
- Rate limit: 2 req/s sustained, burst 5. Treat 429 as a user-visible wait with exponential backoff.
- **Commit-hash preimage** (186 bytes) — `SHA256(salt ‖ rfq ‖ taker ‖ quote_mint ‖ quote_amount_LE ‖ bond_LE ‖ fee_bps_LE)`. Exact layout in #14; the reference implementation is `../liquidity-guard/src/main.rs`. The taker's `salt` is `wallet.signMessage(rfq.pubkey.toBytes())` — 64-byte ed25519 signature, deterministic per (wallet, rfq). Losing the salt = the taker can never reveal, so #14 requires both a localStorage backup keyed by `rfq_pubkey` and a downloadable "reveal ticket" JSON fallback.

## Deployment

- **Production** (`app.unleak.trade`) — GitHub Pages via `.github/workflows/deploy.yml`, triggered on push to `main`. Workflow copies `build/index.html` to `build/404.html` for SPA fallback and writes a `CNAME` file.
- **PR previews** — Vercel via `.github/workflows/preview.yml`. Internal PRs only (skips forks because secrets are unavailable there).
- Both workflows pin Node 22 and use the latest `actions/*` versions.

## Commit style

Sign every commit (`git commit -S`). Keep messages short (single-line conventional subject preferred — `chore(ci): ...`, `feat: ...`). **Do not add a `Co-Authored-By: Claude ...` trailer** or any mention of Claude / Claude Code in the message. This is the user's explicit preference and applies to every commit in this repo.

When running `npm run build` produces a `build/` directory — it is `.gitignored`, leave it alone. Never stage it.
