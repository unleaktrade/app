import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuardStatusView } from "../HealthPill";
import { setMediaQueryMatches } from "@/test/setup";
import type { HealthResponse } from "@/chain/liquidityGuard";

const HEALTH: HealthResponse = {
  status: "healthy",
  network: "Devnet",
  servicePubkey: "kzzUVbvatfRP5cFkwZVXQaEW4C85nv6KQmh1NZ7yk1y",
  timestamp: 1_750_000_000,
  skipFundChecks: false,
};

describe("GuardStatusView", () => {
  it("labels the chip per state", () => {
    const { rerender } = render(
      <GuardStatusView
        state="ok"
        health={HEALTH}
        expectedPubkey={HEALTH.servicePubkey}
        cluster="devnet"
        checkedAt={Date.now()}
      />,
    );
    expect(screen.getByRole("button", { name: "Settlement guard: Protected" })).toBeInTheDocument();

    rerender(
      <GuardStatusView
        state="down"
        health={null}
        expectedPubkey={null}
        cluster="devnet"
        checkedAt={null}
      />,
    );
    expect(screen.getByRole("button", { name: "Settlement guard: Offline" })).toBeInTheDocument();
  });

  it("opens the details popover with a verified on-chain match", async () => {
    const user = userEvent.setup();
    render(
      <GuardStatusView
        state="ok"
        health={HEALTH}
        expectedPubkey={HEALTH.servicePubkey}
        cluster="devnet"
        checkedAt={Date.now() - 8_000}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Settlement guard/ }));
    expect(screen.getByRole("dialog", { name: "Settlement guard status" })).toBeInTheDocument();
    expect(screen.getByText("matches Config.liquidity_guard")).toBeInTheDocument();
    expect(screen.getByText(/Checked .* re-checks every 15s/)).toBeInTheDocument();
  });

  it("surfaces key drift as a warning", async () => {
    const user = userEvent.setup();
    render(
      <GuardStatusView
        state="mismatch"
        health={{ ...HEALTH, servicePubkey: "DriftKey1111111111111111111111111111111111" }}
        expectedPubkey={HEALTH.servicePubkey}
        cluster="devnet"
        checkedAt={Date.now()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Settlement guard/ }));
    expect(screen.getByText("KEY DRIFT vs on-chain Config")).toBeInTheDocument();
  });

  it("renders the details as a bottom sheet below the md breakpoint", async () => {
    setMediaQueryMatches(false);
    const user = userEvent.setup();
    render(
      <GuardStatusView
        state="ok"
        health={HEALTH}
        expectedPubkey={HEALTH.servicePubkey}
        cluster="devnet"
        checkedAt={Date.now() - 8_000}
        block
      />,
    );
    await user.click(screen.getByRole("button", { name: "Settlement guard: Protected" }));
    const sheet = screen.getByRole("dialog", { name: "Settlement guard" });
    expect(sheet).toBeInTheDocument();
    expect(screen.getByText("matches Config.liquidity_guard")).toBeInTheDocument();
    expect(screen.getByText(/Checked .* re-checks every 15s/)).toBeInTheDocument();
  });

  it("prompts to connect when Config is not loaded", async () => {
    const user = userEvent.setup();
    render(
      <GuardStatusView
        state="ok"
        health={HEALTH}
        expectedPubkey={null}
        cluster="devnet"
        checkedAt={null}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Settlement guard/ }));
    expect(screen.getByText("connect a wallet to verify")).toBeInTheDocument();
  });
});
