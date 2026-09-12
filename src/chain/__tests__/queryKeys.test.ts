// On-chain query keys must include the RPC endpoint: the program id is the
// same on devnet and localnet, so keying on it alone let a cluster switch
// serve the previous cluster's accounts from cache.

import { describe, expect, it } from "vitest";
import { accountKey, byKeysKey, listKey } from "../accounts/queryKeys";

const PROGRAM = "7wrjbU1NbVtUCUGP1obi3aiT6QrjXZnH5XJDXMsKtkPG";
const DEVNET = "https://api.devnet.solana.com";
const LOCAL = "http://localhost:8899";

describe("query keys", () => {
  it("differ per endpoint for the same account and address", () => {
    expect(accountKey("rfq", PROGRAM, DEVNET, "abc")).not.toEqual(
      accountKey("rfq", PROGRAM, LOCAL, "abc"),
    );
    expect(listKey("rfq", PROGRAM, DEVNET, null)).not.toEqual(listKey("rfq", PROGRAM, LOCAL, null));
    expect(byKeysKey("settlement", PROGRAM, DEVNET, ["a"])).not.toEqual(
      byKeysKey("settlement", PROGRAM, LOCAL, ["a"]),
    );
  });

  it("keep the [account, programId] prefix that write-path invalidation matches on", () => {
    for (const key of [
      accountKey("rfq", PROGRAM, DEVNET, "abc"),
      listKey("quote", PROGRAM, DEVNET, "rfq", "abc"),
      byKeysKey("settlement", PROGRAM, DEVNET, ["b", "a"]),
    ]) {
      expect(key.slice(0, 2)).toEqual([expect.any(String), PROGRAM]);
    }
  });

  it("byKeysKey is order-insensitive", () => {
    expect(byKeysKey("quote", PROGRAM, DEVNET, ["b", "a", "c"])).toEqual(
      byKeysKey("quote", PROGRAM, DEVNET, ["c", "b", "a"]),
    );
  });

  it('listKey carries the facets after the "all" marker', () => {
    expect(listKey("quote", PROGRAM, DEVNET, "taker", "xyz")).toEqual([
      "quote",
      PROGRAM,
      DEVNET,
      "all",
      "taker",
      "xyz",
    ]);
  });
});
