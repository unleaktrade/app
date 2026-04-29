import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
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
  server: {
    port: 3000,
    open: true,
    // The liquidity-guard service does not configure CORS, so we proxy it
    // through the dev server to keep requests same-origin. Production needs
    // same-origin hosting or a CORS-enabled reverse proxy (out of scope here).
    proxy: {
      "/liquidity-guard": {
        target: process.env.VITE_LIQUIDITY_GUARD_URL ?? "http://localhost:8080",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/liquidity-guard/, ""),
      },
    },
  },
});
