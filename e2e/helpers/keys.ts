import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Keypair } from "@solana/web3.js";
import type { DevWalletLabel } from "./wallet";
import { devWalletKeypairDir } from "./env";

/**
 * Base58 address of a dev wallet, read from the same keypair files the dev
 * server loads (`$DEV_WALLET_KEYPAIR_DIR/<label>.json` — Solana CLI format).
 * Needed by specs that type an address into the app (e.g. the reward-recipient
 * legs), where the wallet itself never signs.
 */
export function devWalletAddress(label: DevWalletLabel): string {
  const dir = devWalletKeypairDir();
  if (!dir) {
    throw new Error(
      "DEV_WALLET_KEYPAIR_DIR must be set (env or .env.local) to run wallet-driven e2e specs",
    );
  }
  const raw = JSON.parse(readFileSync(join(dir, `${label}.json`), "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw)).publicKey.toBase58();
}
