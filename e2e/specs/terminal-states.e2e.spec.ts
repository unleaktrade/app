// Assert the terminal-state RFQ detail panels render plausible, non-crashing
// info against whichever pre-seeded devnet fixtures exist (scripts/seed.ts
// seeded all 9 lifecycle states — Phase 2b — but is append-only and not
// resettable, so these tests search for "at least one fixture" rather than a
// specific pubkey). Read-only — no on-chain transactions.
import { test, expect } from "../fixtures";
import { openFirstRfqInGroup } from "../helpers/rfq";

test.describe("Terminal RFQ states", () => {
  test("Expired panel explains why, with commit/reveal counts", async ({ makerPage }) => {
    await openFirstRfqInGroup(makerPage, "Expired");
    // getByText("Expired") is ambiguous — it also matches the (invisible but
    // DOM-present) <option> in the marketplace's state-filter <select>. The
    // Panel's own title is a real heading, so target that instead.
    await expect(makerPage.getByRole("heading", { name: "Expired" })).toBeVisible();
    await expect(makerPage.getByText(/committed quotes revealed/)).toBeVisible();
  });

  test("Ignored panel explains why, with revealed-quote count", async ({ makerPage }) => {
    await openFirstRfqInGroup(makerPage, "Ignored");
    await expect(makerPage.getByRole("heading", { name: "Ignored" })).toBeVisible();
    await expect(makerPage.getByText(/none selected/)).toBeVisible();
  });

  test("Incomplete panel shows the counterparty that never funded", async ({ makerPage }) => {
    await openFirstRfqInGroup(makerPage, "Incomplete");
    await expect(makerPage.getByRole("heading", { name: "Incomplete" })).toBeVisible();
    // WinnerSummary only renders when a selectedQuote joins successfully —
    // its absence would silently hide the regression, so assert on it.
    await expect(makerPage.getByText("Winning quote")).toBeVisible();
  });

  test("Settled panel shows the real traded volume, not the RFQ minimum", async ({ makerPage }) => {
    await openFirstRfqInGroup(makerPage, "Settled");
    await expect(makerPage.getByText("Settlement complete")).toBeVisible();
    await expect(makerPage.getByText("Quote volume")).toBeVisible();
    await expect(makerPage.getByText("Settled with")).toBeVisible();
  });
});
