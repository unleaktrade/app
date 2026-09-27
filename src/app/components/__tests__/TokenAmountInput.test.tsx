// TokenAmountInput keeps a text buffer for what the user typed, but the
// `value` prop is the source of truth: programmatic changes (modal prefill,
// reveal-ticket import, reset) must show up in the field. It used to copy the
// prop into state once and never re-sync.

import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
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

  // Token metadata resolves async, so the fallback decimals (9) are in effect
  // on the first render and the real ones (sALT: 6) arrive later. Changing
  // `fallbackDecimals` with `mint={null}` drives that same path.
  function DecimalsHarness({ initial, decimals }: { initial: bigint | null; decimals: number }) {
    const [value, setValue] = useState<bigint | null>(initial);
    return (
      <>
        <TokenAmountInput
          mint={null}
          value={value}
          onChange={setValue}
          fallbackDecimals={decimals}
        />
        <button type="button" onClick={() => setValue(11_041_000n)}>
          prefill
        </button>
        <output data-testid="value">{value === null ? "null" : value.toString()}</output>
      </>
    );
  }

  it("keeps a prefilled value when the decimals resolve (reveal-ticket regression)", () => {
    // RevealQuote mounts with the ticket's 11_041_000 base units (11.041 sALT).
    const { rerender } = renderWithProviders(
      <DecimalsHarness initial={11_041_000n} decimals={9} />,
    );
    rerender(<DecimalsHarness initial={11_041_000n} decimals={6} />);

    // The value is authoritative: re-formatted for the new scale, never re-parsed
    // (re-parsing "0.011041" at 6 decimals gave 11_041 and a commit-hash mismatch).
    expect(screen.getByTestId("value")).toHaveTextContent("11041000");
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("11.041");
  });

  it("keeps a value set by the parent after mount when the decimals resolve", () => {
    const { rerender } = renderWithProviders(<DecimalsHarness initial={null} decimals={9} />);
    fireEvent.click(screen.getByRole("button", { name: "prefill" }));
    rerender(<DecimalsHarness initial={null} decimals={6} />);

    expect(screen.getByTestId("value")).toHaveTextContent("11041000");
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("11.041");
  });

  it("re-scales text the user typed when the decimals resolve", () => {
    const { rerender } = renderWithProviders(<DecimalsHarness initial={null} decimals={9} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "1.5" } });
    expect(screen.getByTestId("value")).toHaveTextContent("1500000000");

    rerender(<DecimalsHarness initial={null} decimals={6} />);

    // What the user sees ("1.5") stays, and the emitted base units follow it.
    expect(screen.getByTestId("value")).toHaveTextContent("1500000");
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("1.5");
  });

  it("clears the field when the value is reset from outside", () => {
    renderWithProviders(<Harness initial={2_000_000n} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("2");

    fireEvent.click(screen.getByRole("button", { name: "reset" }));

    expect(input.value).toBe("");
    expect(screen.getByTestId("value")).toHaveTextContent("null");
  });

  it("is read-only until a known mint's decimals resolve, then parses at the real scale", async () => {
    // Seeded devnet sALT has 6 decimals; the fallback is 9. Typing before the
    // metadata resolved used to parse "11.041" as 11_041 sALT (e2e @tx: the
    // guard then refused a quote the wallet could not fund).
    function Modal() {
      const [value, setValue] = useState<bigint | null>(null);
      return (
        <>
          <TokenAmountInput
            mint="GNfESHwdaSQ9pZ3wScMSWgA5spEcik36mRoc3YQYxiqt"
            value={value}
            onChange={setValue}
          />
          <output data-testid="value">{value === null ? "null" : value.toString()}</output>
        </>
      );
    }
    renderWithProviders(<Modal />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("aria-busy", "true");

    await waitFor(() => expect(input).toBeEnabled());
    expect(screen.getByText("6 decimals")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "11.041" } });
    expect(screen.getByTestId("value")).toHaveTextContent("11041000");
  });
});
