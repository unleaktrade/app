import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkeletonList } from "../SkeletonList";
import { ErrorRetry } from "../ErrorRetry";

describe("SkeletonList", () => {
  it("marks every variant as busy for assistive tech", () => {
    for (const variant of ["cards", "detail", "stats", "table"] as const) {
      const { container, unmount } = render(<SkeletonList variant={variant} />);
      expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
      unmount();
    }
  });

  it("renders `count` placeholders for the countable variants", () => {
    const { container } = render(<SkeletonList variant="table" count={5} />);
    expect(container.querySelectorAll(".skeleton-shimmer")).toHaveLength(5);
  });

  it("card variant defaults to 3 shimmer cards", () => {
    const { container } = render(<SkeletonList />);
    expect(container.querySelectorAll(".skeleton-shimmer")).toHaveLength(3);
  });
});

describe("ErrorRetry", () => {
  it("is announced as an alert and retries on click", () => {
    let retried = 0;
    render(<ErrorRetry message="Chain read failed." onRetry={() => (retried += 1)} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Chain read failed.");
    screen.getByRole("button", { name: /retry/i }).click();
    expect(retried).toBe(1);
  });

  it("disables the button while retrying", () => {
    render(<ErrorRetry onRetry={() => {}} retrying />);
    expect(screen.getByRole("button", { name: /retrying/i })).toBeDisabled();
  });
});
