# E2E suite

Playwright specs driving the real app against **live devnet** and the
rate-limited liquidity-guard. No mocks — the dev-only Wallet Standard wallets
(`src/dev/devWallet.ts`) sign everything locally, so the whole wallet-gated
app is drivable headlessly.

## Layout

```
e2e/
  fixtures.ts            # makerPage / taker1Page / taker2Page — one browser
                         # context (own sessionStorage + signMessage session)
                         # per persona; threads contextOptions so device
                         # emulation from the project config applies
  helpers/
    wallet.ts            # connectDevWallet() — SWA modal → "Dev: <label>" → Connect
    keys.ts              # devWalletAddress() — base58 from the keypair files
    rfq.ts               # openFirstRfqInGroup(), createRfq() (full 4-step
                         # wizard), waitForActionWindow() (reload-poll until a
                         # deadline window opens)
  specs/
    action-bar-empty-state.e2e.spec.ts   # read-only
    terminal-states.e2e.spec.ts          # read-only
    quote-modals.e2e.spec.ts             # read-only
    responsive-mobile.e2e.spec.ts        # read-only, @mobile (iPhone viewport)
    lifecycle.e2e.spec.ts                # @tx — full round trip incl. reward claim
```

## Projects & tags

`playwright.config.ts` splits the suite into three projects:

| Project   | Selector            | Cost                                           | When it runs                                                         |
| --------- | ------------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| `desktop` | not `@tx`/`@mobile` | read-only devnet RPC                           | every PR/push (`ci.yml`)                                             |
| `mobile`  | `@mobile`           | read-only, iPhone 13 viewport                  | every PR/push (`ci.yml`)                                             |
| `tx`      | `@tx`               | real transactions + ~3 min of deadline windows | `workflow_dispatch`, or a commit containing `[full-e2e]` (`e2e.yml`) |

Commit-message flags:

- **`[skip-e2e]`** — skips the read-only e2e job on that push/PR.
- **`[full-e2e]`** — additionally triggers the complete suite (including `tx`).

Everything runs with `workers: 1` — parallel specs would compound
liquidity-guard rate-limit risk (~0.5 req/s sustained, burst 5) and
cross-pollinate shared devnet state.

## Running locally

```bash
export DEV_WALLET_KEYPAIR_DIR=/absolute/path/to/devnet-keypairs  # maker.json, taker1.json, taker2.json
npm run test:e2e                       # all three projects
npx playwright test --project=desktop  # just the cheap read-only specs
npx playwright test --project=tx      # the full lifecycle (several minutes)
npm run test:e2e:report               # open the last HTML report
```

The keypair files are Solana CLI format. They must be **devnet-funded**
(the lifecycle spec needs ≥ ~2 USDC per wallet for bonds plus SOL for rent —
`scripts/seed.ts` funds them) and must **never** hold mainnet assets. CI gets
them from repo secrets (`DEV_WALLET_{MAKER,TAKER1,TAKER2}_KEYPAIR`, issue #33).

## Fixture philosophy

`scripts/seed.ts` is **append-only and not resettable**: specs never assume a
specific pubkey or count. Read-only specs search for "at least one fixture in
state X"; the lifecycle spec creates its own RFQ with distinctive fractional
amounts and finds it back by amount, not by position.
