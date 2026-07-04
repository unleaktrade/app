import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeadlineRing } from "../DeadlineRing";
import { ringColor, RING_AMBER, RING_GREEN, RING_RED } from "@/app/lib/ring-color";

describe("ringColor thresholds", () => {
  it("green above one third", () => {
    expect(ringColor(1)).toBe(RING_GREEN);
    expect(ringColor(0.34)).toBe(RING_GREEN);
  });

  it("amber at or below one third", () => {
    expect(ringColor(1 / 3)).toBe(RING_AMBER);
    expect(ringColor(0.2)).toBe(RING_AMBER);
  });

  it("red at or below one tenth", () => {
    expect(ringColor(0.1)).toBe(RING_RED);
    expect(ringColor(0)).toBe(RING_RED);
  });
});

describe("DeadlineRing", () => {
  it("renders an idle ring for a null deadline", () => {
    render(<DeadlineRing deadlineSec={null} totalSec={600} />);
    expect(screen.getByRole("timer")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("announces and renders the expired state", () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    render(<DeadlineRing deadlineSec={past} totalSec={600} />);
    expect(screen.getByRole("timer")).toHaveAccessibleName("Deadline passed");
    expect(screen.getByText("Ended")).toBeInTheDocument();
  });

  it("announces remaining time for a live deadline", () => {
    const future = Math.floor(Date.now() / 1000) + 300;
    render(<DeadlineRing deadlineSec={future} totalSec={600} />);
    expect(screen.getByRole("timer").getAttribute("aria-label")).toMatch(/remaining$/);
  });
});
