import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * DEV_WALLET_KEYPAIR_DIR for the Playwright process. Vite loads `.env.local`
 * itself, but specs (and playwright.config.ts's webServer env) run in plain
 * Node — fall back to parsing `.env.local` so `npm run test:e2e` works
 * without exporting the variable manually. CI sets it explicitly.
 */
export function devWalletKeypairDir(): string | undefined {
  if (process.env.DEV_WALLET_KEYPAIR_DIR) return process.env.DEV_WALLET_KEYPAIR_DIR;
  try {
    const envLocal = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    const match = envLocal.match(/^\s*DEV_WALLET_KEYPAIR_DIR\s*=\s*(.+?)\s*$/m);
    return match?.[1];
  } catch {
    return undefined;
  }
}
