import { describe, expect, it } from "vitest";
import { buildCsp, type CspInputs } from "@/security/csp";

const LG_DEFAULTS: CspInputs["lgTargets"] = {
  localnet: "http://localhost:8080",
  devnet: "https://liquidity-guard-devnet-e1779e87cf84.herokuapp.com",
  mainnet: "https://liquidity-guard-mainnet-162b828790cf.herokuapp.com",
};

function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp.split(";").map((d) => {
      const [name = "", ...sources] = d.trim().split(/\s+/);
      return [name, sources];
    }),
  );
}

function connectSrc(inputs: CspInputs): string[] {
  return directives(buildCsp(inputs)).get("connect-src") ?? [];
}

describe("buildCsp", () => {
  it("keeps script execution locked to our own bundle", () => {
    const d = directives(buildCsp({ lgTargets: LG_DEFAULTS, rpcOverrides: {} }));
    expect(d.get("script-src")).toEqual(["'self'"]);
    expect(d.get("object-src")).toEqual(["'none'"]);
    expect(d.get("base-uri")).toEqual(["'self'"]);
    expect(d.has("upgrade-insecure-requests")).toBe(true);
    // Small @fontsource subsets are inlined as data: by Vite.
    expect(d.get("font-src")).toEqual(["'self'", "data:"]);
  });

  it("allows the public RPCs (https + wss), both guards and Jupiter by default", () => {
    expect(connectSrc({ lgTargets: LG_DEFAULTS, rpcOverrides: {} })).toEqual([
      "'self'",
      "https://api.devnet.solana.com",
      "wss://api.devnet.solana.com",
      "https://api.mainnet-beta.solana.com",
      "wss://api.mainnet-beta.solana.com",
      LG_DEFAULTS.devnet,
      LG_DEFAULTS.mainnet,
      "https://lite-api.jup.ag",
    ]);
  });

  it("never allows the localhost localnet defaults", () => {
    const src = connectSrc({ lgTargets: LG_DEFAULTS, rpcOverrides: {} });
    expect(src.some((s) => s.includes("localhost"))).toBe(false);
  });

  it("follows VITE_RPC_URL_* overrides, keeping only the origin of a keyed URL", () => {
    const src = connectSrc({
      lgTargets: LG_DEFAULTS,
      rpcOverrides: { devnet: "https://devnet.example-rpc.com/v1/?api-key=SECRET" },
    });
    expect(src).toContain("https://devnet.example-rpc.com");
    expect(src).toContain("wss://devnet.example-rpc.com");
    expect(src).not.toContain("https://api.devnet.solana.com");
    expect(src.join(" ")).not.toContain("SECRET");
  });

  it("derives the websocket port the way web3.js does (explicit port + 1)", () => {
    const src = connectSrc({
      lgTargets: LG_DEFAULTS,
      rpcOverrides: { localnet: "http://127.0.0.1:8899" },
    });
    expect(src).toContain("http://127.0.0.1:8899");
    expect(src).toContain("ws://127.0.0.1:8900");
  });

  it("follows VITE_LG_URL_* overrides", () => {
    const src = connectSrc({
      lgTargets: { ...LG_DEFAULTS, mainnet: "https://guard.example.com/" },
      rpcOverrides: {},
    });
    expect(src).toContain("https://guard.example.com");
    expect(src).not.toContain(LG_DEFAULTS.mainnet);
  });

  it("drops unparsable overrides instead of emitting a broken source", () => {
    const src = connectSrc({
      lgTargets: { ...LG_DEFAULTS, devnet: "not a url" },
      rpcOverrides: { mainnet: "ftp://nope" },
    });
    expect(src).not.toContain("not");
    expect(src.some((s) => s.startsWith("ftp"))).toBe(false);
  });
});
