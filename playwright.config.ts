import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { Keypair } from "@solana/web3.js";
import { devWalletKeypairDir } from "./e2e/helpers/env";

// Fresh, unfunded keypairs for the hermetic read-only run. Generated per run so
// the personas are guaranteed uninvolved in any cassette fixture (which is what
// the "connected but uninvolved wallet" assertions rely on) — never the funded
// wallets, whose real on-chain relationships would trip those assertions.
function ephemeralWalletDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "unleak-e2e-eph-"));
  for (const label of ["maker", "taker1", "taker2"]) {
    writeFileSync(
      join(dir, `${label}.json`),
      JSON.stringify(Array.from(Keypair.generate().secretKey)),
    );
  }
  return dir;
}

// Two modes (see e2e/README.md):
//   - Read-only (desktop/mobile): HERMETIC. RPC is served from a committed
//     cassette (helpers/rpc-replay.ts) and personas are ephemeral unfunded
//     wallets — no live devnet, no secrets. Driven by REPLAY_RPC (replay) or
//     RECORD_RPC (capture). This is the per-PR gate.
//   - tx: real devnet + a rate-limited liquidity-guard (~0.5 req/s sustained,
//     burst 5). On-demand only (e2e.yml). Needs funded dev wallets + a real RPC.
// Single worker, one retry in CI. The dev-only Wallet Standard wallets
// (src/dev/devWallet.ts) register via the standard window handshake, so a stock
// chromium project suffices.
const HERMETIC = Boolean(process.env.REPLAY_RPC);
export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 120_000,
  use: {
    baseURL: "http://localhost:3000",
    // No traces/screenshots/videos in CI: they record the dev server's
    // traffic — including the DEVNET_RPC_URL secret (API key in the URL) and
    // the dev-wallet keypairs baked into the served JS — and CI uploads the
    // report as a downloadable artifact on failure. Text output + the
    // error-context a11y snapshots remain, which is what failures are
    // diagnosed from anyway.
    trace: process.env.CI ? "off" : "retain-on-failure",
    screenshot: process.env.CI ? "off" : "only-on-failure",
    video: process.env.CI ? "off" : "retain-on-failure",
  },
  // Cheap-vs-expensive split via title tags:
  //   desktop — read-only specs, safe on every PR (ci.yml e2e-readonly job)
  //   mobile  — @mobile read-only specs under an iPhone viewport, also PR-safe
  //   tx      — @tx specs with real devnet transactions + deadline windows;
  //             only workflow_dispatch / [full-e2e] commits (e2e.yml)
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      grepInvert: /@tx|@mobile/,
    },
    {
      name: "mobile",
      // iPhone 13's descriptor defaults to webkit; CI only installs chromium,
      // so keep the viewport/UA emulation but run it on chromium.
      use: { ...devices["iPhone 13"], browserName: "chromium" },
      grep: /@mobile/,
    },
    {
      name: "tx",
      use: { ...devices["Desktop Chrome"] },
      grep: /@tx/,
    },
  ],
  webServer: {
    // Dev wallets are only registered under `vite` (command === "serve") —
    // never `vite build` / `vite preview` — so the suite must run against the
    // real dev server, not a production build.
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      // Replay always uses fresh ephemeral wallets (self-contained, matches CI
      // exactly, never depends on funded keys). Record/tx use the real funded
      // wallets from DEV_WALLET_KEYPAIR_DIR / .env.local.
      DEV_WALLET_KEYPAIR_DIR: HERMETIC ? ephemeralWalletDir() : (devWalletKeypairDir() ?? ""),
      // Replay: pin a dummy origin so the app's RPC target is deterministic and
      // no real network is ever reached even on a cassette miss (page.route
      // intercepts these requests). Record/tx: use the real endpoint the caller
      // supplied (VITE_RPC_URL_DEVNET), else the baked-in public default.
      ...(HERMETIC
        ? { VITE_RPC_URL_DEVNET: "https://rpc.replay.test" }
        : process.env.VITE_RPC_URL_DEVNET
          ? { VITE_RPC_URL_DEVNET: process.env.VITE_RPC_URL_DEVNET }
          : {}),
    },
  },
});
