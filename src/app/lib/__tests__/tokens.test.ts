// resolveTokenMeta fallback order + the #67 drift diagnostics: seed-manifest
// membership (isKnownSeededMint) and the DEV-only one-shot unknown-mint warn.

import { afterEach, describe, expect, it, vi } from "vitest";
import seedManifest from "../seed-manifest.devnet.json";
import { isKnownSeededMint, resolveTokenMeta, seededTokenMeta } from "../tokens";

const MANIFEST_MINTS = Object.keys(seedManifest);
// Marinade staked SOL — present in the static catalog, not in the manifest.
const CATALOG_MINT = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So";
const UNKNOWN_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isKnownSeededMint", () => {
  it("accepts every mint in seed-manifest.devnet.json", () => {
    expect(MANIFEST_MINTS.length).toBeGreaterThan(0);
    for (const mint of MANIFEST_MINTS) expect(isKnownSeededMint(mint)).toBe(true);
  });

  it("rejects catalog-only and unknown mints", () => {
    expect(isKnownSeededMint(CATALOG_MINT)).toBe(false);
    expect(isKnownSeededMint(UNKNOWN_MINT)).toBe(false);
  });
});

describe("resolveTokenMeta fallback order", () => {
  it("resolves manifest mints first (seeded devnet USDC keeps its decimals)", () => {
    const [mint] = MANIFEST_MINTS;
    const meta = resolveTokenMeta(mint!);
    expect(meta).toEqual(seededTokenMeta(mint!));
  });

  it("falls back to the static catalog next", () => {
    expect(resolveTokenMeta(CATALOG_MINT)).toMatchObject({ symbol: "MSOL", decimals: 9 });
  });

  it("renders unknown mints truncated with 0 decimals (raw base units)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveTokenMeta(UNKNOWN_MINT)).toEqual({ symbol: "4zMM…ncDU", decimals: 0 });
    warn.mockRestore();
  });
});

describe("unknown-mint one-shot warn (DEV)", () => {
  // Mints reserved for this suite — the one-shot Set is module-level, so they
  // must not be resolved anywhere else in this file.
  const WARN_MINT_A = "WarnMintAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const WARN_MINT_B = "WarnMintBbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

  it("warns once per mint, mentioning the seed manifest, then stays quiet", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    resolveTokenMeta(WARN_MINT_A);
    resolveTokenMeta(WARN_MINT_A);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain(WARN_MINT_A);
    expect(warn.mock.calls[0]?.[0]).toContain("seed-manifest.devnet.json");

    // A different unknown mint gets its own single warn.
    resolveTokenMeta(WARN_MINT_B);
    expect(warn).toHaveBeenCalledTimes(2);

    // Known mints never warn.
    resolveTokenMeta(CATALOG_MINT);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
