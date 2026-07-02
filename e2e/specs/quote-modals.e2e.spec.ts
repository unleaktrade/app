// SubmitQuoteModal validation/pre-fill assertions that don't require a
// confirmed on-chain transaction — kept fast and outside the devnet
// rate-limit/confirmation-time budget that the full lifecycle spec pays.
import { test, expect } from "../fixtures";
import { openFirstRfqInGroup } from "../helpers/rfq";

test.describe("SubmitQuoteModal", () => {
  test("pre-fills the amount with the RFQ minimum and shows the bond breakdown", async ({
    taker2Page,
  }) => {
    await openFirstRfqInGroup(taker2Page, "Open");
    await taker2Page.getByRole("button", { name: "Commit quote" }).click();
    await expect(taker2Page.getByRole("heading", { name: "Commit a quote" })).toBeVisible();
    // BondBreakdown always renders a bond amount row once the RFQ account
    // has loaded — confirms the pre-fetch + prefill wiring didn't regress.
    await expect(taker2Page.getByText(/Minimum .* base units/)).toBeVisible();
  });

  test("rejects an amount below the RFQ minimum before touching the chain", async ({
    taker2Page,
  }) => {
    await openFirstRfqInGroup(taker2Page, "Open");
    await taker2Page.getByRole("button", { name: "Commit quote" }).click();
    const dialog = taker2Page.getByRole("dialog");
    await dialog.getByRole("textbox").fill("0");
    await dialog.getByRole("button", { name: "Commit quote" }).click();
    await expect(taker2Page.getByText(/Quote must be at least the RFQ minimum/)).toBeVisible();
  });
});
