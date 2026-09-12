// Transparency empty states. The hermetic e2e cassette now carries real
// tracker accounts (populated ledgers), so the "nothing recorded yet" branches
// are pinned here with the list hooks mocked to return no rows.

import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { Transparency } from "../Transparency";

const empty = { data: [], isLoading: false, isError: false, refetch: vi.fn(), isFetching: false };

vi.mock("@/chain/accounts/lists", () => ({
  useSlashedBondsTrackerAccounts: () => empty,
  useFeesTrackerAccounts: () => empty,
}));

describe("Transparency", () => {
  it("renders both empty ledgers when no tracker accounts exist", () => {
    renderWithProviders(<Transparency />);
    expect(screen.getByRole("heading", { name: "Transparency" })).toBeInTheDocument();
    expect(screen.getByText("No slashed bonds")).toBeInTheDocument();
    expect(screen.getByText("No fees recorded yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
