// STATUS: best-effort, not yet verified end-to-end. The read-only specs in
// this suite (action-bar-empty-state, terminal-states, quote-modals) were
// run against live devnet and pass; this one got through wallet connect,
// token selection, and amount entry, but the final Create-RFQ submit step
// needs another locator pass (see e2e/README or issue tracker before relying
// on it in CI). Safe to leave as-is: it only runs on workflow_dispatch/nightly
// (.github/workflows/e2e.yml), never blocks a PR.
//
// Full RFQ round trip across 3 dev wallets: maker creates+opens a fresh
// Draft RFQ, taker1 commits a quote ABOVE the RFQ minimum, reveals it, maker
// selects it, taker1 settles. The final assertion doubles as a regression
// test for the Settled-panel bug (AdaptiveRFQDetail.tsx's SettledPanel used
// to report rfq.minQuoteAmount instead of the winning quote's actual amount)
// — it only catches that regression because this test deliberately quotes
// ABOVE the minimum.
//
// EXPENSIVE: real devnet transactions + confirmations across 3 wallets,
// likely 1-3 minutes. Intentionally NOT run on every PR — see
// .github/workflows/e2e.yml (workflow_dispatch + nightly cron only).
import { test, expect } from "../fixtures";

test.describe("Full RFQ lifecycle", () => {
  test("draft → open → commit → reveal → select → settle", async ({ makerPage, taker1Page }) => {
    test.slow();

    // A small, distinctive pair keeps this run's fixture trivially
    // identifiable among the shared devnet history seeded by scripts/seed.ts.
    const baseAmount = "10";
    const minQuoteAmount = "9";
    // Deliberately quote above the minimum — this is what makes the final
    // Settled-panel assertion a real regression test, not a coincidence.
    const committedAmount = "11";

    // --- Maker: create + open ---------------------------------------------
    await makerPage.getByRole("button", { name: "Create RFQ" }).click();
    // TokenSelector is its own dialog (trigger button → listed-tokens list);
    // picking whichever token is first in each list is enough since the
    // component already excludes the other side's selection. Scope to the
    // Tabs' tabpanel — the dialog's own buttons include the tab triggers
    // ("Listed Tokens"/"Unlisted"), which aren't token rows.
    await makerPage.getByRole("button", { name: "Select base token" }).click();
    await makerPage.getByRole("tabpanel").locator("button").first().click();
    await makerPage.getByRole("button", { name: "Select quote token" }).click();
    await makerPage.getByRole("tabpanel").locator("button").first().click();
    await makerPage.getByLabel(/Base Amount/).fill(baseAmount);
    await makerPage.getByLabel(/Minimum Quote Amount/).fill(minQuoteAmount);
    await makerPage.getByRole("button", { name: "Create RFQ" }).last().click();
    await expect(makerPage.getByText("Draft RFQ created")).toBeVisible({ timeout: 30_000 });

    // The just-created Draft RFQ is the newest — its own pubkey is captured
    // from the detail page reached via the Draft group (append-only seed
    // data means this is the most recently created fixture across the app,
    // not just this test run, so open the first Draft and verify it's ours
    // by amount before proceeding).
    await makerPage.goto("/dashboard");
    const draftHeader = makerPage.getByRole("button", { name: /^Draft \(/ });
    await draftHeader.click();
    const viewButton = draftHeader.locator(
      "xpath=following::button[normalize-space(text())='View'][1]",
    );
    await viewButton.click();
    await expect(makerPage.getByText(baseAmount, { exact: true }).first()).toBeVisible();

    const rfqUrl = makerPage.url();

    await makerPage.getByRole("button", { name: "Open", exact: true }).click();
    await makerPage.getByRole("button", { name: "Open", exact: true }).last().click();
    await expect(makerPage.getByText("Open", { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    });

    // --- Taker1: commit -----------------------------------------------------
    await taker1Page.goto(rfqUrl);
    await taker1Page.getByRole("button", { name: "Commit quote" }).click();
    const dialog = taker1Page.getByRole("dialog");
    await dialog.getByRole("textbox").fill(committedAmount);
    await dialog.getByRole("button", { name: "Commit quote" }).click();
    await expect(taker1Page.getByText("Save your reveal ticket")).toBeVisible({
      timeout: 30_000,
    });
    await taker1Page.getByRole("button", { name: "Close" }).click();

    // --- Taker1: reveal -------------------------------------------------
    // The action bar's "Reveal quote" CTA navigates to the reveal cockpit
    // (RFQActionBar.onActionClick), which has its own "Reveal quote" submit
    // button — same label, different page, so no ambiguity within either.
    await taker1Page.goto(rfqUrl);
    await taker1Page.getByRole("button", { name: "Reveal quote" }).click();
    await expect(taker1Page.getByText("Match — safe to reveal")).toBeVisible({ timeout: 15_000 });
    await taker1Page.getByRole("button", { name: "Reveal quote" }).click();
    await expect(taker1Page).toHaveURL(rfqUrl, { timeout: 30_000 });

    // --- Maker: select the (only) revealed quote --------------------------
    await makerPage.goto(rfqUrl);
    await makerPage.getByRole("button", { name: "Select", exact: true }).click();
    await expect(makerPage.getByText("Selected", { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    });

    // --- Taker1: settle -------------------------------------------------
    // Same pattern as reveal: the action bar's "Settle now" CTA navigates to
    // the settle cockpit, which has its own "Settle now" submit button.
    await taker1Page.goto(rfqUrl);
    await taker1Page.getByRole("button", { name: "Settle now" }).click();
    await taker1Page.getByRole("button", { name: "Settle now" }).click();
    await expect(taker1Page.getByText("Settlement complete")).toBeVisible({ timeout: 30_000 });

    // --- Assertion of record: Settled panel shows the REAL traded amount --
    await makerPage.goto(rfqUrl);
    await expect(makerPage.getByText("Settlement complete")).toBeVisible({ timeout: 15_000 });
    await expect(makerPage.getByText(committedAmount, { exact: false })).toBeVisible();
  });
});
