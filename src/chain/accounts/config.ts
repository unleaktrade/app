import { useMemo } from "react";
import type { PublicKey } from "@solana/web3.js";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { env } from "@/chain/env";
import { deriveConfigPda } from "@/chain/pda";
import { useSettlementProgram } from "@/chain/program";
import { useAccountSubscription } from "@/chain/accountSubscription";

export interface ConfigAccount {
  admin: PublicKey;
  usdcMint: PublicKey;
  treasuryWallet: PublicKey;
  liquidityGuard: PublicKey;
  facilitatorFeeBps: number;
  bump: number;
}

// Shape that Anchor's `program.account.config.fetch` returns (camelCase).
interface RawConfig {
  admin: PublicKey;
  usdcMint: PublicKey;
  treasuryWallet: PublicKey;
  liquidityGuard: PublicKey;
  facilitatorFeeBps: number;
  bump: number;
}

function normalise(raw: RawConfig): ConfigAccount {
  return {
    admin: raw.admin,
    usdcMint: raw.usdcMint,
    treasuryWallet: raw.treasuryWallet,
    liquidityGuard: raw.liquidityGuard,
    facilitatorFeeBps: raw.facilitatorFeeBps,
    bump: raw.bump,
  };
}

export function useConfigAccount(): UseQueryResult<ConfigAccount | null> {
  const program = useSettlementProgram();
  const pda = useMemo(() => deriveConfigPda(env.programId)[0], []);

  const query = useQuery<ConfigAccount | null>({
    queryKey: ["config", env.programId.toBase58(), pda.toBase58()],
    enabled: program !== null,
    queryFn: async () => {
      if (!program) return null;
      const accountsApi = program.account as unknown as {
        config: { fetchNullable(address: PublicKey): Promise<RawConfig | null> };
      };
      const raw = await accountsApi.config.fetchNullable(pda);
      return raw ? normalise(raw) : null;
    },
  });

  // Decoding path used by the websocket subscription. Anchor's BorshAccountsCoder
  // is keyed by the account *name* as declared in the IDL ("Config"), preserving
  // parity with the fetch-by-name API above.
  const decoder = useMemo(() => {
    return (data: Buffer): ConfigAccount => {
      if (!program) throw new Error("program not ready");
      const coder = program.coder as unknown as {
        accounts: { decode<T>(name: string, data: Buffer): T };
      };
      const raw = coder.accounts.decode<RawConfig>("Config", data);
      return normalise(raw);
    };
  }, [program]);

  useAccountSubscription(program ? pda : null, decoder, [
    "config",
    env.programId.toBase58(),
    pda.toBase58(),
  ]);

  return query;
}
