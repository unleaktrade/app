// Shared setup for the jsdom (component) Vitest project only — the node
// project runs pure-logic suites and never loads this file.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Globals are off (no `test.globals`), so testing-library cannot self-register
// its auto-cleanup hook; register it explicitly.
afterEach(cleanup);
