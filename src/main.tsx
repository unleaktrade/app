import "./polyfills";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

// Dev-only keypair-backed wallets — see src/dev/devWallet.ts. This branch is
// dead-code-eliminated from production builds since import.meta.env.DEV is a
// compile-time constant.
if (import.meta.env.DEV) {
  void import("./dev/devWallet");
}

createRoot(document.getElementById("root")!).render(<App />);
