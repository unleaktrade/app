import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BondBreakdown } from "../BondBreakdown";

describe("BondBreakdown", () => {
  // 1 000 USDC quote at 100 bps → 10 USDC fee, 50% facilitation split,
  // 1 010 USDC total to fund. Mirrors src/chain/math.ts (floor, min-1).
  const fixture = {
    bondAmount: 50_000_000n, // 50 USDC
    quoteAmount: 1_000_000_000n, // 1 000 (6 decimals)
    quoteSymbol: "USDC",
    quoteDecimals: 6,
    takerFeeBps: 100,
    facilitatorFeeBps: 5_000,
  };

  it("renders on-chain-parity fee math per row", () => {
    render(<BondBreakdown {...fixture} />);
    expect(screen.getAllByText("50 USDC")).toHaveLength(2); // both bond sides
    expect(screen.getByText("1,000 USDC")).toBeInTheDocument(); // quote amount
    expect(screen.getByText("10 USDC")).toBeInTheDocument(); // total fee
    expect(screen.getAllByText("5 USDC")).toHaveLength(2); // facilitation + treasury shares
    expect(screen.getByText("1,010 USDC")).toBeInTheDocument(); // total to fund
  });

  it("applies the min-1 fee when bps > 0 rounds to zero", () => {
    render(
      <BondBreakdown
        {...fixture}
        quoteAmount={5n} // 5 base units × 1 bp → floor 0 → bumped to 1
        takerFeeBps={1}
      />,
    );
    expect(screen.getByText(/Protocol fee \(1 bps/)).toBeInTheDocument();
    // The bumped 1-base-unit fee shows on the fee row (and flows into a share row).
    expect(screen.getAllByText("0.000001 USDC").length).toBeGreaterThanOrEqual(1);
  });

  it("never shows a USD aggregate", () => {
    const { container } = render(<BondBreakdown {...fixture} />);
    expect(container.textContent).not.toMatch(/\$/);
  });
});
