import { afterEach, describe, expect, it, vi } from "vitest";
import idlJson from "@/chain/idl/settlement_engine.json";

const IDL_ADDRESS = (idlJson as { address: string }).address;
// Any valid base58 pubkey ≠ the defaults.
const OVERRIDE = "11111111111111111111111111111112";

async function loadEnv() {
  vi.resetModules();
  const mod = await import("@/chain/env");
  return mod.env;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("env defaults", () => {
  it("falls back to the committed IDL address when the var is absent", async () => {
    vi.stubEnv("VITE_SETTLEMENT_PROGRAM_ID", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const env = await loadEnv();
    expect(env.programId.toBase58()).toBe(IDL_ADDRESS);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("an explicit valid value overrides the default", async () => {
    vi.stubEnv("VITE_SETTLEMENT_PROGRAM_ID", OVERRIDE);
    const env = await loadEnv();
    expect(env.programId.toBase58()).toBe(OVERRIDE);
  });

  it("an explicitly-set invalid value still fails loudly", async () => {
    vi.stubEnv("VITE_SETTLEMENT_PROGRAM_ID", "not-a-pubkey");
    await expect(loadEnv()).rejects.toThrow(/not a valid base58/);
  });
});
