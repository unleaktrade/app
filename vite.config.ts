/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type ProxyOptions } from "vite";
import path from "path";
import fs from "fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

// Dev-only keypair-backed wallets (src/dev/devWallet.ts) so Claude / local dev
// can drive wallet-gated flows without a real Phantom-style extension. Only
// read when running the dev server (never `vite build`), so a leftover env
// var can't leak secret keys into a production bundle. Point
// DEV_WALLET_KEYPAIR_DIR at a folder of Solana CLI keypair JSON files
// (arrays of 64 secret-key bytes) — each file becomes one selectable wallet.
function loadDevWallets(dir: string | undefined): { label: string; secretKey: number[] }[] {
  if (!dir) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      label: f.replace(/\.json$/, ""),
      secretKey: JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")),
    }));
}

// liquidity-guard upstreams per Solana cluster. The service sets no CORS
// headers, so in dev every cluster is proxied through the dev server (same
// origin). The proxy is static (set at server start) while the cluster is a
// runtime choice, so we expose ONE path per cluster (/liquidity-guard/<cluster>)
// and let the client pick the path — see src/chain/liquidityGuard.ts.
// Defaults below can be overridden per env via VITE_LG_URL_{LOCALNET,DEVNET,MAINNET}.
const LG_DEFAULTS = {
  localnet: "http://localhost:8080",
  devnet: "https://liquidity-guard-devnet-e1779e87cf84.herokuapp.com",
  mainnet: "https://liquidity-guard-mainnet-162b828790cf.herokuapp.com",
} as const;

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const lgTarget = {
    localnet: env.VITE_LG_URL_LOCALNET || LG_DEFAULTS.localnet,
    devnet: env.VITE_LG_URL_DEVNET || LG_DEFAULTS.devnet,
    mainnet: env.VITE_LG_URL_MAINNET || LG_DEFAULTS.mainnet,
  };
  // command === "serve" excludes `vite build` — dev wallets never ship.
  const devWallets = command === "serve" ? loadDevWallets(env.DEV_WALLET_KEYPAIR_DIR) : [];
  const lgProxy = (segment: string, target: string): ProxyOptions => ({
    target,
    changeOrigin: true,
    rewrite: (p) => p.replace(new RegExp(`^/liquidity-guard/${segment}`), ""),
  });

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        // Support Figma Make asset imports in Vite
        "figma:asset": path.resolve(__dirname, "./src/assets"),
        // Alias @ to the src directory
        "@": path.resolve(__dirname, "./src"),
        // Force the npm `buffer` / `process` packages for browser use instead of Node's built-ins
        buffer: "buffer/",
        process: "process/browser",
      },
    },
    define: {
      global: "globalThis",
      __DEV_WALLETS__: JSON.stringify(devWallets),
    },
    optimizeDeps: {
      include: ["buffer", "process"],
    },
    build: {
      outDir: "build",
    },
    test: {
      // No env injection needed: src/chain/env.ts falls back to committed
      // defaults when VITE_* vars are absent (env.test.ts pins this).
      // Two projects: pure-logic suites stay on the node runtime (*.test.ts),
      // React component suites get jsdom + testing-library (*.test.tsx).
      projects: [
        {
          extends: true,
          test: {
            name: "node",
            environment: "node",
            include: ["src/**/*.test.ts"],
          },
        },
        {
          extends: true,
          test: {
            name: "jsdom",
            environment: "jsdom",
            include: ["src/**/*.test.tsx"],
            setupFiles: ["./src/test/setup.ts"],
          },
        },
      ],
    },
    server: {
      port: 3000,
      open: true,
      // One proxy path per cluster; the client routes to the matching one.
      // Production (no dev server) needs same-origin hosting or a CORS-enabled
      // reverse proxy per cluster — out of scope here.
      proxy: {
        "/liquidity-guard/localnet": lgProxy("localnet", lgTarget.localnet),
        "/liquidity-guard/devnet": lgProxy("devnet", lgTarget.devnet),
        "/liquidity-guard/mainnet": lgProxy("mainnet", lgTarget.mainnet),
      },
    },
  };
});
