import {
  test as base,
  expect,
  type Browser,
  type BrowserContextOptions,
  type Page,
} from "@playwright/test";
import { connectDevWallet, type DevWalletLabel } from "./helpers/wallet";
import { installRpcReplay } from "./helpers/rpc-replay";

interface DevWalletFixtures {
  makerPage: Page;
  taker1Page: Page;
  taker2Page: Page;
}

// The read-only projects (desktop/mobile) run hermetically: RPC is served from
// a committed cassette (see helpers/rpc-replay.ts) rather than live devnet, and
// the personas are ephemeral unfunded wallets. The `tx` project keeps the real
// chain. Gate on env so record and replay both install the interception, while
// `tx` never does.
const HERMETIC = Boolean(process.env.REPLAY_RPC || process.env.RECORD_RPC);

// Each persona gets its own browser context (own sessionStorage), matching
// the real multi-wallet scenario: connecting maker/taker are independent
// signMessage sessions, never the same tab switching identities.
// `contextOptions` is threaded through so per-project device emulation
// (e.g. the mobile project's iPhone viewport) applies to persona contexts —
// a bare newContext() would silently drop it.
async function connectedPage(
  browser: Browser,
  contextOptions: BrowserContextOptions,
  label: DevWalletLabel,
): Promise<Page> {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  // Install RPC interception before the first navigation so the initial
  // account reads are already served from the cassette.
  if (HERMETIC) await installRpcReplay(page);
  await page.goto("/");
  await connectDevWallet(page, label);
  return page;
}

export const test = base.extend<DevWalletFixtures>({
  makerPage: async ({ browser, contextOptions }, use) => {
    const page = await connectedPage(browser, contextOptions, "maker");
    await use(page);
    await page.context().close();
  },
  taker1Page: async ({ browser, contextOptions }, use) => {
    const page = await connectedPage(browser, contextOptions, "taker1");
    await use(page);
    await page.context().close();
  },
  taker2Page: async ({ browser, contextOptions }, use) => {
    const page = await connectedPage(browser, contextOptions, "taker2");
    await use(page);
    await page.context().close();
  },
});

export { expect };
