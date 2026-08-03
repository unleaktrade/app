// BetaTokenNotice (#67) — per-state copy, the hard copy rules ("no real-world
// monetary value" always present, the string "failed" NEVER rendered), FAQ
// deep links from links.ts, and wrong-cluster precedence over balance claims.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BetaTokenNotice } from "../BetaTokenNotice";
import { FAQ_DEVNET_USDC } from "@/app/lib/links";
import type { TokenBalanceState } from "@/app/lib/token-balance-state";

const BASE = {
  cluster: "devnet" as const,
  symbol: "USDC",
  decimals: 6,
};

const ALL_STATES: TokenBalanceState[] = [
  { status: "no-wallet" },
  { status: "loading" },
  { status: "error" },
  { status: "no-ata" },
  { status: "zero" },
  { status: "insufficient", balance: 250_000n, required: 1_000_000n },
  { status: "ok", balance: 1_000_000n },
];

describe("BetaTokenNotice", () => {
  it("always carries the base beta copy, incl. 'no real-world monetary value'", () => {
    for (const variant of ["inline", "empty-state"] as const) {
      const { container, unmount } = render(
        <BetaTokenNotice state={{ status: "zero" }} variant={variant} {...BASE} />,
      );
      expect(container.textContent).toContain("custom USDC on Solana devnet");
      expect(container.textContent).toContain("1000 test tokens");
      expect(container.textContent).toContain("no real-world monetary value");
      unmount();
    }
  });

  it("never renders the string 'failed' in any state or variant", () => {
    for (const state of ALL_STATES) {
      for (const cluster of ["devnet", "mainnet-beta", "localnet"] as const) {
        for (const variant of ["inline", "empty-state"] as const) {
          const { container, unmount } = render(
            <BetaTokenNotice {...BASE} state={state} cluster={cluster} variant={variant} />,
          );
          expect(container.textContent).not.toMatch(/failed/i);
          unmount();
        }
      }
    }
  });

  it("no-ata: points at the registered-wallet mismatch and pending distribution", () => {
    const { container } = render(
      <BetaTokenNotice state={{ status: "no-ata" }} variant="inline" {...BASE} />,
    );
    expect(container.textContent).toContain("no account for the beta token yet");
    expect(container.textContent).toContain("registered a different wallet");
    expect(container.textContent).toContain("may still be on its way");
  });

  it("zero: pending distribution wording, no blame", () => {
    const { container } = render(
      <BetaTokenNotice state={{ status: "zero" }} variant="inline" {...BASE} />,
    );
    expect(container.textContent).toContain("beta token balance is empty");
    expect(container.textContent).toContain("Distribution may still be pending");
  });

  it("insufficient: required vs current in display units + no-faucet support line", () => {
    const { container } = render(
      <BetaTokenNotice
        state={{ status: "insufficient", balance: 250_000n, required: 1_000_000n }}
        variant="inline"
        {...BASE}
      />,
    );
    expect(container.textContent).toContain("You need 1 USDC for this action — you have 0.25");
    expect(container.textContent).toContain("no faucet for this mint");
    expect(container.textContent).toContain("contact support");
  });

  it("links 'Check distribution status' to the FAQ anchor in both variants", () => {
    expect(FAQ_DEVNET_USDC).toBe("https://unleak.trade/faq#devnet-usdc");
    for (const variant of ["inline", "empty-state"] as const) {
      const { unmount } = render(
        <BetaTokenNotice state={{ status: "zero" }} variant={variant} {...BASE} />,
      );
      const link = screen.getByRole("link", { name: /Check distribution status/ });
      expect(link).toHaveAttribute("href", FAQ_DEVNET_USDC);
      unmount();
    }
  });

  it("wrong cluster takes precedence and suppresses all balance claims", () => {
    const { container } = render(
      <BetaTokenNotice
        state={{ status: "insufficient", balance: 250_000n, required: 1_000_000n }}
        variant="inline"
        {...BASE}
        cluster="mainnet-beta"
      />,
    );
    expect(container.textContent).toContain(
      "Beta tokens live on Solana devnet — you're connected to Mainnet Beta.",
    );
    expect(container.textContent).toContain("Switch clusters");
    // No balance claims off-devnet.
    expect(container.textContent).not.toContain("You need");
    expect(container.textContent).not.toContain("empty");
    expect(container.textContent).not.toContain("no account for the beta token");
  });

  it("empty-state variant composes EmptyState with the gift illustration", () => {
    const { container } = render(
      <BetaTokenNotice state={{ status: "no-ata" }} variant="empty-state" {...BASE} />,
    );
    expect(container.textContent).toContain("Beta tokens come from the waitlist");
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
