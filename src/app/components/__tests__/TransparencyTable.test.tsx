import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
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
    const { container } = renderWithProviders(<TransparencyTable rows={ROWS} dateLabel="Seized" />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("25")).toBeInTheDocument();
    expect(within(table).getAllByText("USDC").length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/\$/);
  });

  it("renders null amounts as pending and null dates as —", () => {
    renderWithProviders(<TransparencyTable rows={ROWS} dateLabel="Seized" />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("pending")).toBeInTheDocument();
    expect(within(table).getByText("—")).toBeInTheDocument();
  });

  it("uses the provided date column label", () => {
    renderWithProviders(<TransparencyTable rows={ROWS} dateLabel="Paid" />);
    expect(screen.getByRole("columnheader", { name: "Paid" })).toBeInTheDocument();
  });

  it("links each RFQ cell to the detail route without nesting interactive elements", () => {
    const { container } = renderWithProviders(<TransparencyTable rows={ROWS} dateLabel="Seized" />);
    const table = screen.getByRole("table");
    const link = within(table).getAllByRole("link", { name: /7Xg9/ })[0];
    expect(link).toHaveAttribute("href", `/dashboard/rfq/${ROWS[0]?.rfq}`);
    // React DOM rejects <button> inside <button> (and <a> inside <a>); the
    // copy control next to the address must not be wrapped by another control.
    expect(container.querySelectorAll("button button, a a, a button, button a")).toHaveLength(0);
  });
});
