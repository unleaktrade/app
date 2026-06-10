import { afterEach, describe, expect, it, vi } from "vitest";
import idlJson from "@/chain/idl/settlement_engine.json";

const IDL_ADDRESS = (idlJson as { address: string }).address;
const DEVNET_USDC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
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
  it("falls back to the committed IDL address + devnet USDC when vars are absent", async () => {
    vi.stubEnv("VITE_SETTLEMENT_PROGRAM_ID", "");
    vi.stubEnv("VITE_USDC_MINT", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const env = await loadEnv();
    expect(env.programId.toBase58()).toBe(IDL_ADDRESS);
    expect(env.usdcMint.toBase58()).toBe(DEVNET_USDC);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("explicit valid values override the defaults", async () => {
    vi.stubEnv("VITE_SETTLEMENT_PROGRAM_ID", OVERRIDE);
    vi.stubEnv("VITE_USDC_MINT", OVERRIDE);
    const env = await loadEnv();
    expect(env.programId.toBase58()).toBe(OVERRIDE);
    expect(env.usdcMint.toBase58()).toBe(OVERRIDE);
  });

  it("an explicitly-set invalid value still fails loudly", async () => {
    vi.stubEnv("VITE_SETTLEMENT_PROGRAM_ID", "not-a-pubkey");
    await expect(loadEnv()).rejects.toThrow(/not a valid base58/);
  });
});
