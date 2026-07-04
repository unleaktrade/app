import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RFQStatePipeline } from "../RFQStatePipeline";
import type { RFQState } from "@/types/rfq";

const ALL_STATES: RFQState[] = [
  "Draft",
  "Open",
  "Committed",
  "Revealed",
  "Selected",
  "Settled",
  "Expired",
  "Ignored",
  "Incomplete",
];

const HAPPY: RFQState[] = ["Draft", "Open", "Committed", "Revealed", "Selected", "Settled"];
const BRANCHES: RFQState[] = ["Expired", "Ignored", "Incomplete"];

describe("RFQStatePipeline", () => {
  it.each(ALL_STATES)("renders all 9 nodes and labels the rail for %s", (state) => {
    render(<RFQStatePipeline state={state} />);
    expect(screen.getByLabelText(`Lifecycle: ${state}`)).toBeInTheDocument();
    for (const label of [...HAPPY, ...BRANCHES]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it.each([
    ["Draft", 0],
    ["Committed", 2],
    ["Settled", 5],
  ] as Array<[RFQState, number]>)(
    "%s marks the right number of happy-path nodes as done",
    (state, doneCount) => {
      const { container } = render(<RFQStatePipeline state={state} />);
      expect(container.querySelectorAll("svg.lucide-check")).toHaveLength(doneCount);
    },
  );

  it("a failure state marks progress up to its branch point as done", () => {
    // Expired branches off Committed → Draft, Open, Committed are done.
    const { container } = render(<RFQStatePipeline state="Expired" />);
    expect(container.querySelectorAll("svg.lucide-check")).toHaveLength(3);
    // The three failure branch nodes render as X marks.
    expect(container.querySelectorAll("svg.lucide-x").length).toBe(3);
  });
});
