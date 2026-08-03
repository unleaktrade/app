// useTokenBalanceState (#67) — the sole sanctioned token-balance read. Wallet,
// cluster and the spl-token read are mocked; TanStack Query runs for real so
// the query-key / enabled behavior under wallet + cluster switches is what is
// actually under test.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Keypair, type PublicKey } from "@solana/web3.js";
import { TokenAccountNotFoundError } from "@solana/spl-token";
import type { Cluster } from "@/chain/env";
import { useTokenBalanceState } from "../useTokenBalanceState";

const mocks = vi.hoisted(() => ({
  getAccount: vi.fn(),
  walletPublicKey: null as unknown,
  cluster: "devnet" as string,
}));

vi.mock("@solana/spl-token", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/spl-token")>();
  return {
    ...actual,
    getAccount: mocks.getAccount,
    // Real PDA derivation needs web3.js's ed25519 on-curve check, which is
    // unreliable under jsdom ("Unable to find a viable program address
    // nonce"). Derivation isn't under test here — the node-project suite
    // (src/app/lib/__tests__/token-balance-state.test.ts) exercises the real
    // path; the hook only needs a stable address to hand to getAccount.
    getAssociatedTokenAddressSync: (mint: { toBase58(): string }) => mint,
  };
});

vi.mock("@solana/wallet-adapter-react", () => ({
  useConnection: () => ({ connection: {} }),
  useWallet: () => ({ publicKey: mocks.walletPublicKey }),
}));

vi.mock("@/app/providers/ClusterProvider", () => ({
  useCluster: () => ({ cluster: mocks.cluster, setCluster: () => {} }),
}));

const MINT = Keypair.generate().publicKey;
const OWNER = Keypair.generate().publicKey;

function setup(mint: PublicKey | null, required?: bigint) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const view = renderHook(() => useTokenBalanceState(mint, required), { wrapper });
  return { ...view, queryClient };
}

beforeEach(() => {
  mocks.getAccount.mockReset();
  mocks.walletPublicKey = OWNER;
  mocks.cluster = "devnet";
});

describe("useTokenBalanceState", () => {
  it("is no-wallet when no wallet is connected", () => {
    mocks.walletPublicKey = null;
    const { result } = setup(MINT);
    expect(result.current).toEqual({ status: "no-wallet" });
    expect(mocks.getAccount).not.toHaveBeenCalled();
  });

  it("is loading while the read is in flight (and with no mint yet)", () => {
    mocks.getAccount.mockReturnValue(new Promise(() => {}));
    const { result } = setup(MINT);
    expect(result.current).toEqual({ status: "loading" });
    const noMint = setup(null);
    expect(noMint.result.current).toEqual({ status: "loading" });
    expect(mocks.getAccount).toHaveBeenCalledTimes(1);
  });

  it("maps TokenAccountNotFoundError to no-ata", async () => {
    mocks.getAccount.mockRejectedValue(new TokenAccountNotFoundError());
    const { result } = setup(MINT);
    await waitFor(() => expect(result.current).toEqual({ status: "no-ata" }));
  });

  it("maps an existing empty account to zero", async () => {
    mocks.getAccount.mockResolvedValue({ amount: 0n });
    const { result } = setup(MINT);
    await waitFor(() => expect(result.current).toEqual({ status: "zero" }));
  });

  it("is insufficient below `required` and ok at/above it", async () => {
    mocks.getAccount.mockResolvedValue({ amount: 5n });
    const below = setup(MINT, 10n);
    await waitFor(() =>
      expect(below.result.current).toEqual({
        status: "insufficient",
        balance: 5n,
        required: 10n,
      }),
    );
    const exact = setup(MINT, 5n);
    await waitFor(() => expect(exact.result.current).toEqual({ status: "ok", balance: 5n }));
  });

  it("surfaces an RPC failure as error — never zero or no-ata", async () => {
    mocks.getAccount.mockRejectedValue(new Error("rpc down"));
    const { result } = setup(MINT);
    await waitFor(() => expect(result.current).toEqual({ status: "error" }));
  });

  it("keys the cache by cluster × mint × owner and re-reads on switches", async () => {
    mocks.getAccount.mockResolvedValue({ amount: 7n });
    const first = setup(MINT);
    await waitFor(() => expect(first.result.current).toEqual({ status: "ok", balance: 7n }));
    const keyOf = (client: QueryClient) =>
      client
        .getQueryCache()
        .getAll()
        .map((q) => q.queryKey);
    expect(keyOf(first.queryClient)).toEqual([
      ["token-balance", "devnet", MINT.toBase58(), OWNER.toBase58()],
    ]);

    // Cluster switch → a distinct cache entry, so stale devnet balances can
    // never bleed into another cluster's view.
    mocks.cluster = "localnet" satisfies Cluster;
    first.rerender();
    await waitFor(() =>
      expect(keyOf(first.queryClient)).toContainEqual([
        "token-balance",
        "localnet",
        MINT.toBase58(),
        OWNER.toBase58(),
      ]),
    );

    // Wallet switch → same again, keyed by the new owner.
    const otherOwner = Keypair.generate().publicKey;
    mocks.walletPublicKey = otherOwner;
    first.rerender();
    await waitFor(() =>
      expect(keyOf(first.queryClient)).toContainEqual([
        "token-balance",
        "localnet",
        MINT.toBase58(),
        otherOwner.toBase58(),
      ]),
    );
  });
});
