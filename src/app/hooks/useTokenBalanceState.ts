// The sole sanctioned token-balance read (#67). Every "does this wallet hold
// enough of mint X" question goes through here — no ad-hoc
// getTokenAccountBalance calls sprinkled through components. TanStack-backed
// (15s refetch, keyed by cluster × mint × owner) so all consumers share one
// cache entry per (mint, owner) and an RPC failure surfaces as `error`, never
// as an empty balance.

import { useQuery } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import { useCluster } from "@/app/providers/ClusterProvider";
import {
  deriveTokenBalanceState,
  fetchTokenBalance,
  type TokenBalanceState,
} from "@/app/lib/token-balance-state";

export type { TokenBalanceState };

export function useTokenBalanceState(
  mint: PublicKey | null | undefined,
  required?: bigint,
): TokenBalanceState {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { cluster } = useCluster();
  const owner = publicKey ?? null;

  const query = useQuery({
    queryKey: ["token-balance", cluster, mint?.toBase58() ?? null, owner?.toBase58() ?? null],
    enabled: !!mint && !!owner,
    refetchInterval: 15_000,
    queryFn: () => fetchTokenBalance(connection, mint!, owner!),
  });

  return deriveTokenBalanceState(
    query.data,
    { hasWallet: owner !== null, isLoading: query.isLoading, isError: query.isError },
    required,
  );
}
