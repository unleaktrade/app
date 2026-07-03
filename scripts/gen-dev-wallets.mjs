// Generate throwaway, UNFUNDED dev-wallet keypairs for the hermetic read-only
// E2E suite. These sign the signMessage auth gate locally (no chain contact),
// and being brand-new they are guaranteed uninvolved in any RFQ — exactly what
// the "connected but uninvolved wallet" assertions need. No funds, no secrets,
// nothing to leak. CI regenerates them fresh each run.
//
// Usage: node scripts/gen-dev-wallets.mjs <dir>
//        (falls back to $DEV_WALLET_KEYPAIR_DIR)
import { Keypair } from "@solana/web3.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? process.env.DEV_WALLET_KEYPAIR_DIR;
if (!dir) {
  console.error("usage: node scripts/gen-dev-wallets.mjs <dir>");
  process.exit(1);
}

mkdirSync(dir, { recursive: true });
for (const label of ["maker", "taker1", "taker2"]) {
  const kp = Keypair.generate();
  writeFileSync(join(dir, `${label}.json`), JSON.stringify(Array.from(kp.secretKey)));
}
console.log(`Wrote 3 ephemeral (unfunded) dev wallets to ${dir}`);
