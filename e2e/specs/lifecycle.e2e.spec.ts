// Full RFQ round trip across all three dev wallets, including the Phase 5
// reward leg: maker creates a Draft with taker2 as reward recipient and opens
// it; taker1 commits a quote ABOVE the RFQ minimum, sets the same reward
// recipient on the quote, reveals; maker selects; taker1 settles; taker2
// claims the fee share. The settled-panel assertion doubles as a regression
// test for the old SettledPanel bug (it used to report rfq.minQuoteAmount
// instead of the winning quote's amount) — it only catches that regression
// because this test deliberately quotes ABOVE the minimum.
//
// EXPENSIVE (@tx): real devnet transactions + deadline windows across three
// wallets — several minutes. Runs only in the `tx` Playwright project, i.e.
// workflow_dispatch or a `[full-e2e]` commit (.github/workflows/e2e.yml),
// never on plain PR CI. See e2e/README.md.
import { test, expect } from "../fixtures";
import { createRfq, seededToken, waitForActionWindow } from "../helpers/rfq";
import { devWalletAddress } from "../helpers/keys";

test.describe("Full RFQ lifecycle @tx", () => {
  test("draft → open → commit → reveal → select → settle → claim", async ({
    makerPage,
    taker1Page,
    taker2Page,
  }) => {
    // Deadline windows alone are ~4 minutes; give the flow generous headroom
    // (devnet RPC and the liquidity-guard both rate-limit under load).
    test.setTimeout(900_000);

    // Distinctive fractional amounts make this run's fixture uniquely
    // identifiable in the append-only devnet history. Digits are drawn from
    // 1-9 so the amount never ends in a zero the UI's number formatting
    // would drop (10.460 renders as "10.46" and breaks the exact-text lookup).
    const t = Date.now();
    const baseAmount = `10.4${(Math.floor(t / 100) % 9) + 1}${(t % 9) + 1}`;
    const minQuoteAmount = "9.377";
    // Above the minimum — this is what makes the settled-panel assertion a
    // real regression test, not a coincidence.
    const committedAmount = "11.041";
    const facilitatorAddress = devWalletAddress("taker2");

    // --- Maker: create (reward recipient = taker2) + open -----------------
    const rfqUrl = await createRfq(makerPage, {
      // Must be tokens the wallets hold: maker escrows base at select_quote,
      // taker1's quote balance is checked by the liquidity guard and moved at
      // settlement. The dev wallets are funded with the seeded sBASE/sALT.
      baseToken: seededToken("sBASE"),
      quoteToken: seededToken("sALT"),
      baseAmount,
      minQuoteAmount,
      bondAmount: "1", // well under the dev wallets' USDC; the 5000 default would fail
      // Short enough to cross windows in-test, long enough to act within them
      // (commit gets extra headroom for liquidity-guard retries).
      ttls: ["300", "120", "300", "600"],
      facilitator: facilitatorAddress,
    });

    await makerPage.getByRole("button", { name: "Open", exact: true }).click();
    await makerPage.getByRole("dialog").getByRole("button", { name: "Open", exact: true }).click();
    await expect(makerPage.getByText("Open for quotes")).toBeVisible({ timeout: 60_000 });

    // --- Taker1: commit (quote above the minimum) --------------------------
    await taker1Page.goto(rfqUrl);
    await taker1Page.getByRole("button", { name: "Commit quote" }).click();
    const commitDialog = taker1Page.getByRole("dialog");
    await commitDialog.getByRole("textbox").fill(committedAmount);
    // The liquidity-guard's own devnet RPC reads can transiently 500 under
    // rate-limit pressure; the modal surfaces the error and stays open, so a
    // bounded re-click retries the whole check → attest → tx path.
    await expect(async () => {
      await commitDialog.getByRole("button", { name: "Commit quote" }).click();
      await expect(taker1Page.getByText("Save your reveal ticket")).toBeVisible({
        timeout: 60_000,
      });
    }).toPass({ timeout: 260_000, intervals: [8_000] });
    // Two "Close" buttons exist here: the ticket panel's explicit button and
    // the dialog's X — either works, take the first.
    await taker1Page.getByRole("button", { name: "Close" }).first().click();

    // --- Taker1: set the SAME reward recipient on the quote ----------------
    // Rewards accrue only when rfq.facilitator == quote.facilitator; the
    // commit flow always commits with none, so this is a separate action.
    await taker1Page.goto(rfqUrl);
    await taker1Page.getByRole("button", { name: "Reward recipient" }).click();
    const recipientDialog = taker1Page.getByRole("dialog");
    await recipientDialog.getByLabel("Reward recipient address").fill(facilitatorAddress);
    await recipientDialog.getByRole("button", { name: "Reward recipient" }).click();
    await expect(taker1Page.getByText("Reward recipient assigned")).toBeVisible({
      timeout: 60_000,
    });

    // --- Taker1: reveal (after the commit window closes) -------------------
    await waitForActionWindow(taker1Page, "Reveal quote");
    await taker1Page.getByRole("button", { name: "Reveal quote" }).click();
    await expect(taker1Page.getByText("Match — safe to reveal")).toBeVisible({
      timeout: 30_000,
    });
    // The cockpit page has its own submit button with the same label.
    await taker1Page.getByRole("button", { name: "Reveal quote" }).click();
    await taker1Page.waitForURL(rfqUrl, { timeout: 60_000 });

    // --- Maker: select the (only) revealed quote ---------------------------
    await makerPage.goto(rfqUrl);
    await waitForActionWindow(makerPage, /^Select$/);
    await makerPage.getByRole("button", { name: "Select", exact: true }).click();
    await expect(makerPage.getByText("Selected", { exact: true }).first()).toBeVisible({
      timeout: 60_000,
    });

    // --- Taker1: settle -----------------------------------------------------
    await taker1Page.goto(rfqUrl);
    await taker1Page.getByRole("button", { name: "Settle now" }).click();
    // Same label pattern as reveal: the action bar navigates to the settle
    // cockpit, which hosts its own "Settle now" submit.
    await taker1Page.getByRole("button", { name: "Settle now" }).click();
    // Heading-scoped: the success toast carries the same text for a moment.
    await expect(taker1Page.getByRole("heading", { name: "Settlement complete" })).toBeVisible({
      timeout: 90_000,
    });

    // --- Settled panel shows the REAL traded amount (regression) -----------
    await makerPage.goto(rfqUrl);
    await expect(makerPage.getByRole("heading", { name: "Settlement complete" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(makerPage.getByText(committedAmount, { exact: false })).toBeVisible();

    // --- Taker2 (reward recipient): claim the fee share --------------------
    await taker2Page.goto(rfqUrl);
    await taker2Page.getByRole("button", { name: "Claim reward" }).click();
    await taker2Page.getByRole("dialog").getByRole("button", { name: "Claim reward" }).click();
    await expect(taker2Page.getByText("Reward claimed to your wallet")).toBeVisible({
      timeout: 90_000,
    });

    // The claim lands in My Activity as a claimed reward. The section hangs
    // off a query waterfall (rfq list → settlements/quotes → trackers) that
    // can be slow under devnet RPC rate-limit pressure — reload-poll.
    await taker2Page.goto("/dashboard/my-activity");
    await expect(async () => {
      await taker2Page.reload();
      await expect(taker2Page.getByRole("button", { name: /^Rewards/ })).toBeVisible({
        timeout: 10_000,
      });
    }).toPass({ timeout: 120_000, intervals: [5_000] });
  });
});
