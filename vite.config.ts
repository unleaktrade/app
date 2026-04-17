import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Support Figma Make asset imports in Vite
      "figma:asset": path.resolve(__dirname, "./src/assets"),
      // Alias @ to the src directory
      "@": path.resolve(__dirname, "./src"),
      // Force the npm `buffer` package for browser use instead of Node's built-in
      buffer: "buffer/",
    },
  },
  define: {
    // Solana web3.js expects `global` in the browser
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["buffer"],
  },
  build: {
    outDir: "build",
  },
  server: {
    port: 3000,
    open: true,
  },
});
