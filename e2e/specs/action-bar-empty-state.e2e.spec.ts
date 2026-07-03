// Regression coverage for RFQActionBar.tsx: the action bar used to render
// nothing (`return null`) whenever the connected wallet had no legal action,
// giving no indication of why. It now renders an explanatory message instead.
// Read-only — no on-chain transactions, safe to run frequently.
import { test, expect } from "../fixtures";
import { openFirstRfqInGroup } from "../helpers/rfq";

test.describe("RFQActionBar empty state", () => {
  test("a disconnected visitor never reaches the action bar at all", async ({ page }) => {
    // RFQActionBar's own "Connect a wallet…" branch (connected === null) is
    // only reachable in the live app during a rare mid-session disconnect —
    // DashboardLayout's auth gate blocks a disconnected visitor from ever
    // mounting the RFQ detail page in the first place. Assert that outer
    // gate, since it's what a fresh disconnected visitor actually sees.
    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: "Select Wallet" })).toBeVisible();
  });

  test("connected but uninvolved wallet sees 'no pending action', not nothing", async ({
    taker2Page,
  }) => {
    // taker2 has no relation to most seeded fixtures — an Open RFQ it hasn't
    // quoted on is exactly the "connected, uninvolved" case (it may still
    // legally see "Commit quote" if it can bid, so pick a state where nobody
    // can act any more: a Settled RFQ has zero legal actions for anyone).
    await openFirstRfqInGroup(taker2Page, "Settled");
    await expect(
      taker2Page.getByText("No pending action for your wallet on this RFQ."),
    ).toBeVisible();
  });
});
