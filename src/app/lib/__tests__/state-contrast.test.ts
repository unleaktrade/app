import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// WCAG AA guard for the state palette (issue #16 a11y pass). Parses the CSS
// custom properties straight out of theme.css so the test can never drift
// from the shipped values. Base tokens are used as text colors on the page
// surface; -deep tokens are gradient/background depth only and are exempt.

const css = readFileSync(join(process.cwd(), "src/styles/theme.css"), "utf8");

function cssVar(name: string): string {
  const m = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!m?.[1]) throw new Error(`missing or non-hex CSS var ${name}`);
  return m[1];
}

function channel(hexPair: string): number {
  const v = parseInt(hexPair, 16) / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  return (
    0.2126 * channel(h.slice(0, 2)) +
    0.7152 * channel(h.slice(2, 4)) +
    0.0722 * channel(h.slice(4, 6))
  );
}

function contrast(fg: string, bg: string): number {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

const STATES = [
  "draft",
  "open",
  "committed",
  "revealed",
  "selected",
  "settled",
  "ignored",
  "expired",
  "incomplete",
] as const;

describe("state palette contrast (WCAG AA)", () => {
  const page = cssVar("--surface-page");
  const raised = cssVar("--surface-raised");

  it.each(STATES)("--state-%s reads at ≥ 4.5:1 on both app surfaces", (state) => {
    const tone = cssVar(`--state-${state}`);
    expect(contrast(tone, page)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tone, raised)).toBeGreaterThanOrEqual(4.5);
  });

  it("every state defines a -deep companion", () => {
    for (const state of STATES) {
      expect(cssVar(`--state-${state}-deep`)).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("the sanity check itself is calibrated (white on black = 21)", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 0);
  });
});
