import { Buffer } from "buffer/";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

(globalThis as { Buffer?: typeof Buffer }).Buffer = Buffer;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
