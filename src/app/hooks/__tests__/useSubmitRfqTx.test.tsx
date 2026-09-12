// useSubmitRfqTx replaces seven hand-rolled busy flags: it must expose the
// in-flight state, invalidate the on-chain queries after a confirmed write,
// and rethrow so callers can stop their flow on failure.

import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Transaction } from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSubmitRfqTx } from "../useSubmitRfqTx";

const mocks = vi.hoisted(() => ({
  sendAndConfirmWithToast: vi.fn(),
}));

vi.mock("@solana/wallet-adapter-react", () => ({
  useConnection: () => ({ connection: {} }),
  useWallet: () => ({ publicKey: null, sendTransaction: vi.fn() }),
}));

vi.mock("@/chain/tx", () => ({
  sendAndConfirmWithToast: mocks.sendAndConfirmWithToast,
}));

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { Wrapper, invalidate };
}

beforeEach(() => {
  mocks.sendAndConfirmWithToast.mockReset();
});

describe("useSubmitRfqTx", () => {
  it("exposes isPending while the write runs and invalidates the rfq queries after", async () => {
    let resolveSend: (sig: string) => void = () => {};
    mocks.sendAndConfirmWithToast.mockImplementation(
      () => new Promise<string>((res) => (resolveSend = res)),
    );
    const { Wrapper, invalidate } = makeWrapper();
    const { result } = renderHook(() => useSubmitRfqTx(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        build: async () => new Transaction(),
        pendingMessage: "Sending…",
        successMessage: "Done",
        tag: "row-1",
      });
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.variables?.tag).toBe("row-1");

    act(() => resolveSend("sig"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe("sig");
    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["rfq", expect.any(String)] }),
    );
  });

  it("rethrows a failed build so the caller can stop its flow", async () => {
    const { Wrapper, invalidate } = makeWrapper();
    const { result } = renderHook(() => useSubmitRfqTx(), { wrapper: Wrapper });

    await expect(
      act(() =>
        result.current.mutateAsync({
          build: async () => {
            throw new Error("boom");
          },
          pendingMessage: "x",
          successMessage: "y",
        }),
      ),
    ).rejects.toThrow("boom");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
  });
});
