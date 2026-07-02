import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Page, expect } from "@playwright/test";

/** Section header labels in the marketplace's grouped (horizontal) view. */
export type RfqStateGroupLabel =
  | "Draft"
  | "Open"
  | "Committed"
  | "Revealed"
  | "Selected"
  | "Settled"
  | "Expired"
  | "Ignored"
  | "Incomplete";

/**
 * Expands a state group in the marketplace and opens the first RFQ in it.
 * scripts/seed.ts is append-only and not resettable, so tests never assume a
 * specific pubkey — they search for "at least one fixture in this state"
 * instead, which stays valid as more fixtures accumulate over time.
 */
export async function openFirstRfqInGroup(page: Page, group: RfqStateGroupLabel): Promise<void> {
  await page.goto("/dashboard");
  const header = page.getByRole("button", { name: new RegExp(`^${group} \\(`) });
  await expect(header).toBeVisible({ timeout: 15_000 });
  await header.click();
  const viewButton = header.locator("xpath=following::button[normalize-space(text())='View'][1]");
  await expect(viewButton).toBeVisible({ timeout: 10_000 });
  await viewButton.click();
  await page.waitForURL(/\/dashboard\/rfq\//, { timeout: 10_000 });
}

/**
 * Like openFirstRfqInGroup, but hunts for a fixture whose action bar shows a
 * given CTA for the connected wallet, trying up to `maxCards` cards in the
 * group. Returns false when none qualifies.
 *
 * Needed because seeded devnet fixtures decay: an RFQ stays "Open" on-chain
 * after its commit window lapses (state only advances via close_expired), so
 * "first Open RFQ" stops offering "Commit quote" a few hours after seeding.
 * Callers should test.skip() on false — the @tx lifecycle spec creates its
 * own fresh fixture and remains the authoritative coverage.
 */
export async function openFirstRfqWithCta(
  page: Page,
  group: RfqStateGroupLabel,
  ctaName: string | RegExp,
  maxCards = 5,
): Promise<boolean> {
  for (let i = 0; i < maxCards; i++) {
    await page.goto("/dashboard");
    const header = page.getByRole("button", { name: new RegExp(`^${group} \\(`) });
    await expect(header).toBeVisible({ timeout: 15_000 });
    await header.click();
    const viewButton = header.locator(
      `xpath=following::button[normalize-space(text())='View'][${i + 1}]`,
    );
    if ((await viewButton.count()) === 0) return false;
    try {
      await viewButton.click({ timeout: 5_000 });
    } catch {
      return false;
    }
    await page.waitForURL(/\/dashboard\/rfq\//, { timeout: 10_000 });
    const cta = page.getByRole("button", { name: ctaName });
    if (await cta.isVisible({ timeout: 5_000 }).catch(() => false)) return true;
  }
  return false;
}

export interface TokenSpec {
  mint: string;
  symbol: string;
  decimals: number;
}

export interface CreateRfqOptions {
  /** Tokens the dev wallets actually hold — the liquidity-guard /check and
   * settlement move real balances. Use the seeded mints from
   * src/app/lib/seed-manifest.devnet.json (sBASE/sALT). */
  baseToken: TokenSpec;
  quoteToken: TokenSpec;
  baseAmount: string;
  minQuoteAmount: string;
  /** USDC. Keep well under the dev wallets' funding. */
  bondAmount: string;
  /** Seconds, in wizard order: commit / reveal / selection / fund. */
  ttls: [string, string, string, string];
  /** Base58 set as the RFQ's reward recipient via Advanced Options. */
  facilitator?: string;
}

/** The seeded devnet mints the dev wallets are funded with (sBASE/sALT),
 * looked up by symbol in the manifest scripts/seed.ts writes. Read with fs
 * (not a JSON import) because Playwright's Node loader requires import
 * attributes for JSON modules. */
export function seededToken(symbol: string): TokenSpec {
  const manifestPath = join(process.cwd(), "src/app/lib/seed-manifest.devnet.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
    string,
    { symbol: string; decimals: number }
  >;
  const entry = Object.entries(manifest).find(([, meta]) => meta.symbol === symbol);
  if (!entry) throw new Error(`${symbol} missing from seed-manifest.devnet.json`);
  return { mint: entry[0], symbol, decimals: entry[1].decimals };
}

/** Seeded devnet mints aren't in the mainnet catalog the Listed tab filters,
 * so they're entered through the Unlisted tab (mint + symbol + decimals). */
async function pickUnlistedToken(page: Page, side: "base" | "quote", token: TokenSpec) {
  const wizard = page.getByRole("dialog").first();
  await wizard.getByRole("button", { name: `Select ${side} token` }).click();
  const selector = page.getByRole("dialog").last();
  await selector.getByRole("tab", { name: "Unlisted" }).click();
  await selector.getByLabel(/Token Mint Address/).fill(token.mint);
  await selector.getByLabel(/^Symbol/).fill(token.symbol);
  await selector.getByLabel(/^Decimals/).fill(String(token.decimals));
  await selector.getByRole("button", { name: "Add Unlisted Token" }).click();
}

/**
 * Drives the Create-RFQ wizard end to end (4 steps: tokens → economics →
 * timing → review) and returns the created Draft's detail-page URL.
 *
 * CreateRFQModal only renders its submit button on the review step, so every
 * step has to be walked; all locators are scoped to the dialog because the
 * navbar's own "Create RFQ" trigger stays in the DOM behind the modal.
 * The distinctive fractional amounts the caller passes double as the fixture
 * fingerprint: devnet seed data is append-only, so the fresh Draft is found
 * by amount, not by position.
 */
export async function createRfq(page: Page, opts: CreateRfqOptions): Promise<string> {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Create RFQ" }).first().click();
  const dialog = page.getByRole("dialog").first();
  await expect(dialog).toBeVisible();

  // Step transitions are animated (AnimatePresence): the exiting step's
  // inputs linger in the DOM for a beat, so every step waits for its marker
  // text AND for the spinbutton count to settle before filling — otherwise
  // nth() fills land on the previous step's fields.

  // Step 1 — tokens (base/quote via the Unlisted tab) + amounts.
  await pickUnlistedToken(page, "base", opts.baseToken);
  await pickUnlistedToken(page, "quote", opts.quoteToken);
  await dialog.getByLabel(/Base Amount/).fill(opts.baseAmount);
  await dialog.getByLabel(/Minimum Quote Amount/).fill(opts.minQuoteAmount);
  await expect(dialog.getByLabel(/Base Amount/)).toHaveValue(opts.baseAmount);
  await dialog.getByRole("button", { name: "Next" }).click();

  // Step 2 — economics. Default bond (5000 USDC) exceeds the dev wallets'
  // funding, so it must always be overridden.
  await expect(dialog.getByText("Set bond and fee requirements")).toBeVisible();
  await expect(dialog.getByRole("spinbutton")).toHaveCount(2);
  await dialog.getByLabel(/Bond Amount/).fill(opts.bondAmount);
  await expect(dialog.getByLabel(/Bond Amount/)).toHaveValue(opts.bondAmount);
  await dialog.getByRole("button", { name: "Next" }).click();

  // Step 3 — timing. The four duration inputs have no label association;
  // once the count settles they are exactly the four spinbuttons, in
  // commit/reveal/selection/fund order.
  await expect(dialog.getByText("Configure phase durations")).toBeVisible();
  await expect(dialog.getByRole("spinbutton")).toHaveCount(4);
  const durations = dialog.getByRole("spinbutton");
  for (const [i, secs] of opts.ttls.entries()) {
    await durations.nth(i).fill(secs);
    await expect(durations.nth(i)).toHaveValue(secs);
  }
  await dialog.getByRole("button", { name: "Next" }).click();

  // Step 4 — review (+ reward recipient under Advanced Options). Verify the
  // review actually reflects what was typed before submitting.
  await expect(dialog.getByText("Review your RFQ before publishing")).toBeVisible();
  await expect(dialog.getByText(`${opts.bondAmount} USDC`)).toBeVisible();
  if (opts.facilitator) {
    await dialog.getByRole("button", { name: "Advanced Options" }).click();
    await dialog.getByLabel(/Reward Recipient/).fill(opts.facilitator);
  }
  await dialog.getByRole("button", { name: "Create RFQ" }).click();
  await expect(page.getByText("Draft RFQ created")).toBeVisible({ timeout: 60_000 });

  // Locate the fresh Draft by its distinctive base amount and open it.
  await page.goto("/dashboard");
  const header = page.getByRole("button", { name: /^Draft \(/ });
  await expect(header).toBeVisible({ timeout: 15_000 });
  await header.click();
  const amountEl = page.getByText(opts.baseAmount, { exact: true }).first();
  await expect(amountEl).toBeVisible({ timeout: 10_000 });
  const viewButton = amountEl.locator("xpath=following::button[normalize-space(text())='View'][1]");
  await expect(viewButton).toBeVisible({ timeout: 10_000 });
  await viewButton.click();
  await page.waitForURL(/\/dashboard\/rfq\//, { timeout: 10_000 });
  await expect(page.getByText(opts.baseAmount).first()).toBeVisible();
  return page.url();
}

/**
 * Reload-polls until a CTA appears in the action bar. The state-machine
 * guards compare wall-clock `now` recomputed per render, so crossing a
 * deadline (commit → reveal window, reveal → selection window) only surfaces
 * after a fresh evaluation — a reload per attempt keeps it deterministic.
 */
export async function waitForActionWindow(
  page: Page,
  ctaName: string | RegExp,
  timeoutMs = 180_000,
): Promise<void> {
  await expect(async () => {
    await page.reload();
    // Enabled, not just visible: the selection table renders its per-row
    // buttons disabled before the window opens.
    await expect(page.getByRole("button", { name: ctaName }).first()).toBeEnabled({
      timeout: 4_000,
    });
  }).toPass({ timeout: timeoutMs, intervals: [5_000] });
}
