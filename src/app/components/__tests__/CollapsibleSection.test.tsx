// CLAUDE.md guarantee: "Each section auto-expands when it has pending items."
// The section used to copy defaultOpen into state once, so items that arrived
// after mount (an invalidation after a reveal / settle) never opened it.

import { FileText } from "lucide-react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CollapsibleSection } from "../CollapsibleSection";

function section(defaultOpen: boolean) {
  return (
    <CollapsibleSection
      id="s"
      title="RFQs I posted"
      count={1}
      icon={FileText}
      defaultOpen={defaultOpen}
    >
      <p>body</p>
    </CollapsibleSection>
  );
}

describe("CollapsibleSection", () => {
  it("opens when defaultOpen becomes true after mount", () => {
    const { rerender } = render(section(false));
    expect(screen.queryByText("body")).not.toBeInTheDocument();

    rerender(section(true));

    expect(screen.getByText("body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /RFQs I posted/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("keeps the user's toggle over later defaultOpen changes", () => {
    const { rerender } = render(section(true));
    fireEvent.click(screen.getByRole("button", { name: /RFQs I posted/ }));
    expect(screen.getByRole("button", { name: /RFQs I posted/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    rerender(section(true));

    expect(screen.getByRole("button", { name: /RFQs I posted/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
