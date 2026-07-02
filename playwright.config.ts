import { defineConfig, devices } from "@playwright/test";
import { devWalletKeypairDir } from "./e2e/helpers/env";

// This suite drives real devnet + a rate-limited liquidity-guard (~0.5 req/s
// sustained, burst 5 — actix-governor seconds_per_request(2)). Single worker,
// no retries locally, one retry in CI — parallel specs would compound
// rate-limit risk and cross-pollinate shared marketplace state
// (scripts/seed.ts is append-only, not resettable). See e2e/README.md.
//
// The dev-only Wallet Standard wallets (src/dev/devWallet.ts) are plain page
// JS registered via the standard window handshake — no browser extension or
// persistent context needed, so a stock chromium project is sufficient.
export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 120_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
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
      DEV_WALLET_KEYPAIR_DIR: devWalletKeypairDir() ?? "",
      // Public devnet RPC throttles getProgramAccounts from datacenter IPs,
      // so CI must supply a dedicated endpoint (secret DEVNET_RPC_URL →
      // VITE_RPC_URL_DEVNET). Locally the baked-in default is fine.
      ...(process.env.VITE_RPC_URL_DEVNET
        ? { VITE_RPC_URL_DEVNET: process.env.VITE_RPC_URL_DEVNET }
        : {}),
    },
  },
});
