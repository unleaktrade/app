// Automated accessibility gate (issue #16 / #17): axe-core over every screen,
// fully hermetic (replay cassette + ephemeral wallets — runs on every PR,
// zero secrets). Gate = ZERO critical violations; serious/moderate findings
// are attached to the report for visibility without failing the build.
// One route per test on purpose: each gets a fresh page/context, matching the
// suite's single-navigation pattern under the pinned replay clock.
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";
import { installRpcReplay } from "../helpers/rpc-replay";
import { OPEN_RFQ_WITH_COMMIT_WINDOW } from "../fixtures/known-rfqs";

async function auditCritical(page: Page, testInfo: import("@playwright/test").TestInfo) {
  const results = await new AxeBuilder({ page })
    // Third-party wallet-adapter modal markup is not ours to fix.
    .exclude(".wallet-adapter-modal")
    .analyze();
  await testInfo.attach("axe-violations", {
    body: JSON.stringify(
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
      })),
      null,
      2,
    ),
    contentType: "application/json",
  });
  const critical = results.violations.filter((v) => v.impact === "critical");
  expect(
    critical.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`),
    "critical axe violations",
  ).toEqual([]);
}

test.describe("axe-core accessibility audit", () => {
  test("connect screen (pre-auth)", async ({ page }, testInfo) => {
    await installRpcReplay(page);
    await page.goto("/");
    await expect(page.getByText(/UnleakTrade/i).first()).toBeVisible();
    await auditCritical(page, testInfo);
  });

  test("marketplace", async ({ makerPage }, testInfo) => {
    await makerPage.goto("/dashboard");
    await expect(makerPage.getByRole("button", { name: /^Open \(/ })).toBeVisible({
      timeout: 15_000,
    });
    await auditCritical(makerPage, testInfo);
  });

  test("RFQ detail", async ({ makerPage }, testInfo) => {
    await makerPage.goto(`/dashboard/rfq/${OPEN_RFQ_WITH_COMMIT_WINDOW}`);
    await expect(makerPage.getByText("Open for quotes")).toBeVisible({ timeout: 15_000 });
    await auditCritical(makerPage, testInfo);
  });

  test("my activity", async ({ makerPage }, testInfo) => {
    // The hermetic persona is an ephemeral wallet with no history, so the
    // screen renders its illustrated empty state — audit that rendering.
    await makerPage.goto("/dashboard/my-activity");
    await expect(makerPage.getByRole("heading", { name: "My Activity" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(makerPage.getByText("Nothing here yet")).toBeVisible();
    await auditCritical(makerPage, testInfo);
  });

  test("transparency ledger", async ({ makerPage }, testInfo) => {
    // Hermetic replay serves no tracker accounts — the page must render its
    // empty states gracefully (that IS the assertion; populated rows are
    // covered by the RTL fixture tests).
    await makerPage.goto("/dashboard/transparency");
    await expect(makerPage.getByText("No slashed bonds")).toBeVisible({ timeout: 15_000 });
    await auditCritical(makerPage, testInfo);
  });

  test("component gallery", async ({ page }, testInfo) => {
    await installRpcReplay(page);
    await page.goto("/dev/stories");
    await expect(page.getByText("Component gallery")).toBeVisible({ timeout: 15_000 });
    await auditCritical(page, testInfo);
  });
});

// Phone-viewport re-audit of the highest-traffic screens (the `mobile`
// Playwright project picks these up via the @mobile tag).
test.describe("axe-core accessibility audit @mobile", () => {
  test("marketplace on a phone", async ({ makerPage }, testInfo) => {
    await makerPage.goto("/dashboard");
    await expect(makerPage.getByRole("button", { name: /^Open \(/ })).toBeVisible({
      timeout: 15_000,
    });
    await auditCritical(makerPage, testInfo);
  });

  test("RFQ detail on a phone", async ({ makerPage }, testInfo) => {
    await makerPage.goto(`/dashboard/rfq/${OPEN_RFQ_WITH_COMMIT_WINDOW}`);
    await expect(makerPage.getByText("Open for quotes")).toBeVisible({ timeout: 15_000 });
    await auditCritical(makerPage, testInfo);
  });
});
