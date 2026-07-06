// Docs screenshot harness — not a test suite. Captures the screens embedded in
// the GitBook user guide (unleaktrade/docs → user-guide/*) from the hermetic
// replay environment: cassette RPC, pinned clock, ephemeral wallets — the same
// no-devnet setup as the read-only specs, so the shots are reproducible on any
// machine with zero secrets. Opt-in: without DOCS_SCREENSHOTS=1 this file
// registers no tests, so the per-PR e2e gate and local runs are untouched.
//
//   DOCS_SCREENSHOTS=1 REPLAY_RPC=1 npx playwright test --project=desktop docs-screenshots
//
// PNGs land in DOCS_SHOTS_DIR (default e2e/artifacts/docs-screenshots,
// git-ignored and outside test-results/, which Playwright wipes per run);
// copy the keepers into the docs repo's .gitbook/assets/.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "../fixtures";
import { installRpcReplay } from "../helpers/rpc-replay";
import { OPEN_RFQ_WITH_COMMIT_WINDOW } from "../fixtures/known-rfqs";
import { openFirstRfqInGroup } from "../helpers/rfq";

const OUT_DIR = process.env.DOCS_SHOTS_DIR ?? join("e2e", "artifacts", "docs-screenshots");
const out = (name: string) => join(OUT_DIR, `${name}.png`);

if (process.env.DOCS_SCREENSHOTS) {
  mkdirSync(OUT_DIR, { recursive: true });
  // Docs shots use a slightly roomier canvas than the desktop project default.
  test.use({ viewport: { width: 1440, height: 900 } });

  test("connect screen", async ({ browser, contextOptions }) => {
    // Fresh context: the persona fixtures are already connected, and this shot
    // needs the pre-connect landing state.
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    await installRpcReplay(page);
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Select Wallet" })).toBeVisible();
    await page.screenshot({ path: out("connect"), animations: "disabled" });
    await context.close();
  });

  test("marketplace", async ({ makerPage }) => {
    await makerPage.goto("/dashboard");
    await expect(makerPage.getByRole("button", { name: /^Open \(/ })).toBeVisible({
      timeout: 15_000,
    });
    await makerPage.screenshot({ path: out("marketplace"), animations: "disabled" });
    await makerPage.screenshot({
      path: out("marketplace-full"),
      fullPage: true,
      animations: "disabled",
    });
  });

  test("open RFQ detail + commit modal", async ({ taker2Page }) => {
    await taker2Page.goto(`/dashboard/rfq/${OPEN_RFQ_WITH_COMMIT_WINDOW}`);
    const commitCta = taker2Page.getByRole("button", { name: "Commit quote" });
    await expect(commitCta).toBeVisible({ timeout: 15_000 });
    await taker2Page.screenshot({ path: out("rfq-detail-open"), animations: "disabled" });
    await taker2Page.screenshot({
      path: out("rfq-detail-open-full"),
      fullPage: true,
      animations: "disabled",
    });

    await commitCta.click();
    await expect(taker2Page.getByRole("heading", { name: "Commit a quote" })).toBeVisible();
    // Let the modal's enter transition and the bond breakdown settle.
    await expect(taker2Page.getByText(/Minimum .* base units/)).toBeVisible();
    await taker2Page.screenshot({ path: out("commit-quote-modal"), animations: "disabled" });
  });

  test("settled RFQ detail", async ({ makerPage }) => {
    await openFirstRfqInGroup(makerPage, "Settled");
    // The group navigation leaves the page scrolled and the cursor over the
    // View button's old position — reset both so the shot starts at the hero.
    await makerPage.mouse.move(0, 0);
    await makerPage.evaluate(() => window.scrollTo(0, 0));
    await expect(makerPage.getByText("Settlement complete")).toBeVisible();
    await makerPage.screenshot({ path: out("rfq-detail-settled"), animations: "disabled" });
    await makerPage.screenshot({
      path: out("rfq-detail-settled-full"),
      fullPage: true,
      animations: "disabled",
    });
  });

  test("create RFQ wizard, all four steps", async ({ makerPage }) => {
    await makerPage.goto("/dashboard");
    await makerPage.getByRole("button", { name: "Create RFQ" }).first().click();
    const dialog = makerPage.getByRole("dialog").first();
    await expect(dialog).toBeVisible();

    // Step 1 — tokens + amounts, picked from the listed catalog so the shot
    // shows recognisable symbols instead of the seeded test mints.
    await dialog.getByRole("button", { name: "Select base token" }).click();
    let selector = makerPage.getByRole("dialog").last();
    await selector.getByText("MSOL", { exact: true }).click();
    await dialog.getByRole("button", { name: "Select quote token" }).click();
    selector = makerPage.getByRole("dialog").last();
    await selector.getByText("USDC", { exact: true }).click();
    await dialog.getByLabel(/Base Amount/).fill("2500");
    await dialog.getByLabel(/Minimum Quote Amount/).fill("500000");
    await expect(dialog.getByLabel(/Base Amount/)).toHaveValue("2500");
    await makerPage.screenshot({ path: out("create-rfq-step-1-tokens"), animations: "disabled" });
    await dialog.getByRole("button", { name: "Next" }).click();

    // Step 2 — economics (defaults are fine for a screenshot).
    await expect(dialog.getByText("Set bond and fee requirements")).toBeVisible();
    await expect(dialog.getByRole("spinbutton")).toHaveCount(2);
    await makerPage.screenshot({
      path: out("create-rfq-step-2-economics"),
      animations: "disabled",
    });
    await dialog.getByRole("button", { name: "Next" }).click();

    // Step 3 — timing.
    await expect(dialog.getByText("Configure phase durations")).toBeVisible();
    await expect(dialog.getByRole("spinbutton")).toHaveCount(4);
    await makerPage.screenshot({ path: out("create-rfq-step-3-timing"), animations: "disabled" });
    await dialog.getByRole("button", { name: "Next" }).click();

    // Step 4 — review. Screenshot only; never submit (a sendTransaction would
    // miss the cassette).
    await expect(dialog.getByText("Review your RFQ before publishing")).toBeVisible();
    await makerPage.screenshot({ path: out("create-rfq-step-4-review"), animations: "disabled" });
    await makerPage.keyboard.press("Escape");
  });

  test("my activity", async ({ makerPage }) => {
    await makerPage.goto("/dashboard/my-activity");
    await expect(makerPage.getByRole("heading", { name: "My Activity" })).toBeVisible({
      timeout: 15_000,
    });
    await makerPage.screenshot({
      path: out("my-activity"),
      fullPage: true,
      animations: "disabled",
    });
  });

  test("transparency", async ({ makerPage }) => {
    await makerPage.goto("/dashboard/transparency");
    await expect(makerPage.getByRole("heading", { name: "Transparency" })).toBeVisible({
      timeout: 15_000,
    });
    await makerPage.screenshot({
      path: out("transparency"),
      fullPage: true,
      animations: "disabled",
    });
  });

  test("notification center", async ({ makerPage }) => {
    await makerPage.goto("/dashboard");
    await expect(makerPage.getByRole("button", { name: /^Open \(/ })).toBeVisible({
      timeout: 15_000,
    });
    await makerPage.getByRole("button", { name: /^Notifications/ }).click();
    // The ephemeral persona has no history, so the panel shows its empty state.
    await expect(makerPage.getByText("Nothing yet")).toBeVisible();
    await makerPage.screenshot({ path: out("notification-center"), animations: "disabled" });
  });

  test("mobile marketplace", async ({ makerPage }) => {
    await makerPage.setViewportSize({ width: 390, height: 844 });
    await makerPage.goto("/dashboard");
    await expect(makerPage.getByRole("button", { name: /^Open \(/ })).toBeVisible({
      timeout: 15_000,
    });
    await makerPage.screenshot({ path: out("marketplace-mobile"), animations: "disabled" });
  });
}
