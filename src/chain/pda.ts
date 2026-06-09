import { PublicKey } from "@solana/web3.js";

const CONFIG_SEED = new TextEncoder().encode("config");

export function deriveConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], programId);
}
