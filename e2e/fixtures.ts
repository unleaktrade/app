import { test as base, expect, type Browser, type Page } from "@playwright/test";
import { connectDevWallet, type DevWalletLabel } from "./helpers/wallet";

interface DevWalletFixtures {
  makerPage: Page;
  taker1Page: Page;
  taker2Page: Page;
}

// Each persona gets its own browser context (own sessionStorage), matching
// the real multi-wallet scenario: connecting maker/taker are independent
// signMessage sessions, never the same tab switching identities.
async function connectedPage(browser: Browser, label: DevWalletLabel): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  await connectDevWallet(page, label);
  return page;
}

export const test = base.extend<DevWalletFixtures>({
  makerPage: async ({ browser }, use) => {
    const page = await connectedPage(browser, "maker");
    await use(page);
    await page.context().close();
  },
  taker1Page: async ({ browser }, use) => {
    const page = await connectedPage(browser, "taker1");
    await use(page);
    await page.context().close();
  },
  taker2Page: async ({ browser }, use) => {
    const page = await connectedPage(browser, "taker2");
    await use(page);
    await page.context().close();
  },
});

export { expect };
