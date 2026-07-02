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
