// Shared setup for the jsdom (component) Vitest project only — the node
// project runs pure-logic suites and never loads this file.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Globals are off (no `test.globals`), so testing-library cannot self-register
// its auto-cleanup hook; register it explicitly.
afterEach(cleanup);

// jsdom has no matchMedia; components using useMediaQuery need this stub.
// Queries default to matching (= desktop layout at the 768px breakpoint);
// call setMediaQueryMatches(false) inside a test to render the mobile branch.
let mediaQueryMatches = true;

export function setMediaQueryMatches(matches: boolean): void {
  mediaQueryMatches = matches;
}

window.matchMedia = (query: string): MediaQueryList =>
  ({
    matches: mediaQueryMatches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

afterEach(() => {
  mediaQueryMatches = true;
});
