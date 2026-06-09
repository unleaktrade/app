import { useEffect } from "react";
import type { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

// The decoder receives whatever web3.js hands us for `info.data` — its
// `AccountInfo` type is `Buffer`, but the `buffer` package and Node's global
// `Buffer` types diverge under strict TS. We accept the structural shape and
// let the decoder cast internally if it needs to.
export type AccountDataDecoder<T> = (data: Buffer) => T;

export function useAccountSubscription<T>(
  pubkey: PublicKey | null,
  decoder: AccountDataDecoder<T>,
  queryKey: QueryKey,
): void {
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!pubkey) return;
    const id = connection.onAccountChange(
      pubkey,
      (info) => {
        try {
          const decoded = decoder(info.data);
          queryClient.setQueryData(queryKey, decoded);
        } catch {
          // swallow decode errors — account went empty or shape changed
        }
      },
      { commitment: "confirmed" },
    );
    return () => {
      void connection.removeAccountChangeListener(id);
    };
    // queryKey is stable upstream (caller uses stable array); JSON.stringify would
    // be wasteful. decoder is a pure module-level function; treat as stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, pubkey?.toBase58(), queryClient]);
}
