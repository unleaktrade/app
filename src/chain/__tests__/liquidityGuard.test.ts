import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import {
  checkHeaders,
  fetchAttestation,
  fetchHealth,
  LiquidityGuardError,
  verifyAttestation,
  type AttestationRequest,
} from "@/chain/liquidityGuard";

// vite.config.ts pins __LG_API_KEYS__ in test mode to
// { localnet: "", devnet: "test-devnet-api-key", mainnet: "" }.
const DEVNET_KEY = "test-devnet-api-key";

const REQ: AttestationRequest = {
  rfq: new PublicKey("6p7BsnxWgNze6wLjhHD9wN6Zo7jEpoFZ9npCDPhsJK8H"),
  taker: new PublicKey("8GAt381fturbi53tXBKubeKgXAdjKvu4fV7H9sn3z4pZ"),
  salt: new Uint8Array(64).fill(7),
  quoteMint: new PublicKey("EoTybYbsuFWfe64MqMqVuVTNgHfQgK6xLu4fvnguy9dN"),
  quoteAmount: 100_000_000n,
  bondAmount: 100_000n,
  takerFeeBps: 50,
};

const OK_BODY = {
  commit_hash: "ab".repeat(32),
  liquidity_proof: "cd".repeat(64),
  service_pubkey: "5gfPFweV3zJovznZqBra3rv5tWJ5EHVzQY1PqvNA4HGg",
  network: "Devnet",
  skip_fund_checks: false,
  timestamp: 1_700_000_000,
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function sentHeaders(call = 0): Record<string, string> {
  const init = fetchMock.mock.calls[call]?.[1];
  return (init?.headers ?? {}) as Record<string, string>;
}

describe("checkHeaders", () => {
  it("adds X-API-Key only for clusters with a configured key", () => {
    expect(checkHeaders("devnet")).toEqual({
      "Content-Type": "application/json",
      "X-API-Key": DEVNET_KEY,
    });
    expect(checkHeaders("localnet")).toEqual({ "Content-Type": "application/json" });
    // mainnet-beta maps onto the mainnet slot, which has no key in tests.
    expect(checkHeaders("mainnet-beta")).toEqual({ "Content-Type": "application/json" });
  });
});

describe("fetchAttestation", () => {
  it("POSTs the snake_case body to the cluster's /check path with the API key", async () => {
    fetchMock.mockResolvedValueOnce(json(200, OK_BODY));
    const res = await fetchAttestation("devnet", REQ);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/liquidity-guard/devnet/check");
    expect(init?.method).toBe("POST");
    expect(sentHeaders()["X-API-Key"]).toBe(DEVNET_KEY);
    expect(JSON.parse(init?.body as string)).toEqual({
      rfq: REQ.rfq.toBase58(),
      taker: REQ.taker.toBase58(),
      salt: "07".repeat(64),
      quote_mint: REQ.quoteMint.toBase58(),
      quote_amount: "100000000",
      bond_amount_usdc: "100000",
      taker_fee_bps: "50",
    });

    expect(res.commitHash).toEqual(new Uint8Array(32).fill(0xab));
    expect(res.liquidityProof).toEqual(new Uint8Array(64).fill(0xcd));
    expect(res.servicePubkey).toBe(OK_BODY.service_pubkey);
    expect(res.skipFundChecks).toBe(false);
  });

  it("sends no X-API-Key when the cluster has none", async () => {
    fetchMock.mockResolvedValueOnce(json(200, OK_BODY));
    await fetchAttestation("localnet", REQ);
    expect(fetchMock.mock.calls[0]![0]).toBe("/liquidity-guard/localnet/check");
    expect(sentHeaders()).not.toHaveProperty("X-API-Key");
  });

  it("does not retry a 401 and surfaces the guard's error", async () => {
    fetchMock.mockResolvedValue(json(401, { error: "Unauthorized" }));
    const err = await fetchAttestation("devnet", REQ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LiquidityGuardError);
    expect((err as LiquidityGuardError).status).toBe(401);
    expect((err as LiquidityGuardError).message).toBe("Unauthorized");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a 400 validation error", async () => {
    fetchMock.mockResolvedValue(json(400, { error: "Insufficient USDC balance" }));
    await expect(fetchAttestation("devnet", REQ)).rejects.toMatchObject({
      status: 400,
      message: "Insufficient USDC balance",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("backs off on 429 (300/900ms) and succeeds, keeping the key on retries", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(new Response("Too Many Requests", { status: 429 }))
      .mockResolvedValueOnce(new Response("Too Many Requests", { status: 429 }))
      .mockResolvedValueOnce(json(200, OK_BODY));
    const pending = fetchAttestation("devnet", REQ);
    await vi.advanceTimersByTimeAsync(299);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(900);
    const res = await pending;
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(res.network).toBe("Devnet");
    for (const call of [0, 1, 2]) expect(sentHeaders(call)["X-API-Key"]).toBe(DEVNET_KEY);
  });

  it("gives up after the last 429 with the plain-text body as message", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () => new Response("Too Many Requests", { status: 429 }));
    const pending = fetchAttestation("devnet", REQ).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(300 + 900 + 2700);
    const err = await pending;
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(err).toMatchObject({ status: 429, message: "Too Many Requests" });
  });

  it("falls back to `HTTP <status>` on an empty error body", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 503 }));
    await expect(fetchAttestation("devnet", REQ)).rejects.toMatchObject({
      status: 503,
      message: "HTTP 503",
    });
  });

  it("rejects malformed hex in a 200 response instead of zero-filling", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { ...OK_BODY, commit_hash: "zz".repeat(32) }));
    await expect(fetchAttestation("devnet", REQ)).rejects.toThrow(/invalid hex/);
  });
});

describe("fetchHealth", () => {
  it("never sends the API key and maps the snake_case payload", async () => {
    fetchMock.mockResolvedValueOnce(
      json(200, {
        status: "healthy",
        network: "Devnet",
        service_pubkey: OK_BODY.service_pubkey,
        timestamp: 1,
        skip_fund_checks: true,
      }),
    );
    const health = await fetchHealth("devnet");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/liquidity-guard/devnet/health");
    expect(JSON.stringify(init ?? {})).not.toContain(DEVNET_KEY);
    expect(health).toEqual({
      status: "healthy",
      network: "Devnet",
      servicePubkey: OK_BODY.service_pubkey,
      timestamp: 1,
      skipFundChecks: true,
    });
  });

  it("throws a LiquidityGuardError carrying the HTTP status", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 502 }));
    await expect(fetchHealth("mainnet-beta")).rejects.toMatchObject({ status: 502 });
    expect(fetchMock.mock.calls[0]![0]).toBe("/liquidity-guard/mainnet/health");
  });
});

describe("verifyAttestation", () => {
  it("accepts the guard's signature and rejects any other key or hash", () => {
    const guard = Keypair.generate();
    const hash = new Uint8Array(32).fill(1);
    const sig = nacl.sign.detached(hash, guard.secretKey);
    expect(verifyAttestation(hash, sig, guard.publicKey)).toBe(true);
    expect(verifyAttestation(hash, sig, Keypair.generate().publicKey)).toBe(false);
    expect(verifyAttestation(new Uint8Array(32).fill(2), sig, guard.publicKey)).toBe(false);
  });
});
