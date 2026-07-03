import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Page, Route } from "@playwright/test";

// Record/replay for the Solana JSON-RPC HTTP layer, so the read-only E2E
// projects (desktop/mobile) render hermetically — no live devnet, no secrets,
// no funded wallets. The marketplace list opens no websocket, and the
// websocket used by detail/Config hooks is non-blocking (initial data is the
// HTTP query; onAccountChange errors are swallowed), so intercepting the HTTP
// POST is sufficient to render every read-only screen.
//
// Two modes, both driven by env:
//   RECORD_RPC=1  — PASSIVELY observe (page.on("response")) the real RPC traffic
//                   the app makes against the configured endpoint and write the
//                   cassette on exit. No interception, so the live run behaves
//                   exactly as normal. Run against a seeded devnet.
//   (default)     — replay: intercept each RPC POST and answer from the
//                   committed cassette, falling back to a benign empty result
//                   on a miss. No network.
//
// The request key is method + stable-stringified params (the varying `id` is a
// sibling of method/params, never in the key), so it is deterministic across
// runs and host-agnostic — recording against real devnet and replaying against
// a pinned dummy origin both match.

const CASSETTE_PATH = join(process.cwd(), "e2e/fixtures/rpc-cassette.json");
const RECORD = Boolean(process.env.RECORD_RPC);

type Cassette = Record<string, unknown>; // request key -> jsonrpc `result`

function loadCassette(): Cassette {
  if (!existsSync(CASSETTE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CASSETTE_PATH, "utf8")) as Cassette;
  } catch {
    return {};
  }
}

const cassette: Cassette = loadCassette();
const recorded: Cassette = {};

// Wall-clock at capture time. Deadline guards (commit/reveal/selection/funding
// windows) are relative to Date.now(), and the cassette freezes each account's
// openedAt in the past — so in replay we pin the browser clock to this value,
// keeping every window/state exactly as it was when captured. Special key
// (contains no "|", so it never collides with a request key).
const CAPTURED_AT_KEY = "__capturedAt";
const capturedAt =
  typeof cassette[CAPTURED_AT_KEY] === "number" ? (cassette[CAPTURED_AT_KEY] as number) : null;

// Deterministic JSON: object keys sorted recursively so param key ordering
// never changes the cassette key.
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

function keyFor(method: string, params: unknown): string {
  return `${method}|${stableStringify(params ?? null)}`;
}

// Replies for RPC calls not in the cassette. Empty-but-valid shapes keep the
// app rendering (an ephemeral wallet legitimately has no accounts).
function benignDefault(method: string): unknown {
  switch (method) {
    case "getProgramAccounts":
      return [];
    case "getMultipleAccounts":
      return { context: { slot: 0 }, value: [] };
    case "getAccountInfo":
      return { context: { slot: 0 }, value: null };
    case "getBalance":
      return { context: { slot: 0 }, value: 0 };
    case "getLatestBlockhash":
      return {
        context: { slot: 0 },
        value: { blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 0 },
      };
    case "getHealth":
      return "ok";
    case "getVersion":
      return { "solana-core": "2.0.0" };
    default:
      return null;
  }
}

// Static healthy payload for the liquidity-guard /health proxy. Read-only
// screens (HealthPill is DEV-only) don't assert on this; it just needs a
// well-formed body so nothing throws.
const HEALTH = {
  status: "healthy",
  network: "Devnet",
  service_pubkey: "kzzUVbvatfRP5cFkwZVXQaEW4C85nv6KQmh1NZ7yk1y",
  skip_fund_checks: false,
  timestamp: 0,
};

interface RpcItem {
  method?: string;
  params?: unknown;
  id?: unknown;
}

function isRpcPost(body: string): boolean {
  return body.includes("jsonrpc");
}

function isExternal(hostname: string): boolean {
  return hostname !== "localhost" && hostname !== "127.0.0.1";
}

// Replay handler: answer from the cassette, else a benign default. Never hits
// the network.
async function replayRpc(route: Route): Promise<void> {
  const request = route.request();
  if (request.method() !== "POST") return route.continue();
  const bodyText = request.postData() ?? "";
  if (!isRpcPost(bodyText)) return route.continue();

  let parsed: RpcItem | RpcItem[];
  try {
    parsed = JSON.parse(bodyText) as RpcItem | RpcItem[];
  } catch {
    return route.continue();
  }
  const isBatch = Array.isArray(parsed);
  const items: RpcItem[] = isBatch ? (parsed as RpcItem[]) : [parsed as RpcItem];

  const results = items.map((item) => {
    const key = keyFor(item.method ?? "", item.params);
    const result = key in cassette ? cassette[key] : benignDefault(item.method ?? "");
    return { jsonrpc: "2.0", id: item.id ?? null, result };
  });
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(isBatch ? results : results[0]),
  });
}

/**
 * RECORD mode: attach a passive response listener that captures RPC
 * request→result pairs (no interception — the live run is untouched).
 * Replay mode: pin the clock to capture time and intercept RPC + the health
 * proxy from the cassette.
 */
export async function installRpcReplay(page: Page): Promise<void> {
  if (RECORD) {
    page.on("response", (response) => {
      void (async () => {
        try {
          const request = response.request();
          if (request.method() !== "POST") return;
          const body = request.postData() ?? "";
          if (!isRpcPost(body)) return;
          if (!isExternal(new URL(request.url()).hostname)) return;
          const parsed = JSON.parse(body) as RpcItem | RpcItem[];
          const isBatch = Array.isArray(parsed);
          const items: RpcItem[] = isBatch ? (parsed as RpcItem[]) : [parsed as RpcItem];
          const json = (await response.json()) as unknown;
          const respItems = (isBatch ? json : [json]) as Array<{ result?: unknown }>;
          items.forEach((item, i) => {
            const r = respItems[i];
            if (item.method && r && "result" in r) {
              recorded[keyFor(item.method, item.params)] = r.result;
            }
          });
        } catch {
          // Non-JSON body, or the context closed mid-read — ignore.
        }
      })();
    });
    return;
  }

  // Pin the clock to capture time so deadline-relative rendering (windows,
  // "expires in", terminal-state detection) matches the frozen chain state.
  // setFixedTime keeps timers running (so React/TanStack behave normally) but
  // makes Date.now() constant. Must run before the first navigation.
  if (capturedAt !== null) {
    await page.clock.setFixedTime(new Date(capturedAt));
  }
  await page.route("**/liquidity-guard/**/health", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(HEALTH),
    }),
  );
  await page.route((url) => isExternal(url.hostname), replayRpc);
}

if (RECORD) {
  process.on("exit", () => {
    // Only worker processes that actually captured write the cassette. The
    // main Playwright runner attaches no page listeners, so its `recorded` is
    // empty — it must not clobber the workers' output. Re-read on disk before
    // merging so concurrent workers accumulate rather than overwrite.
    if (Object.keys(recorded).length === 0) return;
    const onDisk = loadCassette();
    const merged = { ...onDisk, ...recorded, [CAPTURED_AT_KEY]: Date.now() };
    writeFileSync(CASSETTE_PATH, `${JSON.stringify(merged, null, 2)}\n`);
    // eslint-disable-next-line no-console
    console.log(
      `[rpc-replay] wrote ${Object.keys(merged).length - 1} RPC entries to ${CASSETTE_PATH}`,
    );
  });
}
