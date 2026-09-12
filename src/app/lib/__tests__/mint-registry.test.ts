// mint-registry: framework-free external store of on-chain mint decimals,
// warmed from getMultipleAccountsInfo and read synchronously by
// resolveTokenMeta so unknown mints render scaled amounts instead of raw
// base units.

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetMintRegistryForTests,
  decodeMintDecimals,
  getMintInfo,
  getMintRegistryVersion,
  registerMintInfos,
  subscribeMintRegistry,
} from "../mint-registry";
import { resolveTokenMeta } from "../tokens";

const UNKNOWN_MINT = "HRdFWpTRcW5MWFqzbYKkYQshVFS1v62k2SvUVSkdhv48";

/** SPL Mint account layout is 82 bytes; `decimals` is the u8 at offset 44. */
function mintAccountData(decimals: number): Uint8Array {
  const data = new Uint8Array(82);
  data[44] = decimals;
  return data;
}

afterEach(() => {
  __resetMintRegistryForTests();
});

describe("decodeMintDecimals", () => {
  it("reads the decimals byte of a Mint account", () => {
    expect(decodeMintDecimals(mintAccountData(9))).toBe(9);
    expect(decodeMintDecimals(mintAccountData(6))).toBe(6);
  });

  it("rejects buffers shorter than the Mint layout", () => {
    expect(decodeMintDecimals(new Uint8Array(44))).toBeNull();
  });
});

describe("registry", () => {
  it("bumps the version and notifies subscribers once per new registration", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeMintRegistry(listener);
    const before = getMintRegistryVersion();

    registerMintInfos({ [UNKNOWN_MINT]: { decimals: 9 } });

    expect(getMintInfo(UNKNOWN_MINT)).toEqual({ decimals: 9 });
    expect(getMintRegistryVersion()).toBe(before + 1);
    expect(listener).toHaveBeenCalledTimes(1);

    // Re-registering identical data is a no-op: no version bump, no notify.
    registerMintInfos({ [UNKNOWN_MINT]: { decimals: 9 } });
    expect(getMintRegistryVersion()).toBe(before + 1);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    registerMintInfos({ [`${UNKNOWN_MINT.slice(1)}A`]: { decimals: 2 } });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("resolveTokenMeta with the registry", () => {
  it("falls back to 0 decimals before registration and to on-chain decimals after", () => {
    expect(resolveTokenMeta(UNKNOWN_MINT).decimals).toBe(0);

    registerMintInfos({ [UNKNOWN_MINT]: { decimals: 9 } });

    expect(resolveTokenMeta(UNKNOWN_MINT)).toMatchObject({ decimals: 9, symbol: "HRdF…hv48" });
  });

  it("never overrides manifest or catalog entries", () => {
    const CATALOG_MINT = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So";
    registerMintInfos({ [CATALOG_MINT]: { decimals: 0 } });
    expect(resolveTokenMeta(CATALOG_MINT)).toMatchObject({ symbol: "MSOL", decimals: 9 });
  });
});
