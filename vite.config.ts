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

// liquidity-guard upstreams per Solana cluster. In dev every cluster is proxied
// through the dev server (same origin) so the browser never makes a cross-origin
// call while iterating. The proxy is static (set at server start) while the
// cluster is a runtime choice, so we expose ONE path per cluster
// (/liquidity-guard/<cluster>) and let the client pick the path. In production
// there is no dev server, so the client calls the upstream directly — the Rust
// service now serves permissive CORS (allow_any_origin), which makes the
// cross-origin call safe. The resolved map is handed to the client verbatim via
// the __LG_TARGETS__ define below — see src/chain/liquidityGuard.ts.
// Defaults below can be overridden per env via VITE_LG_URL_{LOCALNET,DEVNET,MAINNET}.
const LG_DEFAULTS = {
  localnet: "http://localhost:8080",
  devnet: "https://liquidity-guard-devnet-e1779e87cf84.herokuapp.com",
  mainnet: "https://liquidity-guard-mainnet-162b828790cf.herokuapp.com",
} as const;

// Production Content-Security-Policy. Injected as a <meta> only on `vite build`
// (never the dev server — a page CSP would break Vite's HMR websocket and
// tooling). GitHub Pages can't set response headers, so the meta is the only
// lever; frame-ancestors / report-uri (header-only directives) are therefore
// out of scope. Rationale per directive:
//   script-src 'self'          — only our own bundled chunks execute; wallet
//                                extensions run as content scripts (their own
//                                origin) and talk via postMessage, so they need
//                                no page-CSP exception.
//   style-src  'unsafe-inline' — motion/recharts/Tailwind set inline style
//                                attributes; unavoidable and low-risk vs scripts.
//   connect-src                — Solana RPC (https + wss for subscriptions),
//                                the per-cluster liquidity-guard upstreams, and
//                                the Jupiter token/price API (src/app/lib/jupiter.ts).
//   img-src https:             — remote token logos (Jupiter CDN) + data: (QR /
//                                html-to-image receipts).
function buildCsp(): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "worker-src 'self' blob:",
    "frame-src 'self'",
    "form-action 'self'",
    [
      "connect-src 'self'",
      "https://api.devnet.solana.com wss://api.devnet.solana.com",
      "https://api.mainnet-beta.solana.com wss://api.mainnet-beta.solana.com",
      `${LG_DEFAULTS.devnet} ${LG_DEFAULTS.mainnet}`,
      "https://lite-api.jup.ag",
    ].join(" "),
  ].join("; ");
}

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

  // Inject the production CSP <meta> at build time only (apply: "build").
  const cspPlugin = {
    name: "inject-csp",
    apply: "build" as const,
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: buildCsp() },
        injectTo: "head-prepend" as const,
      },
    ],
  };

  return {
    plugins: [react(), tailwindcss(), cspPlugin],
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
      // Resolved liquidity-guard upstreams, exposed to the client so a
      // production build (no dev proxy) can call the upstream directly. These
      // are public, keyless URLs — safe to inline into the bundle.
      __LG_TARGETS__: JSON.stringify(lgTarget),
    },
    optimizeDeps: {
      include: ["buffer", "process"],
    },
    build: {
      outDir: "build",
      rollupOptions: {
        output: {
          // Pin the heavy, rarely-changing vendor deps into stably-named chunks
          // so they cache across app-code deploys (and so the bundle budget
          // measures a meaningful boundary). web3.js + Anchor are needed at boot
          // by the wallet providers, so vendor-solana loads eagerly; recharts is
          // only reached from lazy routes, so vendor-charts stays async.
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (
              id.includes("@solana") ||
              id.includes("@coral-xyz") ||
              id.includes("web3.js") ||
              id.includes("jayson") ||
              id.includes("rpc-websockets")
            ) {
              return "vendor-solana";
            }
            if (id.includes("recharts") || id.includes("/d3-") || id.includes("victory")) {
              return "vendor-charts";
            }
            return undefined;
          },
        },
      },
    },
    test: {
      // No env injection needed: src/chain/env.ts falls back to committed
      // defaults when VITE_* vars are absent (env.test.ts pins this).
      // Coverage gates the deterministic logic layers (src/chain/ +
      // src/app/lib/) — components are exercised by RTL + the hermetic e2e
      // suite instead of being coverage-gated (issue #17 reconciliation).
      // Wallet/RPC plumbing (tx builders, query hooks, subscriptions) is
      // excluded for the same reason: it needs a connection + signer, and the
      // hermetic replay + on-demand @tx e2e runs are its test surface.
      coverage: {
        provider: "v8" as const,
        include: ["src/chain/**/*.ts", "src/app/lib/**/*.ts"],
        exclude: [
          "src/chain/idl/**",
          "**/__tests__/**",
          "**/*.test.*",
          "src/chain/instructions/**",
          "src/chain/accounts/byKeys.ts",
          "src/chain/accounts/useDecodedAccount.ts",
          "src/chain/program.ts",
          "src/chain/tx.ts",
          "src/chain/accountSubscription.ts",
          "src/chain/liquidityGuard.ts",
        ],
        reporter: ["text", "html", "json-summary"],
        thresholds: {
          statements: 70,
          lines: 70,
          functions: 65,
          branches: 60,
          "src/chain/**/*.ts": {
            statements: 80,
          },
        },
      },
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
      // One proxy path per cluster; the client routes to the matching one in
      // dev. Production has no dev server, so the client calls the upstream
      // directly via __LG_TARGETS__ (the service serves permissive CORS).
      proxy: {
        "/liquidity-guard/localnet": lgProxy("localnet", lgTarget.localnet),
        "/liquidity-guard/devnet": lgProxy("devnet", lgTarget.devnet),
        "/liquidity-guard/mainnet": lgProxy("mainnet", lgTarget.mainnet),
      },
    },
  };
});
