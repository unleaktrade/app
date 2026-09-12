// clusterFromEndpoint is the inverse of endpointFor — it lets the tx helper
// build explorer links for the cluster the Connection actually points at
// instead of hard-coding devnet.

import { describe, expect, it } from "vitest";
import { clusterFromEndpoint, endpointFor, solscanTxUrl } from "../cluster";

describe("clusterFromEndpoint", () => {
  it("round-trips every configured endpoint", () => {
    for (const cluster of ["devnet", "mainnet-beta", "localnet"] as const) {
      expect(clusterFromEndpoint(endpointFor(cluster))).toBe(cluster);
    }
  });

  it("classifies keyed / custom endpoints by host hints", () => {
    expect(clusterFromEndpoint("https://devnet.helius-rpc.com/?api-key=x")).toBe("devnet");
    expect(clusterFromEndpoint("http://127.0.0.1:8899")).toBe("localnet");
    expect(clusterFromEndpoint("https://mainnet.helius-rpc.com/?api-key=x")).toBe("mainnet-beta");
  });
});

describe("solscanTxUrl", () => {
  it("adds the cluster suffix devnet / custom and none for mainnet", () => {
    expect(solscanTxUrl("sig", "devnet")).toBe("https://solscan.io/tx/sig?cluster=devnet");
    expect(solscanTxUrl("sig", "localnet")).toBe("https://solscan.io/tx/sig?cluster=custom");
    expect(solscanTxUrl("sig", "mainnet-beta")).toBe("https://solscan.io/tx/sig");
  });
});
