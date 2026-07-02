import { defineConfig, devices } from "@playwright/test";

// This suite drives real devnet + a rate-limited liquidity-guard (2 req/s
// sustained). Single worker, no retries locally, one retry in CI — parallel
// specs would compound rate-limit risk and cross-pollinate shared marketplace
// state (scripts/seed.ts is append-only, not resettable). See e2e/README.md.
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
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Dev wallets are only registered under `vite` (command === "serve") —
    // never `vite build` / `vite preview` — so the suite must run against the
    // real dev server, not a production build.
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      DEV_WALLET_KEYPAIR_DIR: process.env.DEV_WALLET_KEYPAIR_DIR ?? "",
    },
  },
});
