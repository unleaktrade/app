// Read-only responsive checks at a phone viewport (@mobile → the `mobile`
// Playwright project runs these under devices["iPhone 13"], 390×844). No
// transactions — safe for PR CI. Relies on the seeded devnet fixtures like
// the other read-only specs.
import { test, expect } from "../fixtures";
import { OPEN_RFQ_WITH_COMMIT_WINDOW } from "../fixtures/known-rfqs";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
}

test.describe("Mobile viewport @mobile", () => {
  test("marketplace renders without horizontal overflow, hamburger visible", async ({
    makerPage,
  }) => {
    await makerPage.goto("/dashboard");
    await expect(makerPage.getByRole("button", { name: /^Open \(/ })).toBeVisible({
      timeout: 15_000,
    });
    await expect(makerPage.getByRole("button", { name: "Toggle menu" })).toBeVisible();
    await expectNoHorizontalOverflow(makerPage);
  });

  test("RFQ detail shows the bottom action sheet, not the inline row", async ({ taker2Page }) => {
    // RFQActionSheet renders the inline row `hidden md:flex` and a fixed
    // bottom bar with an "Actions" trigger below md. taker2 (ephemeral,
    // uninvolved) can legally commit on this live-window Open RFQ, so the
    // trigger is present.
    await taker2Page.goto(`/dashboard/rfq/${OPEN_RFQ_WITH_COMMIT_WINDOW}`);
    await taker2Page.getByRole("button", { name: "Actions" }).click();
    // The vaul drawer opens with the CTAs inside.
    await expect(taker2Page.getByRole("dialog").getByText("Actions").first()).toBeVisible();
    await expect(
      taker2Page.getByRole("dialog").getByRole("button", { name: "Commit quote" }),
    ).toBeVisible();
    await taker2Page.keyboard.press("Escape");
    await expectNoHorizontalOverflow(taker2Page);
  });

  test("commit modal renders as a bottom sheet and is usable", async ({ taker2Page }) => {
    await taker2Page.goto(`/dashboard/rfq/${OPEN_RFQ_WITH_COMMIT_WINDOW}`);
    await taker2Page.getByRole("button", { name: "Actions" }).click();
    await taker2Page.getByRole("dialog").getByRole("button", { name: "Commit quote" }).click();
    const modal = taker2Page.getByRole("dialog").last();
    await expect(modal.getByText("Commit a quote")).toBeVisible({ timeout: 15_000 });
    await expect(modal.getByRole("textbox")).toBeVisible();
    await taker2Page.keyboard.press("Escape");
  });

  test("create wizard opens from the mobile menu and step 1 is interactable", async ({
    makerPage,
  }) => {
    await makerPage.goto("/dashboard");
    await makerPage.getByRole("button", { name: "Toggle menu" }).click();
    await makerPage.getByRole("button", { name: "Create RFQ" }).last().click();
    const dialog = makerPage.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Select base token" })).toBeVisible({
      timeout: 15_000,
    });
    await dialog.getByLabel(/Base Amount/).fill("1.5");
    await expect(dialog.getByLabel(/Base Amount/)).toHaveValue("1.5");
    await makerPage.keyboard.press("Escape");
  });

  test("guard status opens as a bottom sheet from the mobile menu", async ({ makerPage }) => {
    // The guard details use GlassPopover only at ≥md; below md they render in
    // the vaul bottom sheet (GlassPopover has no viewport-collision handling
    // and used to clip off the left edge inside the mobile menu). Hermetic
    // mode has no liquidity-guard, so the state is Offline — the aria-label
    // regex is state-agnostic.
    await makerPage.goto("/dashboard");
    await makerPage.getByRole("button", { name: "Toggle menu" }).click();
    await makerPage.getByRole("button", { name: /^Settlement guard:/ }).click();
    const sheet = makerPage.getByRole("dialog").filter({ hasText: "Settlement guard" });
    await expect(sheet.getByText(/attestation service signs a funds check/i)).toBeVisible();
    const box = await sheet.boundingBox();
    const viewport = makerPage.viewportSize();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
    await expectNoHorizontalOverflow(makerPage);
    await makerPage.keyboard.press("Escape");
  });

  test("My Activity renders without horizontal overflow", async ({ makerPage }) => {
    await makerPage.goto("/dashboard/my-activity");
    await expect(makerPage.getByRole("heading", { name: "My Activity" })).toBeVisible({
      timeout: 15_000,
    });
    await expectNoHorizontalOverflow(makerPage);
  });
});
