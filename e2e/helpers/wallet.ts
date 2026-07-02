import { type Page } from "@playwright/test";

export type DevWalletLabel = "maker" | "taker1" | "taker2";

/**
 * Connects one of the dev-only keypair-backed Wallet Standard wallets
 * (src/dev/devWallet.ts, registered as "Dev: <label>"). Two clicks are
 * needed: picking the wallet in SWA's modal only calls `select()` — the
 * WalletMultiButton then relabels itself "Connect" (SWA's `LABELS['has-wallet']`)
 * for the actual connect, which is when the dev wallet's signMessage resolves
 * and the app's AuthProvider signMessage gate completes synchronously.
 */
export async function connectDevWallet(page: Page, label: DevWalletLabel): Promise<void> {
  await page.getByRole("button", { name: "Select Wallet" }).click();
  await page.getByRole("button", { name: `Dev: ${label}` }).click();
  // Not `exact: true` — the button's accessible name includes the wallet
  // icon's alt text too (e.g. "Dev: maker icon Connect"), not just "Connect".
  await page.getByRole("button", { name: "Connect" }).click();
  await page.waitForURL("**/dashboard**", { timeout: 20_000 });
}
