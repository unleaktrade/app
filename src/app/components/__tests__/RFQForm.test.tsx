// Walks the shared create/update wizard end to end in jsdom: step order, the
// per-mode copy each step renders, the validation toasts on Next, the Advanced
// Options placement (timing step in update, review step in create) and the
// submit callback. The strings asserted here are the ones the modals shipped
// before the wizard was split into rfq-form/ step files — they are the
// contract, not the implementation.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import type { Token } from "@/app/lib/tokens";
import { RFQForm, type RFQFormValues } from "../RFQForm";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const { toast } = await import("sonner");

const SOL: Token = {
  symbol: "SOL",
  name: "Solana",
  mint: "So11111111111111111111111111111111111111112",
  decimals: 9,
};
const USDC: Token = {
  symbol: "USDC",
  name: "USD Coin",
  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  decimals: 6,
};

const SEEDED: RFQFormValues = {
  baseToken: SOL,
  quoteToken: USDC,
  baseAmount: "10",
  minQuoteAmount: "1500",
  bondAmount: "5000",
  takerFeeBps: "50",
  commitTtlSecs: "3600",
  revealTtlSecs: "1800",
  selectionTtlSecs: "1800",
  fundTtlSecs: "3600",
  facilitatorAddress: "",
};

const next = () => fireEvent.click(screen.getByRole("button", { name: "Next" }));
const back = () => fireEvent.click(screen.getByRole("button", { name: "Back" }));

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
});

describe("RFQForm (create)", () => {
  it("toasts the first failing rule and stays on the step", () => {
    renderWithProviders(
      <RFQForm mode="create" submitting={false} submitLabel="Create RFQ" onSubmit={vi.fn()} />,
    );
    expect(screen.getByText("Configure your trading pair and amounts")).toBeInTheDocument();

    next();

    expect(toast.error).toHaveBeenCalledWith("Please select both tokens");
    expect(screen.getByText("Configure your trading pair and amounts")).toBeInTheDocument();
    // Create mode hides Back on the first step entirely.
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
  });

  it("walks tokens → economics → timing → review and submits the values", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <RFQForm
        mode="create"
        initialValues={SEEDED}
        submitting={false}
        submitLabel="Create RFQ"
        onSubmit={onSubmit}
      />,
    );

    // Step 1 — seeded pair renders the create-mode implied price line.
    expect(screen.getByText("Implied Minimum Price")).toBeInTheDocument();
    expect(screen.getByText("1 SOL ≥ 150.000000 USDC")).toBeInTheDocument();
    next();

    // Step 2 — create-mode economics layout.
    expect(await screen.findByText("Set bond and fee requirements")).toBeInTheDocument();
    expect(screen.getByText("How Bonds & Fees Work")).toBeInTheDocument();
    expect(screen.getByLabelText(/Bond Amount \(USDC\)/)).toHaveValue(5000);
    expect(screen.getByLabelText(/Protocol Fee \(bps\)/)).toHaveValue(50);
    fireEvent.change(screen.getByLabelText(/Protocol Fee \(bps\)/), {
      target: { value: "10001" },
    });
    next();
    expect(toast.error).toHaveBeenCalledWith("Protocol fee must be between 0 and 10000 bps");
    fireEvent.change(screen.getByLabelText(/Protocol Fee \(bps\)/), { target: { value: "50" } });
    next();

    // Step 3 — timing; Advanced Options is NOT here in create mode.
    expect(await screen.findByText("Configure phase durations (in seconds)")).toBeInTheDocument();
    expect(screen.getByText("Total Time: 3h")).toBeInTheDocument();
    expect(screen.queryByText("Advanced Options")).not.toBeInTheDocument();
    const commitInput = screen.getAllByPlaceholderText("3600")[0]!;
    fireEvent.change(commitInput, { target: { value: "0" } });
    next();
    expect(toast.error).toHaveBeenCalledWith("All TTL values must be greater than 0");
    fireEvent.click(screen.getAllByRole("button", { name: "1 hour" })[0]!);
    expect(commitInput).toHaveValue(3600);
    next();

    // Step 4 — create-mode review + Advanced Options lives here.
    expect(await screen.findByText("Review your RFQ before publishing")).toBeInTheDocument();
    expect(screen.getByText("Trading Pair")).toBeInTheDocument();
    expect(screen.getByText("Bond (Both Parties)")).toBeInTheDocument();
    expect(screen.getByText("5000 USDC")).toBeInTheDocument();
    expect(screen.getByText("50 bps (0.50%)")).toBeInTheDocument();
    expect(screen.getByText("Phase Durations")).toBeInTheDocument();
    expect(screen.getByText("Commit:")).toBeInTheDocument();
    expect(screen.getByText("Funding:")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Advanced Options/ }));
    const recipient = screen.getByLabelText("Reward Recipient (Optional)");
    fireEvent.change(recipient, { target: { value: "FacAddr111" } });

    fireEvent.click(screen.getByRole("button", { name: "Create RFQ" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ ...SEEDED, facilitatorAddress: "FacAddr111" });
  });

  it("disables submit while submitting", async () => {
    renderWithProviders(
      <RFQForm
        mode="create"
        initialValues={SEEDED}
        submitting={true}
        submitLabel="Create RFQ"
        onSubmit={vi.fn()}
      />,
    );
    next();
    await screen.findByText("Set bond and fee requirements");
    next();
    await screen.findByText("Configure phase durations (in seconds)");
    next();
    await screen.findByText("Review your RFQ before publishing");
    expect(screen.getByRole("button", { name: "Create RFQ" })).toBeDisabled();
  });
});

describe("RFQForm (update)", () => {
  const withRecipient = { ...SEEDED, facilitatorAddress: "FacAddr111" };

  it("keeps Back disabled on the first step and renders update copy", () => {
    renderWithProviders(
      <RFQForm
        mode="update"
        initialValues={withRecipient}
        submitting={false}
        submitLabel="Update RFQ"
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getByText("Implied Min. Price:")).toBeInTheDocument();
    expect(screen.getByText("150.000000 USDC/SOL")).toBeInTheDocument();
  });

  it("hosts Advanced Options on the timing step and summarises the recipient on review", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <RFQForm
        mode="update"
        initialValues={withRecipient}
        submitting={false}
        submitLabel="Update RFQ"
        onSubmit={onSubmit}
      />,
    );
    next();

    expect(await screen.findByText("Set bonds and fees for the trade")).toBeInTheDocument();
    expect(screen.getByText("Bonds Apply to Both Parties")).toBeInTheDocument();
    expect(screen.getByText("Required from both parties")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Bond Amount/), { target: { value: "" } });
    next();
    expect(toast.error).toHaveBeenCalledWith("Bond amount must be greater than 0");
    fireEvent.change(screen.getByLabelText(/Bond Amount/), { target: { value: "5000" } });
    next();

    // Advanced Options auto-opens because a recipient was seeded.
    expect(await screen.findByText("Configure phase durations (in seconds)")).toBeInTheDocument();
    expect(screen.getByText("Advanced Options")).toBeInTheDocument();
    expect(screen.getByLabelText("Reward Recipient (Optional)")).toHaveValue("FacAddr111");
    next();

    expect(await screen.findByText("Review your updates before submitting")).toBeInTheDocument();
    expect(screen.getByText("Token Pair")).toBeInTheDocument();
    expect(screen.getByText("Economics")).toBeInTheDocument();
    expect(screen.getByText("Phase Timeouts")).toBeInTheDocument();
    expect(screen.getByText("Reward recipient")).toBeInTheDocument();
    expect(screen.getByText("FacAddr111")).toBeInTheDocument();
    expect(screen.queryByText("Advanced Options")).not.toBeInTheDocument();

    // Back is a real navigation on every non-first step.
    back();
    expect(await screen.findByText("Configure phase durations (in seconds)")).toBeInTheDocument();
    next();
    await screen.findByText("Review your updates before submitting");

    fireEvent.click(screen.getByRole("button", { name: "Update RFQ" }));
    expect(onSubmit).toHaveBeenCalledWith(withRecipient);
  });

  it("honours submitDisabled on the review step", async () => {
    renderWithProviders(
      <RFQForm
        mode="update"
        initialValues={SEEDED}
        submitting={false}
        submitDisabled
        submitLabel="Update RFQ"
        onSubmit={vi.fn()}
      />,
    );
    next();
    await screen.findByText("Set bonds and fees for the trade");
    next();
    await screen.findByText("Configure phase durations (in seconds)");
    next();
    await screen.findByText("Review your updates before submitting");
    expect(screen.getByRole("button", { name: "Update RFQ" })).toBeDisabled();
  });
});
