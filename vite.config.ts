/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type ProxyOptions } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const lgTarget = {
    localnet: env.VITE_LG_URL_LOCALNET || LG_DEFAULTS.localnet,
    devnet: env.VITE_LG_URL_DEVNET || LG_DEFAULTS.devnet,
    mainnet: env.VITE_LG_URL_MAINNET || LG_DEFAULTS.mainnet,
  };
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
    },
    optimizeDeps: {
      include: ["buffer", "process"],
    },
    build: {
      outDir: "build",
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
      // No env injection needed: src/chain/env.ts falls back to committed
      // defaults when VITE_* vars are absent (env.test.ts pins this).
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
