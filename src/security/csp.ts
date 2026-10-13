// Production Content-Security-Policy, injected as a <meta> by the `inject-csp`
// plugin in vite.config.ts on `vite build` only (never the dev server — a page
// CSP would break Vite's HMR websocket and tooling). GitHub Pages can't set
// response headers, so the meta is the only lever; frame-ancestors /
// report-uri (header-only directives) are therefore out of scope.
//
// Pure and dependency-free on purpose: vite.config.ts imports it at config
// time, so it must not pull in any client module.
//
// Rationale per directive:
//   script-src 'self'          — only our own bundled chunks execute; wallet
//                                extensions run as content scripts (their own
//                                origin) and talk via postMessage, so they need
//                                no page-CSP exception.
//   style-src  'unsafe-inline' — motion/recharts/Tailwind set inline style
//                                attributes; unavoidable and low-risk vs scripts.
//   connect-src                — the RPC endpoints actually baked into the build
//                                (https + the ws endpoint web3.js derives for
//                                subscriptions), the per-cluster liquidity-guard
//                                upstreams, and the Jupiter token/price API
//                                (src/app/lib/jupiter.ts).
//   img-src https:             — remote token logos (Jupiter CDN) + data: (QR /
//                                html-to-image receipts).
//   font-src data:             — Vite inlines @fontsource subsets under its 4 kB
//                                assetsInlineLimit as data: URIs in the CSS.

export interface CspInputs {
  /** Resolved liquidity-guard upstreams (VITE_LG_URL_* or LG_DEFAULTS). */
  lgTargets: { localnet: string; devnet: string; mainnet: string };
  /** Raw VITE_RPC_URL_* overrides; absent = the public cluster endpoint. */
  rpcOverrides: { devnet?: string; mainnet?: string; localnet?: string };
}

// Mirrors clusterApiUrl() — what src/chain/cluster.ts endpointFor() uses when
// no VITE_RPC_URL_* override is set.
const DEFAULT_RPC = {
  devnet: "https://api.devnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
} as const;

/** Origin only: a keyed URL's path / query never lands in the policy. */
function originOf(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.origin : null;
  } catch {
    return null;
  }
}

/**
 * The RPC origin plus the websocket origin web3.js derives from it
 * (`makeWebsocketUrl`: http→ws, https→wss, explicit port + 1).
 */
function rpcSources(url: string): string[] {
  const origin = originOf(url);
  if (!origin) return [];
  const u = new URL(origin);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  if (u.port !== "") u.port = String(Number(u.port) + 1);
  return [origin, u.origin];
}

export function buildCsp({ lgTargets, rpcOverrides }: CspInputs): string {
  // Localnet is only allowed when explicitly configured: its defaults point at
  // localhost, which a production page has no business talking to.
  const rpc = [
    rpcOverrides.devnet || DEFAULT_RPC.devnet,
    rpcOverrides.mainnet || DEFAULT_RPC.mainnet,
    ...(rpcOverrides.localnet ? [rpcOverrides.localnet] : []),
  ].flatMap(rpcSources);
  const lg = [lgTargets.devnet, lgTargets.mainnet].map(originOf);
  const connect = [
    ...new Set(["'self'", ...rpc, ...lg, "https://lite-api.jup.ag"].filter((s) => s !== null)),
  ];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "frame-src 'self'",
    "form-action 'self'",
    `connect-src ${connect.join(" ")}`,
    "upgrade-insecure-requests",
  ].join("; ");
}
