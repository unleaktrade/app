import { useMemo } from "react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import idlJson from "@/chain/idl/settlement_engine.json";
import type { SettlementEngine } from "@/chain/idl/settlement_engine";

const IDL = idlJson as unknown as SettlementEngine;

export function useSettlementProgram(): Program<SettlementEngine> | null {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    // AnchorProvider requires a wallet. For unauthenticated reads we'd
    // construct a read-only provider, but Phase 1 only reads Config *after*
    // auth so we can keep this simple.
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    return new Program<SettlementEngine>(IDL, provider);
  }, [connection, wallet]);
}
