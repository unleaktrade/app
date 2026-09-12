// TokenAmountInput keeps a text buffer for what the user typed, but the
// `value` prop is the source of truth: programmatic changes (modal prefill,
// reveal-ticket import, reset) must show up in the field. It used to copy the
// prop into state once and never re-sync.

import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { TokenAmountInput } from "../TokenAmountInput";

function Harness({ initial }: { initial: bigint | null }) {
  const [value, setValue] = useState<bigint | null>(initial);
  return (
    <>
      <TokenAmountInput mint={null} value={value} onChange={setValue} fallbackDecimals={6} />
      <button type="button" onClick={() => setValue(1_500_000n)}>
        prefill
      </button>
      <button type="button" onClick={() => setValue(null)}>
        reset
      </button>
      <output data-testid="value">{value === null ? "null" : value.toString()}</output>
    </>
  );
}

describe("TokenAmountInput", () => {
  it("shows a programmatic value change in the field", () => {
    renderWithProviders(<Harness initial={null} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "prefill" }));

    expect(input.value).toBe("1.5");
  });

  it("keeps in-progress text that already parses to the new value", () => {
    renderWithProviders(<Harness initial={null} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "1." } });

    expect(screen.getByTestId("value")).toHaveTextContent("1000000");
    expect(input.value).toBe("1.");
  });

  it("clears the field when the value is reset from outside", () => {
    renderWithProviders(<Harness initial={2_000_000n} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("2");

    fireEvent.click(screen.getByRole("button", { name: "reset" }));

    expect(input.value).toBe("");
    expect(screen.getByTestId("value")).toHaveTextContent("null");
  });
});
