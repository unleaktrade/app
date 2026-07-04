import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TransparencyTable, type TransparencyRow } from "../TransparencyTable";

// Known-mint fixtures so resolveTokenMeta yields real symbols/decimals.
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const ROWS: TransparencyRow[] = [
  {
    rfq: "7Xg9uQvXhBqkc11111111111111111111111111111",
    mint: USDC,
    amount: 25_000_000n, // 25 USDC
    at: 1_750_000_000,
    treasury: "9yTr111111111111111111111111111111111111111",
  },
  {
    rfq: "8Yh0uQvXhBqkc22222222222222222222222222222",
    mint: USDC,
    amount: null, // tracker created, nothing seized yet
    at: null,
    treasury: "9yTr111111111111111111111111111111111111111",
  },
];

describe("TransparencyTable", () => {
  it("renders per-mint amounts with symbols, never USD", () => {
    const { container } = render(<TransparencyTable rows={ROWS} dateLabel="Seized" />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("25")).toBeInTheDocument();
    expect(within(table).getAllByText("USDC").length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/\$/);
  });

  it("renders null amounts as pending and null dates as —", () => {
    render(<TransparencyTable rows={ROWS} dateLabel="Seized" />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("pending")).toBeInTheDocument();
    expect(within(table).getByText("—")).toBeInTheDocument();
  });

  it("uses the provided date column label", () => {
    render(<TransparencyTable rows={ROWS} dateLabel="Paid" />);
    expect(screen.getByRole("columnheader", { name: "Paid" })).toBeInTheDocument();
  });

  it("navigates via the RFQ cell when onViewRfq is provided", () => {
    const onViewRfq = vi.fn();
    render(<TransparencyTable rows={ROWS} dateLabel="Seized" onViewRfq={onViewRfq} />);
    const table = screen.getByRole("table");
    within(table).getAllByRole("button")[0]?.click();
    expect(onViewRfq).toHaveBeenCalledWith(ROWS[0]?.rfq);
  });
});
