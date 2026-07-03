# E2E suite

Two very different modes:

- **Read-only (`desktop` + `mobile`) — HERMETIC.** RPC is served from a
  committed cassette (`e2e/fixtures/rpc-cassette.json`) via `page.route`, the
  clock is pinned to capture time, and the wallets are **ephemeral + unfunded**.
  No live devnet, no liquidity-guard, no secrets, no network. This is the
  per-PR gate (`ci.yml`) and runs on forks too.
- **`tx` — live devnet.** The full commit→reveal→select→settle→claim lifecycle
  actually submits transactions, so it needs a real chain, funded wallets, and
  a working RPC. On-demand only (`e2e.yml`: `workflow_dispatch` or a `[full-e2e]`
  commit).

## Layout

```
e2e/
  fixtures.ts            # makerPage / taker1Page / taker2Page personas. For the
                         # hermetic projects it installs the RPC replay before
                         # the first navigation (gated on REPLAY_RPC/RECORD_RPC).
  fixtures/
    rpc-cassette.json    # recorded Solana JSON-RPC responses (committed)
    known-rfqs.ts        # stable RFQ pubkeys the specs navigate to directly
  helpers/
    rpc-replay.ts        # installRpcReplay() — record (passive) / replay (route)
    wallet.ts            # connectDevWallet()
    keys.ts              # devWalletAddress() (tx legs)
    rfq.ts               # openFirstRfqInGroup(), createRfq(), waitForActionWindow()
  specs/
    action-bar-empty-state.e2e.spec.ts   # read-only
    terminal-states.e2e.spec.ts          # read-only
    quote-modals.e2e.spec.ts             # read-only
    responsive-mobile.e2e.spec.ts        # read-only, @mobile
    lifecycle.e2e.spec.ts                # @tx — full round trip incl. reward claim
```

## Projects

| Project   | Selector            | Mode                    | When it runs                                              |
| --------- | ------------------- | ----------------------- | --------------------------------------------------------- |
| `desktop` | not `@tx`/`@mobile` | hermetic (cassette)     | every PR/push incl. forks (`ci.yml`)                      |
| `mobile`  | `@mobile`           | hermetic, iPhone 13     | every PR/push incl. forks (`ci.yml`)                      |
| `tx`      | `@tx`               | live devnet + real txns | `workflow_dispatch`, or a `[full-e2e]` commit (`e2e.yml`) |

## Running locally

```bash
# Hermetic read-only — no setup, no network, no keys:
npm run test:e2e            # REPLAY_RPC=1, desktop + mobile
npm run test:e2e:report     # open the last HTML report

# Full lifecycle against your own devnet (needs funded wallets + a real RPC):
export DEV_WALLET_KEYPAIR_DIR=/abs/path/to/devnet-keypairs  # maker/taker1/taker2.json
export VITE_RPC_URL_DEVNET=https://your-devnet-rpc          # public devnet 429s from CI IPs
npm run test:e2e:tx
```

The `tx` keypairs must be **devnet-funded** (bonds + rent; `scripts/seed.ts`
funds them) and must **never** hold mainnet assets. CI supplies them only to the
on-demand `e2e.yml` run via `DEV_WALLET_{MAKER,TAKER1,TAKER2}_KEYPAIR` +
`DEVNET_RPC_URL` — never to the per-PR gate.

## Regenerating the cassette

Re-record when the account layout / IDL changes (a stale cassette makes the
read-only specs assert against old bytes; the `tx` run is the live parity
guard). Recording passively observes real RPC traffic — it never intercepts —
so the live run behaves normally:

```bash
# 1. Ensure a fresh Open RFQ with a long commit window exists, and note its
#    pubkey into e2e/fixtures/known-rfqs.ts (OPEN_RFQ_WITH_COMMIT_WINDOW):
npm run seed -- --cluster devnet --maker-keypair <maker.json> \
  --facilitator <taker2-pubkey> --only open
# 2. Record against a working devnet RPC (public works from a residential IP):
DEV_WALLET_KEYPAIR_DIR=<funded-keys> npm run test:e2e:record
# 3. Verify replay is green with ephemeral wallets (as CI runs it):
node scripts/gen-dev-wallets.mjs /tmp/eph && \
  DEV_WALLET_KEYPAIR_DIR=/tmp/eph npm run test:e2e
```

The cassette key is `method + stable-stringified params` (the varying `id` is
excluded), so it matches whether the app points at real devnet (record) or the
pinned dummy origin `https://rpc.replay.test` (replay). A `__capturedAt`
timestamp is stored so replay can pin the clock and keep every deadline window
exactly as captured. Unmatched requests get a benign empty result, and an
ephemeral wallet's account queries legitimately return empty.

## Fixture philosophy

`scripts/seed.ts` is append-only and not resettable. The hermetic read-only
specs are deterministic against the cassette: terminal-state specs open the
first fixture in each group (stable, since the marketplace order comes from the
same cassette bytes), and the commit-modal / mobile specs navigate directly to
a known Open RFQ (`known-rfqs.ts`). The `tx` spec creates its own RFQ with
distinctive fractional amounts and finds it back by amount.
