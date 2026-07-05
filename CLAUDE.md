# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Frontend for **UnleakTrade**, a confidential OTC / RFQ trading d-app on Solana. It is the app at `app.unleak.trade`; the separate marketing site lives in `../landing-page` (at `unleak.trade`). Phase 1 (#11 + #26) shipped the `src/chain/` foundations: SWA + Anchor wiring, a `signMessage` ownership gate (with the `AuthGate` interstitial while it's in flight), a TanStack-Query-backed `useConfigAccount()` that live-subscribes to the on-chain `Config` PDA, and the liquidity-guard attestation client. Phase 2 (#12, PR #29) shipped the full on-chain data model under `src/chain/` (zod-validated decoders + hooks for all 8 accounts, every PDA, `state-machine.ts` guards/deadlines, `math.ts` fee math — all unit-tested) and the shared UI primitives (`RFQStatePipeline`, `DeadlineRing`, `BondBreakdown`, `TokenAmountInput`, `AddressDisplay`, empty/skeleton/error states, vaul bottom action sheet). Phase 2b (#30, PR #31) seeded real devnet data (all 9 states), added the list-read hooks + view-model bridge, swapped the screens onto live accounts and deleted `src/data/mock.ts`. Phase 3 (#13) then wired the **maker** instructions plus the facilitator `withdraw_reward` claim: `src/chain/instructions/maker.ts` holds one tx-builder per instruction (mirroring `scripts/seed.ts`), `src/app/lib/rfq-actions.ts` derives the legal CTAs for the connected wallet from `state-machine.ts`, and `src/app/components/RFQActionBar.tsx` is the single action bar. `CreateRFQModal`/`UpdateRFQModal` now send `init_rfq`/`update_rfq`, `AdaptiveRFQDetail` wires open/cancel/select/close_expired/close_incomplete/set_rfq_facilitator, and `MyActivity` has draft quick-publish + a facilitator Claim. Phase 4 (#14) then wired the **taker** instructions on the same foundation: `src/chain/instructions/taker.ts` holds the builders (incl. `commit_quote`'s Ed25519 verify preinstruction and `complete_settlement`'s remaining-accounts + CU bump). `SubmitQuoteModal` is the `commit_quote` flow (`deriveSalt` → liquidity-guard `/check` → local commit-hash preflight → `verifyAttestation` against on-chain `Config.liquidity_guard` **before** building the tx → reveal-ticket backup via `src/app/lib/reveal-ticket.ts`). Reveal and settle are dedicated cockpit routes (`/dashboard/quote/:quoteId/{reveal,settle}` → `RevealQuote`/`SettleQuote`): reveal shows a live commit-hash diff with import-ticket / re-derive-salt recovery; settle shows the funding-requirement vs balance check + a receipt. `rfq-actions.ts` now emits the taker CTAs (Commit/Reveal/Settle/Reclaim bond/Facilitator) and `RFQActionBar` routes them (modal for commit, navigation for reveal/settle, inline confirm for refund/set-facilitator). Both phases shipped together in PR #32. Phase 5 (#15) completed the **facilitator rewards** flow inside the same PR-#32 branch: `src/chain/accounts/byKeys.ts` bulk-fetches settlements/winning quotes, `src/app/lib/rewards.ts` derives pending/claimed rewards with on-chain-parity fee math (share recomputed from `settlement.quote_amount`/`taker_fee_bps` and the **RFQ's** `facilitator_fee_bps` snapshot — never live Config), and `src/app/components/RewardsSection.tsx` renders per-mint amounts, Pending/Claimed tabs, a sequential batch claim (one `withdraw_reward` tx per tracker), and recharts earnings charts (per-mint series only, never USD). A UI/UX revision pass landed alongside: real marketplace analytics from live accounts via `src/app/lib/market-stats.ts` (all fake `$` numbers deleted), surface tokens (`bg-surface-page`/`bg-surface-raised`) + `--nav-h` in `theme.css`, the `PageShell` page chrome, `ResponsiveModal` (Dialog ≥768px / vaul drawer below) adopted by all form modals, and the shared `RFQForm` 4-step wizard extracted from the once-near-duplicate Create/Update modals. A Playwright e2e suite lives in `e2e/` (see "E2E policy" below). Phases 6+7 (#16 + #17) then landed the design/test polish on one branch: a token-backed theme (9 per-state `--state-*` CSS variables + `-deep` companions in `theme.css`, exposed via `@theme inline` as `text-state-open`-style utilities; `glass-panel`/`glass-card` @utility surfaces; self-hosted fontsource variable fonts — Space Grotesk display / Inter body / JetBrains Mono), motion polish (CSS-driven route enter transition on `#main` — deliberately NOT framer, so a stalled JS tween can never hide content; card hover lifts; DeadlineRing critical pulse; `skeleton-shimmer` sweep; canvas-confetti on settlement, reduced-motion-guarded), per-screen `SkeletonList` variants + illustrated empty states (`illustrations.tsx`), an a11y pass (skip link, landmarks, WCAG contrast unit test that parses `theme.css`), deep links (`/dashboard/rfq/:id?action=<id>` — fired only when legal per `deriveRfqActions`, via `share-links.ts` + `ShareRfqButton` QR), the `SettlementReceiptCard` PNG export (html-to-image), the `ProofInspector` (178-byte preimage hex map + local ed25519 verify against on-chain Config), `/dashboard/transparency` (SlashedBondsTracker + FeesTracker ledgers via new unfiltered list hooks; per-mint, never USD), and the `NotificationCenter` (cache-diffing inbox in `useNotifications` — no polling, no new websockets, localStorage-persisted per wallet). Phase 7 added the jsdom/RTL Vitest project (`src/test/setup.ts`), the commit-hash preimage known-answer suite, RTL component suites, coverage thresholds over the logic layers, hermetic axe-core e2e specs, a bundle-size budget gate (`scripts/check-bundle-size.mjs` + `bundle-budget.json`) and Dependabot.

## Stack direction (locked)

On-chain integration uses **Solana Wallet Adapter** (`@solana/wallet-adapter-react` + `-react-ui`) and **Anchor** (`@coral-xyz/anchor`). Do not introduce bespoke auth abstractions, handwritten wallet detection, or a homemade `WalletContext` — SWA owns wallet connection and multi-wallet UI. We do **not** install the `@solana/wallet-adapter-wallets` meta-package (it drags Keystone/Torus/WalletConnect transitive deps with React-19-incompatible peers); Wallet Standard auto-discovery via `WalletProvider wallets={[]}` handles every modern wallet (Phantom / Solflare / Backpack / Glow / MetaMask-Solana / Jupiter / …). Closed in #24.

Goals the stack has to deliver:

- **Multi-wallet** first-class via Wallet Standard auto-discovery. No wallet-specific branches in our code. SWA's themed `WalletMultiButton` is the connect UI and the navbar disconnect control.
- **DX** — one hook per concern (`useWallet`, `useConnection`, `useSettlementProgram`). No bespoke hierarchies or context soup on top of SWA.
- **Performance** — TanStack Query for reads, websocket account subscriptions for live RFQ / Quote updates (Phase 1 task). No polling loops.

**`autoConnect` is scoped, not global** in `src/app/providers/WalletProviders.tsx`. It is the function form `() => Promise.resolve(hasCachedAuthSession())`, so SWA eagerly reconnects **only** when the current tab session was already authenticated (a `signMessage` signature is cached in `sessionStorage`). A fresh tab / first visit returns `false`, so we never eager-connect on a cold load — that is what kept wedging SWA when a previously-authorised but locked wallet was detected (`WalletConnectionError: Connection rejected`) and what swallowed the user-activation gesture Chrome needs for the first extension popup. Those failure modes only ever happened on cold loads, which we no longer auto-connect. SWA catches eager-connect errors internally (`WalletProviderBase` drops them) and falls back to the connect screen, so a locked wallet on refresh degrades gracefully instead of wedging. Because `sessionStorage` survives a refresh but not a tab close, this delivers "refresh stays signed in (no re-prompt)" while preserving "close tab = re-prompt". The `signMessage` challenge in `src/app/providers/AuthProvider.tsx` (#26) still proves the wallet is unlocked; `AuthProvider` holds a `restoring` status during the eager reconnect, and `RootRedirect` / `DashboardLayout` render the branded `<AuthGate/>` interstitial (`src/app/components/AuthGate.tsx`) for the `restoring` and `pending` (signMessage prompt) windows — never a blank screen, and never a flash of `WalletConnect` mid-restore. The `signing` variant has a Cancel button (→ `signOut()`) because a popup closed without rejecting leaves the signMessage promise hanging forever. Closed in #27; AuthGate added after #12.

## Source of truth is the issues, not the README

`README.md` was rewritten as part of #18's first tranche (overview, mermaid architecture + state diagrams, quickstarts, env/scripts tables) and is current — but the issues remain authoritative for roadmap and intent:

- **#19** — roadmap (links every phase)
- **#10** — Phase 0: repo hygiene + `My Activity` consolidation
- **#11 + #26** — Phase 1 (Solana/Anchor foundations + signMessage auth gate)
- **#12** — Phase 2 (data model, schemas & shared UI primitives) — shipped in PR #29
- **#30** — Phase 2b (seed on-chain data + list-read hooks + mock removal) — shipped in PR #31
- **#13–#15** — Phases 3–5 (maker / taker / facilitator instruction wiring) — shipped on the PR-#32 branch
- **#17** — tests & CI
- **#18** — docs (includes a README rewrite)
- **#21** — Figma design file as the visual source of truth: https://www.figma.com/design/ywVePMypIpifiUMA9auaMs

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
npm test              # vitest run — node (pure logic) + jsdom (RTL component) projects
npm run test:coverage # vitest run --coverage — thresholds gate src/chain/ + src/app/lib/ logic
npm run test:watch    # vitest watch mode
npm run test:e2e      # HERMETIC read-only e2e (desktop+mobile, replays the RPC cassette; no devnet, no keys)
npm run test:e2e:tx   # full lifecycle vs live devnet (needs funded DEV_WALLET_KEYPAIR_DIR + VITE_RPC_URL_DEVNET)
npm run test:e2e:record # re-capture e2e/fixtures/rpc-cassette.json from a working devnet
npm run test:e2e:report # open the last Playwright HTML report
npm run seed          # append devnet/localnet fixtures across all 9 states (never resets)
npm run copy-idl      # refresh src/chain/idl/ from ../settlement-engine/target (after `anchor build` there)
bash scripts/dev-localnet.sh   # bring up anchor localnet + deploy program (requires sibling repo)
```

`npm run build` intentionally **does not type-check** — Vite + `@vitejs/plugin-react` only transpile TypeScript. Always run `npm run typecheck` alongside for the real type signal. Known-clean baselines: `npm run lint` reports **5 pre-existing warnings (0 errors)** — react-refresh/only-export-components noise, don't chase them; `npm install` may print local `allow-scripts` warnings for `bufferutil`/`fsevents`/`utf-8-validate` (a local npm security feature on pre-existing transitive deps) — those do **not** count against the #24 zero-ERESOLVE/deprecation rule, but a new `ERESOLVE overriding peer dependency` does (it's why Ladle was rejected). Pre-commit hook (`.husky/pre-commit` → `lint-staged`) auto-formats staged files and runs ESLint on `.ts`/`.tsx`. Vitest landed with Phase 2 (#12) for the pure-logic suites under `src/chain/__tests__/` (the `test` block in `vite.config.ts` injects hermetic `VITE_*` env vars so CI needs no `.env.local`); Playwright landed with the PR-#32 revision pass (`e2e/`, see "E2E policy" below); RTL component suites live in `src/app/components/__tests__/` (jsdom Vitest project, Phase 7). There is **no Storybook/Ladle** — Ladle's transitive peers break the zero-warning install rule (#24); the DEV-only `/dev/stories` route is the component gallery instead.

The IDL files in `src/chain/idl/` are **committed**, so fresh clones can `npm install && npm run dev` without `../settlement-engine` checked out. Re-run `npm run copy-idl` after the Anchor program changes shape; `.prettierignore` and `eslint.config.js` exclude that directory because the files are generated.

## E2E policy

Playwright (`e2e/`, `playwright.config.ts`) — see `e2e/README.md`. **Two modes, split by project:**

- **Read-only (`desktop` + `mobile`) — HERMETIC**, and the per-PR gate (`ci.yml` `e2e-readonly`, runs on **every** PR/push including forks). RPC is served from a committed cassette (`e2e/fixtures/rpc-cassette.json`) via `page.route` in `e2e/helpers/rpc-replay.ts`, the clock is pinned to a stored `__capturedAt` (so deadline windows stay as captured), and the wallets are **ephemeral + unfunded** (`scripts/gen-dev-wallets.mjs`). **No live devnet, no liquidity-guard, no secrets, no network.** Run locally with `npm run test:e2e` (turnkey, `REPLAY_RPC=1`). Regenerate the cassette with `npm run test:e2e:record` against a working devnet (see `e2e/README.md`); the `tx` run is the live parity guard. The commit-modal / mobile specs navigate directly to a known Open RFQ pinned in `e2e/fixtures/known-rfqs.ts`.
- **`tx` — live devnet.** The full commit→reveal→select→settle→claim lifecycle submits real transactions, so it needs funded wallets + a real RPC. **On-demand only** (`e2e.yml`: `workflow_dispatch` or a `[full-e2e]` commit). This is the **only** place the `DEV_WALLET_{MAKER,TAKER1,TAKER2}_KEYPAIR` + `DEVNET_RPC_URL` secrets are used — never the per-PR path, never forks. `npm run test:e2e:tx` locally (needs `DEV_WALLET_KEYPAIR_DIR` funded wallets + `VITE_RPC_URL_DEVNET`). Everything is `workers: 1`.

**Security invariant:** `VITE_RPC_URL_*` is inlined into the client bundle by Vite — never set it to a keyed URL in a build/deploy workflow (`deploy.yml` passes nothing → production uses the keyless public RPC). Playwright trace/screenshot/video are `off` under CI (they'd capture served JS / request URLs into the uploaded report). The hermetic PR gate holds no secrets, so there is nothing sensitive to leak even if that guard regressed.

**Responsive overlay rules (hard-won — the guard-status popover used to clip off-screen on phones):**

- **`GlassPopover` is a desktop-only (≥`md`) primitive.** It is a hand-rolled `absolute right-0 top-full` panel with **no viewport-collision handling** (not Radix, not portaled) — anchored near a viewport edge or inside a narrow container it clips off-screen. Anything floating below `md` must use the vaul bottom sheet / `ResponsiveModal` split instead; `NotificationCenter` and `HealthPill` (`GuardStatusView`) are the reference implementations (`useMediaQuery("(min-width: 768px)")` → `GlassPopover` on desktop, `Drawer` below).
- **Every new or changed popover, drawer, modal, or fixed overlay gets a `@mobile` case in `e2e/specs/responsive-mobile.e2e.spec.ts` in the same change**: open it at the phone viewport, assert its content is visible, its bounding box sits inside the viewport, and `expectNoHorizontalOverflow(page)` still holds. A desktop-only spec is not coverage for a floating element — this class of bug (edge-anchored panel escaping a 390px screen) only reproduces at the mobile project's viewport.
- jsdom has no `matchMedia`; `src/test/setup.ts` stubs it (desktop by default). RTL suites for viewport-split components use `setMediaQueryMatches(false)` from that setup file to render and assert the mobile branch too.

## Testing integrity, security & web3 constraints (non-negotiable)

These are hard rules. Do not relax them to make CI green — fix the root cause instead.

**Test integrity & consistency.**

- **Never weaken a test to pass.** No `test.skip`/`.only`, no commented-out or softened assertions, no deleting a failing case, no widening a matcher until it stops catching the bug. A red test is a signal — diagnose it (`superpowers:systematic-debugging`), don't silence it. If a test is genuinely obsolete, remove it with a one-line justification, never to dodge a failure.
- **Unit tests must stay on-chain-accurate.** The suites under `src/chain/__tests__/` and `src/app/lib/__tests__/` encode decoder↔IDL parity, PDA seeds, deadline math, and fee math (`computeTotalFee`/`computeFacilitatorShare`, floor + min-1) ported 1:1 from `../settlement-engine`. When the IDL, an account layout, a state guard, or the fee/reward math changes, update the Rust-mirroring code **and** its tests **and** the fixtures in the same change. The Rust wins on any ambiguity.
- **Keep unit ↔ e2e ↔ cassette in lockstep.** Any change to a decoder, PDA, guard, fee/reward math, or a user-facing string a spec asserts on must update the unit tests, the affected e2e specs, and — if account bytes or reads change — the RPC cassette, together. A read-only hermetic pass against a **stale** cassette is a _false green_: the cassette froze old bytes. Regenerate it (`npm run test:e2e:record`, then re-verify replay with ephemeral wallets) whenever the account layout / IDL changes. The live `@tx` run is the parity guard — if a read-only spec is green but the same flow breaks under `@tx`, the cassette is stale; re-record, never paper over.
- **Every UI-affecting change is still browser-tested** (see Browser-testing policy) and lands with `npm run typecheck && npm run lint && npm test` green (baselines in Commands). `npm run build` does not type-check.

**Security — no leaks.**

- **The per-PR CI gate stays hermetic and secret-free.** Never add `DEV_WALLET_*`, `DEVNET_RPC_URL`, or any `secrets.*` to `ci.yml` or the read-only e2e path. Funded keypairs + the keyed RPC live **only** in `e2e.yml` (on-demand `@tx`), never on the per-PR path, never on forks.
- **Never commit a keypair** — not even an unfunded one. Read-only e2e generates ephemeral keys at runtime (`scripts/gen-dev-wallets.mjs`). `.env.local`, `DEV_WALLET_KEYPAIR_DIR` folders, and `*keypair*.json` stay gitignored.
- **`VITE_*` ships to the public bundle.** Never put an API key / keyed RPC in a `VITE_` var consumed by a `vite build`. Production reads the keyless public endpoint; a dedicated prod RPC must be fronted by a same-origin proxy (like the liquidity-guard proxy), keeping the key server-side.
- **Dev-wallet key injection is double-guarded** — `command === "serve"` in `vite.config.ts` **and** `import.meta.env.DEV` in `main.tsx`. Never loosen either; dev private keys must never reach a `vite build` or a `build/` artifact.
- **Artifacts must carry nothing sensitive.** Keep Playwright trace/screenshot/video `off` under CI — they record served JS (which under `@tx` contains the dev-wallet keys) and request URLs (the keyed RPC). Uploaded reports are downloadable by anyone with repo read.

**Web3 provider constraints.**

- **The app is wallet-gated.** `useSettlementProgram` returns `null` with no wallet and every list query is `enabled: program !== null`, so nothing reads the chain until a wallet connects and clears the `signMessage` auth gate. Any e2e that asserts on chain data **must connect a wallet first** via the dev wallet. Read-only needs only an **ephemeral, unfunded** wallet (signMessage signs locally); real funds are for `@tx` only.
- **Don't invent auth/wallet abstractions** (locked in Stack direction). The dev wallet is a standard `wallet-standard:register-wallet` handshake with zero changes to `WalletProviders.tsx`/`AuthProvider.tsx` — SWA auto-discovers it like Phantom.
- **RPC read shape drives testability.** The marketplace list is Anchor `program.account.rfq.all()` → `getProgramAccounts` and opens **no** websocket; detail/Config use `getAccountInfo` + a non-blocking subscription (initial data is the HTTP query; `onAccountChange` errors are swallowed). Public `api.devnet.solana.com` throttles `getProgramAccounts` from datacenter/CI IPs — this is _why_ CI must not hit live devnet (hence the cassette) and why the `@tx` run needs `DEVNET_RPC_URL`.
- **The two load-bearing on-chain rules still bind** (see "Three load-bearing on-chain rules"): the **178-byte commit-hash preimage** is byte-identical across the three repos, and the **liquidity-guard ed25519 pubkey lives on-chain in `Config.liquidity_guard`, not env**. Never re-introduce a `VITE_LIQUIDITY_GUARD_PUBKEY`.

## Browser-testing policy

Any change that touches the running app (routes, wallet flow, modals, styling, anything rendered) **must be end-to-end tested by Claude itself via the `claude-in-chrome` MCP tools** before the task is reported complete. Do not hand a build back to the user with "go test it in your browser" — that wastes a round-trip when Claude has a browser driver available.

Minimum flow on every UI-affecting change:

1. `npm run dev` in the background.
2. `mcp__claude-in-chrome__navigate` to the relevant route.
3. `mcp__claude-in-chrome__javascript_tool` to inspect DOM / `localStorage` / global state.
4. `mcp__claude-in-chrome__read_console_messages` to catch runtime errors (especially the SWA `WalletConnectionError: Request of type 'wallet_requestPermissions' already pending` class of issues — these only surface at click-time, never in `tsc` or `vite build`).
5. Kill the dev server when done (`pkill -f vite`).

If a wallet interaction can't be driven end-to-end by automation (e.g. the extension popup itself requires a real user gesture), drive it as far as possible — click through the modal, verify the adapter fires without errors, check SWA state via `window.phantom?.solana?.isConnected` / `localStorage.walletName` — and explicitly flag the remaining manual step. Silence = assumed-broken.

Two practical shortcuts: `/dev/stories` is reachable **without auth** (it sits outside `DashboardLayout`), so shared components can be verified there at any viewport without a wallet — add new primitives to that gallery as part of building them. The dashboard screens sit behind the `signMessage` gate — with `DEV_WALLET_KEYPAIR_DIR` set (see "Dev-only UI" above), a `Dev: <keypair filename>` wallet is available in SWA's picker and signs `signMessage`/transactions locally, so automation **can** click through connect → sign-in → the full maker/taker instruction flows without a real extension. Only fall back to "flag the wallet-gated click-through for the user" when no dev wallet is configured for the session.

## Figma design backup (after every commit)

The Figma design file from #21 (`https://www.figma.com/design/ywVePMypIpifiUMA9auaMs`) is the visual source of truth **and a living backup of the shipped UI**. After **each commit that changes rendered UI** (components, screens, styling, layout — not docs/CI/pure-logic changes, which are exempt):

1. Capture the affected screens/components in their new state (the browser-testing flow above already produces these — desktop and mobile where the change is responsive).
2. Sync them into the Figma design file via the **Figma MCP tools** — load the `figma-generate-design` skill first, then `use_figma` / `generate_figma_design` targeting that file.
3. Put backups on a **dedicated, clearly-named backup page** — `Code backup — <yyyy-mm-dd> <short-sha>` — one page per commit. **Never modify or overwrite existing design pages**; design exploration pages stay authoritative for intent, backup pages record what actually shipped.
4. **Never use Figma Make against this repo** (existing hard rule above) — backups go through the MCP into the #21 design file only.

If the Figma MCP is unavailable in the session, note the skipped backup in the final report instead of silently dropping it.

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

Styling: Tailwind v4 via `@tailwindcss/vite`. Global styles are split across `src/styles/{wallet-adapter,fonts,tailwind,theme}.css`, all imported from `src/styles/index.css`. `wallet-adapter.css` is a **bespoke, class-for-class replacement** for `@solana/wallet-adapter-react-ui/styles.css` (glass chips/dropdown/modal matching the theme, no runtime Google-Fonts import); structural rules mirror the package stylesheet so SWA behavior is unchanged — diff against the package file after wallet-adapter upgrades. PostCSS config is intentionally empty (`postcss.config.mjs`) — `@tailwindcss/vite` handles everything.

The RFQ lifecycle has **9 states** (`Draft → Open → Committed → Revealed → Selected → Settled` plus terminal `Expired`, `Ignored`, `Incomplete`). Mirrored from `../settlement-engine/programs/settlement-engine/src/state/rfq.rs` — the Rust is the authoritative spec. The Rust discriminant order is `… Settled=5, Ignored=6, Expired=7, Incomplete=8`; decoders map enum variants **by name**, and a unit test asserts the order against the committed IDL.

### `src/chain/` (Phase 1 + 2)

Everything that touches the chain or the attestation service. One concern per file:

- `env.ts` — typed access to `import.meta.env`. `VITE_SETTLEMENT_PROGRAM_ID` is an **optional override**: absent it falls back to the committed IDL's `address` field with a `console.warn`, so an unconfigured deploy (e.g. Vercel preview) still boots; an explicitly-set invalid value still throws. There is **no `VITE_USDC_MINT`** — the USDC mint is always read live from the on-chain Config account (`config.usdcMint`) or a decoded RFQ's own snapshot (`rfq.usdcMint`), never from client env. **The ed25519 attestation pubkey is intentionally NOT in env** — see "liquidity-guard pubkey" rule below.
- `cluster.ts` — `Cluster` type, `endpointFor()`, `useClusterState()` (persists to `localStorage "unleak.cluster"`).
- `pda.ts` — PDA derivation for every program account (config, rfq, quote, commit-guard, settlement, fees_tracker, slashed_bonds_tracker, facilitator_reward).
- `program.ts` — `useSettlementProgram()` returns a typed Anchor `Program<SettlementEngine>` once a wallet is connected.
- `commitHash.ts` — 178-byte preimage builder + SHA-256. Byte-exact match required vs. settlement-engine + liquidity-guard.
- `math.ts` — `computeTotalFee` / `computeFacilitatorShare` / `takerUplift` / `totalToFund`, mirroring `settlement.rs` + `complete_settlement.rs` (bigint, floor division, min-1 fee when bps > 0). **The protocol fee is paid on top of the quote amount** — the RFQ poster receives the full quote amount; the funding side needs `quote + fee`.
- `state-machine.ts` — deadline math (`commitDeadline` … `fundingDeadline`) and every instruction guard (`canCommitQuote`, `canRevealQuote`, `canSelectQuote`, …) ported 1:1 from the Rust instruction files, plus `nextAllowedStates(state, role)`. Inputs are structural so mock and decoded accounts both satisfy them; `now` is passed explicitly in unix seconds.
- `liquidityGuard.ts` — `deriveSalt` (calls `wallet.signMessage(rfq.toBytes())` → 64-byte ed25519 sig), `fetchAttestation` (POST `/check`, exp-backoff on 429), `verifyAttestation(hash, sig, pubkey)` (the pubkey arg is `config.liquidityGuard`), `fetchHealth` (GET `/health`).
- `tx.ts` — `sendAndConfirmWithToast()` Sonner-wrapped tx submit helper.
- `accountSubscription.ts` — `useAccountSubscription<T>(pubkey, decoder, queryKey)` glues `connection.onAccountChange` into `queryClient.setQueryData`. No polling loops.
- `accounts/` — one file per program account (`config`, `rfq`, `quote`, `commitGuard`, `settlement`, `feesTracker`, `slashedBondsTracker`, `facilitatorRewardTracker`): zod schema (`z.infer` is the exported type) + `normaliseX()` (Anchor raw → validated normalised shape: u64→bigint, i64→number unix secs, `[u8;N]`→Uint8Array, enum→`RFQState` string) + `useXAccount(address)` hook. All hooks share `accounts/useDecodedAccount.ts` (fetch + websocket subscription plumbing); zod atoms/converters live in `accounts/shared.ts`. **The Borsh coder is keyed by camelCase account names** (`"rfq"`, not `"Rfq"`) because Anchor's `Program` camelCases the IDL at construction.
- `__tests__/` — Vitest suites; fixtures encode Raw accounts through `BorshCoder(convertIdlToCamelCase(idl))` from the committed IDL, so decode round-trips prove decoder ↔ IDL parity without a validator.
- `idl/settlement_engine.{json,ts}` — copied from `../settlement-engine/target/` by `npm run copy-idl`. **Committed**, not generated at install time.

### Three load-bearing on-chain rules

- **Commit-hash preimage (178 bytes)** lives in three repos and must stay byte-identical: `../settlement-engine/.../instructions/quote/commit_quote.rs` (verifier), `../liquidity-guard/src/main.rs` (signer), `src/chain/commitHash.ts` (preflight). Layout: `salt[64] ‖ rfq[32] ‖ taker[32] ‖ quote_mint[32] ‖ quote_amount_LE[8] ‖ bond_amount_LE[8] ‖ taker_fee_bps_LE[2]`. Endianness is little-endian for the numeric fields. Update all three together.
- **liquidity-guard ed25519 pubkey is on-chain, not in env**. Source of truth is `Config.liquidity_guard` (read via `useConfigAccount()`). `verifyAttestation()` takes the pubkey as an argument — pass `config.data.liquidityGuard`. The service's `/health.service_pubkey` is cross-checked against Config and surfaces drift in `HealthPill` (amber). Do not re-introduce a `VITE_LIQUIDITY_GUARD_PUBKEY` env var.
- **liquidity-guard is per-cluster; call it via the dev-proxy paths, never a raw URL.** (The service now serves permissive CORS by default — `allow_any_origin` wildcard — so production can call it cross-origin; the proxy indirection is kept for URL/env hygiene and so client code stays cluster-parameterised.) Each cluster has its own upstream (localnet `http://localhost:8080`, devnet/mainnet on Heroku — see `vite.config.ts` `LG_DEFAULTS`, overridable via `VITE_LG_URL_{LOCALNET,DEVNET,MAINNET}`). Because the dev proxy is static but the cluster is a runtime choice, we expose **one path per cluster**: `/liquidity-guard/<cluster>/*` (`<cluster>` ∈ `localnet|devnet|mainnet`; `mainnet-beta`→`mainnet`). All client code must call `/liquidity-guard/<cluster>/health` and `/liquidity-guard/<cluster>/check` via `liquidityGuard.ts` (which takes the active `Cluster`), never a raw URL — there is no `env.liquidityGuardUrl` anymore.

### Dev-only UI

- `<HealthPill/>` (`src/app/components/HealthPill.tsx`) — the guard-status chip in the navbar control rail, **production-visible** since the control-rail redesign (no longer DEV-gated). Pings `/health` every 15s; presentational `GuardStatusView` (chip + details: service status, network match, guard key verified against on-chain Config) is fixture-driven for stories/RTL. The details render in a `GlassPopover` at ≥`md` and the vaul bottom sheet below (see "Responsive overlay rules" in E2E policy); the mobile-menu instance passes `block` for the full-width chip. States: emerald (ok), amber (drift), red (down), pulsing (loading).
- `<DevConfigPanel/>` (`src/app/components/DevConfigPanel.tsx`) — dumps decoded Config fields. Renders only when `import.meta.env.DEV && URLSearchParams.get("debug") === "1"`. Use `/dashboard?debug=1` to verify chain wiring end-to-end.
- `/dev/stories` (`src/app/components/ComponentStories.tsx`) — DEV-only gallery of the shared primitives (`RFQStatePipeline` in all 9 states, `DeadlineRing`, `BondBreakdown`, `TokenAmountInput`, `AddressDisplay`, `RFQActionSheet`, `ResponsiveModal`, `RewardsSection` with two-mint fixtures, the `RFQForm` wizard, `AuthGate`, empty/skeleton/error states). The Storybook/Ladle stand-in. Other shared chrome: `PageShell` (page surface + `--nav-h` offset + orbs + container) wraps every dashboard screen; `bg-surface-page`/`bg-surface-raised` theme tokens replace the old hardcoded hexes; `<MotionConfig reducedMotion="user">` honours prefers-reduced-motion globally.
- **Dev-only keypair-backed test wallets** (`src/dev/devWallet.ts`) — registers one Wallet Standard wallet per `*.json` Solana CLI keypair file found in `DEV_WALLET_KEYPAIR_DIR` (an env var, read server-side by `vite.config.ts` only for the dev server — never `vite build` — so it can never end up in a production bundle). Each shows up in SWA's wallet picker as `Dev: <filename>` and signs `signMessage`/`signTransaction` locally with that keypair, so the `signMessage` auth gate and every on-chain instruction can be driven **without a real browser extension** — this is what unblocks Claude's own `claude-in-chrome` testing of wallet-gated screens (previously the hard limit called out in "Browser-testing policy" below). It is registered via the standard `wallet-standard:register-wallet` handshake, the same mechanism real wallets use — **zero changes to `WalletProviders.tsx` or `AuthProvider.tsx`**, so it does not violate the "no bespoke auth abstraction" rule in "Stack direction (locked)": SWA auto-discovers it exactly like Phantom/Solflare. Only ever point this at devnet-funded keypairs, never mainnet.

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
- Rate limit (opt-in via the service's `RATE_LIMIT` env, default off): actix-governor `seconds_per_request(2)`, burst 5 — i.e. **~0.5 req/s sustained**, not 2 req/s. 429s carry a `Retry-After` header with a plain-text body (not the JSON error envelope). Treat 429 as a user-visible wait with exponential backoff (`fetchAttestation` does 300/900/2700ms; it does not read Retry-After).
- **Commit-hash preimage** see "Three load-bearing on-chain rules" above. The taker's `salt` is `wallet.signMessage(rfq.pubkey.toBytes())` — 64-byte ed25519 signature, deterministic per (wallet, rfq). Losing the salt = the taker can never reveal, so #14 requires both a `localStorage` backup keyed by `rfq_pubkey` and a downloadable "reveal ticket" JSON fallback.

## Deployment

- **Production** (`app.unleak.trade`) — GitHub Pages via `.github/workflows/deploy.yml`, triggered on push to `main`. Workflow copies `build/index.html` to `build/404.html` for SPA fallback and writes a `CNAME` file.
- **PR previews** — Vercel via `.github/workflows/preview.yml`. Internal non-bot PRs only (skips forks **and Dependabot** — a Dependabot `pull_request` run gets Dependabot secrets, not repository secrets, so `VERCEL_TOKEN` would be empty and the job would always fail).
- Both workflows pin Node 22 and use the latest `actions/*` versions.

## Commit style

Sign every commit (`git commit -S`). Keep messages short (single-line conventional subject preferred — `chore(ci): ...`, `feat: ...`). **Do not add a `Co-Authored-By: Claude ...` trailer** or any mention of Claude / Claude Code in the message. This is the user's explicit preference and applies to every commit in this repo.

When running `npm run build` produces a `build/` directory — it is `.gitignored`, leave it alone. Never stage it.
