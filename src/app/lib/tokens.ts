// Static SPL token catalog (Pyth-listed) + metadata types — extracted from
// TokenSelector so non-selector components (TokenAmountInput, BondBreakdown)
// can resolve symbols/decimals without importing the picker UI.

import seedManifestDevnet from "./seed-manifest.devnet.json";

export interface Token {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logoURI?: string;
  isCustom?: boolean;
}

// SPL Tokens listed on Pyth Network (excluding native SOL)
export const LISTED_SPL_TOKENS: Token[] = [
  // Liquid Staking Tokens
  {
    symbol: "MSOL",
    name: "Marinade Staked SOL",
    mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    decimals: 9,
  },
  {
    symbol: "BSOL",
    name: "BlazeStake SOL",
    mint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
    decimals: 9,
  },
  {
    symbol: "SSOL",
    name: "Sanctum SOL",
    mint: "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm",
    decimals: 9,
  },
  {
    symbol: "JUPSOL",
    name: "Jupiter Staked SOL",
    mint: "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v",
    decimals: 9,
  },
  // DeFi Tokens
  {
    symbol: "INF",
    name: "Infinity",
    mint: "5Z66YYYaTmmx1R4mATAGLSc8aV4Vfy5tNdJQzk1GP9RF",
    decimals: 9,
  },
  {
    symbol: "BONK",
    name: "Bonk",
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    decimals: 5,
  },
  {
    symbol: "WIF",
    name: "dogwifhat",
    mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    decimals: 6,
  },
  {
    symbol: "MEW",
    name: "Cat in a Dogs World",
    mint: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5",
    decimals: 5,
  },
  {
    symbol: "JUP",
    name: "Jupiter",
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    decimals: 6,
  },
  {
    symbol: "PYTH",
    name: "Pyth Network",
    mint: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    decimals: 6,
  },
  {
    symbol: "HNT",
    name: "Helium",
    mint: "hntyVP6YFm1Hg25TN9WGLqM12b1TRezrhCEBsX82Ux6",
    decimals: 8,
  },
  {
    symbol: "ORCA",
    name: "Orca",
    mint: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
    decimals: 6,
  },
  {
    symbol: "SAMO",
    name: "Samoyedcoin",
    mint: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    decimals: 9,
  },
  {
    symbol: "MNDE",
    name: "Marinade",
    mint: "MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey",
    decimals: 9,
  },
  {
    symbol: "NEON",
    name: "Neon",
    mint: "NeonTjSjsuo3rexg9o6vHuMXw62f9V7zvmu8M8Zut44",
    decimals: 9,
  },
  {
    symbol: "JLP",
    name: "Jupiter Perps LP",
    mint: "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4",
    decimals: 6,
  },
  {
    symbol: "PENGU",
    name: "Pudgy Penguins",
    mint: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv",
    decimals: 6,
  },
  {
    symbol: "TRUMP",
    name: "MAGA",
    mint: "HaP8r3ksG76PhQLTqR8FYBeNiQpejcFbQmiHbg787Ut1",
    decimals: 9,
  },
  {
    symbol: "FARTCOIN",
    name: "Fartcoin",
    mint: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",
    decimals: 6,
  },
  {
    symbol: "PUMP",
    name: "Pump",
    mint: "6PLkTN5f3xdAKzDKbV9YKSvMjPfB7xH3z6T3kKpJ9s3h",
    decimals: 9,
  },
  {
    symbol: "ORE",
    name: "Ore",
    mint: "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp",
    decimals: 9,
  },
  // Stablecoins
  {
    symbol: "USDC",
    name: "USD Coin",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
  },
  {
    symbol: "CASH",
    name: "Cash",
    mint: "CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT",
    decimals: 6,
  },
  // RWA / NAV feeds
  {
    symbol: "NAV.USTB",
    name: "Backed US Treasury",
    mint: "BACKXhFBa8fGDryz2rXonVG8ncwXvGHvbMqMW5hu4fd6",
    decimals: 6,
  },
  {
    symbol: "NAV.USCC",
    name: "Backed Corporate Credit",
    mint: "CChTq6PthWU82YZkbveA3WDf7s97BWhBznwH4VBFjA6P",
    decimals: 6,
  },
  {
    symbol: "NOPAL",
    name: "Nopal",
    mint: "NoPALrDZhMK2c9FhYNqpjUsEDm6xX77gvJTiCZzfcj5",
    decimals: 6,
  },
  {
    symbol: "NTBILL",
    name: "N-T Bill",
    mint: "NTBiLLryRmKCPJPKqQzqrxhBVqK6qD4VJaqqfU7d2g5",
    decimals: 6,
  },
  {
    symbol: "NBASIS",
    name: "N-Basis",
    mint: "NBAsisMa9YEGjXKBNkVgv8HPKYpbZ7kxr6sGwkkV1LD",
    decimals: 6,
  },
  {
    symbol: "NWISDOM",
    name: "N-Wisdom",
    mint: "NWiSDoMaFoS5TcEfhXr3BNp4PUc8d1TpXhxTuBpFN1L",
    decimals: 6,
  },
  {
    symbol: "NALPHA",
    name: "N-Alpha",
    mint: "NALpHaCnPUe1vASTJ1m7P2XPdNqNj2ocsGWqzfb8Fzo",
    decimals: 6,
  },
  {
    symbol: "PST",
    name: "PST",
    mint: "PSTzkFMvcjZKLJfzxiTMqPJV9Ni5E4RqQaE3kZw1kNr",
    decimals: 6,
  },
  {
    symbol: "JUPUSD",
    name: "Jupiter USD",
    mint: "JUPUSDh8wXbLxdGFmcyYZRcCZqU6RqJFHN4kMQcahm3r",
    decimals: 6,
  },
  {
    symbol: "ACRED",
    name: "ACRED",
    mint: "ACreDVQqFhfMCJPuHXwSfGtb6G3SjZMW38jdZV6vdYJ",
    decimals: 6,
  },
  {
    symbol: "SYRUPUSDC",
    name: "Syrup USDC",
    mint: "SYRUpPfJCBmYhBqEnMT7nGcLNvPWb6sRmCQFNdPUjdn",
    decimals: 6,
  },
  // Index feeds
  {
    symbol: "INDEX.FORD",
    name: "Ford Motor Index",
    mint: "FoRDe8jBV8pLq3aVnmb8BzYjhQhh3Jex1L6c1R12kmn",
    decimals: 6,
  },
  {
    symbol: "INDEX.GLXY",
    name: "Galaxy Digital Index",
    mint: "GLXYd1gita1aLB9W7T7R8mh3Bo7dqUVjSt3R6kp1tmz",
    decimals: 6,
  },
];

export function findTokenByMint(mint: string): Token | undefined {
  return LISTED_SPL_TOKENS.find((token) => token.mint === mint);
}

// ---------------------------------------------------------------------------
// Synchronous mint → {symbol, decimals} resolver for decoded on-chain RFQs.
// Seeded devnet test mints (sBASE/sALT) and devnet USDC aren't in the mainnet
// catalog above, so they come from the seed manifest the seed script writes
// (scripts/seed.ts). Resolution order: seed manifest → static catalog →
// truncated-mint fallback. Jupiter (async, mainnet-only) stays in useTokenMeta.
// ---------------------------------------------------------------------------

interface ManifestEntry {
  symbol: string;
  decimals: number;
  logoURI?: string;
}

const SEED_MANIFEST: Record<string, ManifestEntry> = seedManifestDevnet;

export interface ResolvedToken {
  symbol: string;
  decimals: number;
  logoURI?: string;
}

/** Short base58 label for an unknown mint, e.g. "4zMM…ncDU". */
function shortMint(mint: string): string {
  return mint.length <= 9 ? mint : `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

/** Seed-manifest entry for a mint (sBASE/sALT/devnet USDC), if any. Exposed
 * so useTokenMeta's static fallback resolves seeded mints with the correct
 * decimals instead of TokenAmountInput's generic 9-decimals fallback. */
export function seededTokenMeta(mint: string): ResolvedToken | undefined {
  return SEED_MANIFEST[mint];
}

/**
 * Resolve a mint to its display symbol + decimals synchronously. Falls back to
 * a truncated address with 0 decimals for mints not in the manifest or catalog
 * (which on a seeded devnet should never happen — seeded mints are committed to
 * the manifest). Decimals drive base-unit → display scaling, so an unknown mint
 * renders raw rather than mis-scaled.
 */
export function resolveTokenMeta(mint: string): ResolvedToken {
  const fromManifest = SEED_MANIFEST[mint];
  if (fromManifest) return fromManifest;
  const fromCatalog = findTokenByMint(mint);
  if (fromCatalog) {
    return {
      symbol: fromCatalog.symbol,
      decimals: fromCatalog.decimals,
      ...(fromCatalog.logoURI !== undefined ? { logoURI: fromCatalog.logoURI } : {}),
    };
  }
  return { symbol: shortMint(mint), decimals: 0 };
}
