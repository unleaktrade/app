// Pure derivation matrix + imperative fetch for the token-balance read model
// (#67). The invariant under test throughout: an RPC failure is `error`, never
// `zero`/`no-ata` — an unreadable balance must not masquerade as an empty one.

import { describe, expect, it, vi } from "vitest";
import { Keypair } from "@solana/web3.js";
import type { Connection } from "@solana/web3.js";
import { TokenAccountNotFoundError } from "@solana/spl-token";
import {
  deriveTokenBalanceState,
  fetchTokenBalance,
  type RawTokenBalance,
} from "../token-balance-state";

const { getAccountMock } = vi.hoisted(() => ({ getAccountMock: vi.fn() }));

vi.mock("@solana/spl-token", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/spl-token")>();
  return { ...actual, getAccount: getAccountMock };
});

const READY = { hasWallet: true, isLoading: false, isError: false };

describe("deriveTokenBalanceState", () => {
  it("is no-wallet without a wallet, regardless of anything else", () => {
    expect(deriveTokenBalanceState(undefined, { ...READY, hasWallet: false })).toEqual({
      status: "no-wallet",
    });
    expect(
      deriveTokenBalanceState({ exists: true, amount: 5n }, { ...READY, hasWallet: false }),
    ).toEqual({ status: "no-wallet" });
  });

  it("is loading while the query is in flight or has no data yet", () => {
    expect(deriveTokenBalanceState(undefined, { ...READY, isLoading: true })).toEqual({
      status: "loading",
    });
    expect(deriveTokenBalanceState(undefined, READY)).toEqual({ status: "loading" });
  });

  it("is error on a read failure — never conflated with an empty balance", () => {
    expect(deriveTokenBalanceState(undefined, { ...READY, isError: true })).toEqual({
      status: "error",
    });
    // Even with stale data present, an errored refetch stays an error state.
    expect(
      deriveTokenBalanceState({ exists: true, amount: 0n }, { ...READY, isError: true }),
    ).toEqual({ status: "error" });
    expect(deriveTokenBalanceState(undefined, { ...READY, isError: true }).status).not.toBe("zero");
  });

  it("distinguishes a missing ATA from a zero balance", () => {
    expect(deriveTokenBalanceState({ exists: false, amount: 0n }, READY)).toEqual({
      status: "no-ata",
    });
    expect(deriveTokenBalanceState({ exists: true, amount: 0n }, READY)).toEqual({
      status: "zero",
    });
  });

  it("is insufficient below the requirement, carrying balance + required", () => {
    expect(deriveTokenBalanceState({ exists: true, amount: 3n }, READY, 10n)).toEqual({
      status: "insufficient",
      balance: 3n,
      required: 10n,
    });
  });

  it("treats balance === required as ok, not insufficient", () => {
    expect(deriveTokenBalanceState({ exists: true, amount: 10n }, READY, 10n)).toEqual({
      status: "ok",
      balance: 10n,
    });
  });

  it("is ok above the requirement and when no requirement is given", () => {
    expect(deriveTokenBalanceState({ exists: true, amount: 11n }, READY, 10n)).toEqual({
      status: "ok",
      balance: 11n,
    });
    expect(deriveTokenBalanceState({ exists: true, amount: 1n }, READY)).toEqual({
      status: "ok",
      balance: 1n,
    });
  });
});

describe("fetchTokenBalance", () => {
  const mint = Keypair.generate().publicKey;
  const owner = Keypair.generate().publicKey;
  const connection = {} as Connection;

  it("maps an existing account to {exists: true, amount}", async () => {
    getAccountMock.mockResolvedValueOnce({ amount: 42n });
    const expected: RawTokenBalance = { exists: true, amount: 42n };
    await expect(fetchTokenBalance(connection, mint, owner)).resolves.toEqual(expected);
  });

  it("maps TokenAccountNotFoundError to {exists: false, amount: 0n}", async () => {
    getAccountMock.mockRejectedValueOnce(new TokenAccountNotFoundError());
    const expected: RawTokenBalance = { exists: false, amount: 0n };
    await expect(fetchTokenBalance(connection, mint, owner)).resolves.toEqual(expected);
  });

  it("rethrows every other failure instead of returning an empty balance", async () => {
    getAccountMock.mockRejectedValueOnce(new Error("429 Too Many Requests"));
    await expect(fetchTokenBalance(connection, mint, owner)).rejects.toThrow(
      "429 Too Many Requests",
    );
  });
});
