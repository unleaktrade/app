import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  it("renders title and hint", () => {
    render(<EmptyState title="No open requests" hint="Check back soon" />);
    expect(screen.getByText("No open requests")).toBeInTheDocument();
    expect(screen.getByText("Check back soon")).toBeInTheDocument();
  });

  it("renders the optional action", () => {
    render(<EmptyState title="Nothing here" action={<button>Create one</button>} />);
    expect(screen.getByRole("button", { name: "Create one" })).toBeInTheDocument();
  });

  it("omits hint and action when not provided", () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
