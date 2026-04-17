# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Frontend for **UnleakTrade**, a confidential OTC / RFQ trading d-app on Solana. It is the app at `app.unleak.trade`; the separate marketing site lives in `../landing-page` (at `unleak.trade`). Today the app is a **mock UI with no on-chain calls**. The work in flight is wiring it into the `settlement-engine` Anchor program and the `liquidity-guard` attestation service.

## Stack direction (locked)

On-chain integration uses **Solana Wallet Adapter** (`@solana/wallet-adapter-react` + `-react-ui` + `-wallets`) and **Anchor** (`@coral-xyz/anchor`). Do not introduce bespoke auth abstractions, handwritten wallet detection, or a homemade `WalletContext` — SWA owns wallet connection, persistence, and multi-wallet UI. Phase 0 (#10) and Phase 1 (#11) both hinge on this.

Goals the stack has to deliver:
- **Multi-wallet** first-class — Phantom, Solflare, Backpack, Glow, … via SWA wallet-adapter packages. No wallet-specific branches in our code. SWA's themed `WalletMultiButton` is the connect UI.
- **DX** — one hook per concern (`useWallet`, `useConnection`, `useSettlementProgram`). No bespoke hierarchies or context soup on top of SWA.
- **Performance** — TanStack Query for reads, websocket account subscriptions for live RFQ / Quote updates (Phase 1 task). No polling loops.

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
- A single `My Activity` view (in progress per #10) replaces the old `My RFQs` / `My Quotes` / `My Earnings` tabs. It renders three sections — `RFQs I posted`, `Quotes I submitted`, `Rewards` — each hidden when empty.
- One action bar on the RFQ detail page, not three. It shows whichever CTAs are legal for the connected wallet × current state, driven by `state-machine.ts` (Phase 2).
- No `/dashboard/<role>` routes, no role switcher, no role badges.

## Origin: Figma Make (important gotcha)

The codebase was bootstrapped from **Figma Make** (AI prompt-to-code), not hand-written. Artifacts still visible:
- `figma:asset` Vite alias → `src/assets` (used by `WalletConnect.tsx`, `MainNavbar.tsx`, `Navigation.tsx`)
- `src/app/components/figma/ImageWithFallback.tsx` scaffold wrapper
- Stray 2-space leading indent and blank first line in `src/main.tsx` and `index.html`
- Originally `"name": "@figma/my-make-file"` in `package.json`
- `src/app/components/ui/` is the standard shadcn/ui catalog wrapping Radix primitives; many files in it are unreferenced (`calendar.tsx`, `resizable.tsx`, etc.) — cleanup tracked in #10

**Never regenerate via Figma Make against this repo again** — it would clobber committed work. The new visual source of truth is the Figma Design file in #21, to be filled in iteratively.

## Commands

```bash
npm install           # install deps
npm run dev           # Vite dev server on :3000, auto-opens browser
npm run build         # production build → build/ (git-ignored)
```

No `lint` / `test` / `typecheck` scripts exist yet — they're planned in #10 (ESLint + Prettier + strict `tsconfig`) and #17 (Vitest + RTL + Playwright). `npm run build` currently **does not type-check** — Vite + `@vitejs/plugin-react` only transpile TypeScript, so type errors do not fail the build. Keep this in mind when editing `.ts` / `.tsx` files.

## Architecture

Entry flow: `index.html` → `src/main.tsx` → `src/app/App.tsx` (just renders `<RouterProvider router={router} />`) → `src/app/routes.tsx` which uses `createBrowserRouter` from react-router v7.

Known anti-patterns still present (to be replaced in #10):
- `src/app/routes.tsx` holds wallet state as a module-level `let isWalletConnected` — lost on refresh.
- `RootRedirect` does a hard `window.location.href = "/dashboard"` after wallet connect — defeats SPA routing.
- Three mock-data modules under `src/app/data/` (`mockRFQs.ts`, `enhancedMockData.ts`, `mockData.ts`) with overlapping/conflicting `RFQ` shapes; `RFQ` is also re-declared in `src/app/App.tsx`.

Path aliases (`vite.config.ts`):
- `@/` → `src/`
- `figma:asset` → `src/assets/` (Figma Make artefact — still in use)

Styling: Tailwind v4 via `@tailwindcss/vite`. Global styles are split across `src/styles/{fonts,tailwind,theme}.css`, all imported from `src/styles/index.css`. PostCSS config is intentionally empty (`postcss.config.mjs`) — `@tailwindcss/vite` handles everything.

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
