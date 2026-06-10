import { describe, expect, it } from "vitest";
import { BN } from "@coral-xyz/anchor";
import { normaliseRfq, rfqAccountSchema, type RawRfq } from "@/chain/accounts/rfq";
import { normaliseQuote, type RawQuote } from "@/chain/accounts/quote";
import { normaliseCommitGuard, type RawCommitGuard } from "@/chain/accounts/commitGuard";
import { normaliseSettlement, type RawSettlement } from "@/chain/accounts/settlement";
import { normaliseFeesTracker, type RawFeesTracker } from "@/chain/accounts/feesTracker";
import {
  normaliseSlashedBondsTracker,
  type RawSlashedBondsTracker,
} from "@/chain/accounts/slashedBondsTracker";
import {
  normaliseFacilitatorRewardTracker,
  type RawFacilitatorRewardTracker,
} from "@/chain/accounts/facilitatorRewardTracker";
import { normaliseConfig, type RawConfig } from "@/chain/accounts/config";
import { RFQ_STATES, rfqStateFromAnchor } from "@/chain/accounts/shared";
import {
  decodeAccount,
  encodeAccount,
  idl,
  makeRawCommitGuard,
  makeRawConfig,
  makeRawFacilitatorRewardTracker,
  makeRawFeesTracker,
  makeRawQuote,
  makeRawRfq,
  makeRawSettlement,
  makeRawSlashedBondsTracker,
  pk,
  T0,
} from "./fixtures";

describe("IDL parity", () => {
  it("RfqState discriminant order matches the Rust enum (Draft=0 … Incomplete=8)", () => {
    const types = (idl as unknown as { types: { name: string; type: unknown }[] }).types;
    const rfqState = types.find((t) => t.name === "RfqState");
    expect(rfqState).toBeDefined();
    const variants = (rfqState?.type as { variants: { name: string }[] }).variants.map(
      (v) => v.name,
    );
    expect(variants).toEqual([
      "Draft",
      "Open",
      "Committed",
      "Revealed",
      "Selected",
      "Settled",
      "Ignored",
      "Expired",
      "Incomplete",
    ]);
  });

  it("maps every Anchor enum variant to the matching RFQState string", () => {
    const anchorVariants = [
      "draft",
      "open",
      "committed",
      "revealed",
      "selected",
      "settled",
      "ignored",
      "expired",
      "incomplete",
    ];
    anchorVariants.forEach((variant, index) => {
      expect(rfqStateFromAnchor({ [variant]: {} })).toBe(RFQ_STATES[index]);
    });
  });

  it("throws on an unknown enum variant", () => {
    expect(() => rfqStateFromAnchor({ bogus: {} })).toThrow(/Unknown RfqState/);
    expect(() => rfqStateFromAnchor({})).toThrow(/Unknown RfqState/);
  });
});

describe("Rfq decoder", () => {
  it("round-trips encode → decode → normalise", async () => {
    const raw = makeRawRfq({
      state: { open: {} },
      openedAt: new BN(T0 + 10),
      committedCount: 3,
      facilitator: pk(),
    });
    const decoded = decodeAccount<RawRfq>("rfq", await encodeAccount("rfq", raw));
    const account = normaliseRfq(decoded);

    expect(account.state).toBe("Open");
    expect(account.maker.equals(raw.maker)).toBe(true);
    expect(account.bondAmount).toBe(50_000_000n);
    expect(account.baseAmount).toBe(1_000_000_000n);
    expect(account.takerFeeBps).toBe(30);
    expect(account.createdAt).toBe(T0);
    expect(account.openedAt).toBe(T0 + 10);
    expect(account.selectedAt).toBeNull();
    expect(account.committedCount).toBe(3);
    expect(account.uuid).toBeInstanceOf(Uint8Array);
    expect(account.uuid).toHaveLength(16);
    expect(
      account.facilitator?.equals(raw.facilitator as NonNullable<typeof raw.facilitator>),
    ).toBe(true);
  });

  it("decodes all 9 state variants", async () => {
    const variants: [string, string][] = [
      ["draft", "Draft"],
      ["open", "Open"],
      ["committed", "Committed"],
      ["revealed", "Revealed"],
      ["selected", "Selected"],
      ["settled", "Settled"],
      ["ignored", "Ignored"],
      ["expired", "Expired"],
      ["incomplete", "Incomplete"],
    ];
    for (const [anchorName, expected] of variants) {
      const raw = makeRawRfq({ state: { [anchorName]: {} } });
      const decoded = decodeAccount<RawRfq>("rfq", await encodeAccount("rfq", raw));
      expect(normaliseRfq(decoded).state).toBe(expected);
    }
  });

  it("preserves u64 amounts beyond 2^53 exactly", async () => {
    const huge = 2n ** 60n;
    const raw = makeRawRfq({ bondAmount: new BN(huge.toString()) });
    const decoded = decodeAccount<RawRfq>("rfq", await encodeAccount("rfq", raw));
    expect(normaliseRfq(decoded).bondAmount).toBe(huge);
  });

  it("zod rejects a tampered normalised shape", () => {
    expect(() =>
      rfqAccountSchema.parse({
        ...normaliseRfq(makeRawRfq()),
        takerFeeBps: -1,
      }),
    ).toThrow();
    expect(() =>
      rfqAccountSchema.parse({
        ...normaliseRfq(makeRawRfq()),
        bondAmount: 5, // number, not bigint
      }),
    ).toThrow();
  });
});

describe("Quote decoder", () => {
  it("round-trips with None options", async () => {
    const raw = makeRawQuote();
    const decoded = decodeAccount<RawQuote>("quote", await encodeAccount("quote", raw));
    const account = normaliseQuote(decoded);
    expect(account.revealedAt).toBeNull();
    expect(account.quoteAmount).toBeNull();
    expect(account.facilitator).toBeNull();
    expect(account.selected).toBe(false);
    expect(account.commitHash).toHaveLength(32);
    expect(account.liquidityProof).toHaveLength(64);
    expect(account.maxFundingDeadline).toBe(T0 + 14_400);
  });

  it("round-trips with Some options", async () => {
    const facilitator = pk();
    const raw = makeRawQuote({
      revealedAt: new BN(T0 + 100),
      quoteAmount: new BN(950_000_000),
      facilitator,
      selected: true,
    });
    const decoded = decodeAccount<RawQuote>("quote", await encodeAccount("quote", raw));
    const account = normaliseQuote(decoded);
    expect(account.revealedAt).toBe(T0 + 100);
    expect(account.quoteAmount).toBe(950_000_000n);
    expect(account.facilitator?.equals(facilitator)).toBe(true);
    expect(account.selected).toBe(true);
  });
});

describe("CommitGuard decoder", () => {
  it("round-trips", async () => {
    const raw = makeRawCommitGuard();
    const decoded = decodeAccount<RawCommitGuard>(
      "commitGuard",
      await encodeAccount("commitGuard", raw),
    );
    const account = normaliseCommitGuard(decoded);
    expect(account.quote.equals(raw.quote)).toBe(true);
    expect(account.committedAt).toBe(T0);
    expect(account.bump).toBe(251);
  });
});

describe("Settlement decoder", () => {
  it("round-trips with None taker accounts", async () => {
    const raw = makeRawSettlement();
    const decoded = decodeAccount<RawSettlement>(
      "settlement",
      await encodeAccount("settlement", raw),
    );
    const account = normaliseSettlement(decoded);
    expect(account.takerBaseAccount).toBeNull();
    expect(account.takerQuoteAccount).toBeNull();
    expect(account.completedAt).toBeNull();
    expect(account.quoteAmount).toBe(950_000_000n);
  });

  it("round-trips a completed settlement", async () => {
    const takerBase = pk();
    const raw = makeRawSettlement({
      takerBaseAccount: takerBase,
      takerQuoteAccount: pk(),
      completedAt: new BN(T0 + 500),
      takerFundedAt: new BN(T0 + 500),
    });
    const decoded = decodeAccount<RawSettlement>(
      "settlement",
      await encodeAccount("settlement", raw),
    );
    const account = normaliseSettlement(decoded);
    expect(account.takerBaseAccount?.equals(takerBase)).toBe(true);
    expect(account.completedAt).toBe(T0 + 500);
    expect(account.takerFundedAt).toBe(T0 + 500);
  });
});

describe("tracker decoders", () => {
  it("FeesTracker round-trips", async () => {
    const raw = makeRawFeesTracker();
    const decoded = decodeAccount<RawFeesTracker>(
      "feesTracker",
      await encodeAccount("feesTracker", raw),
    );
    const account = normaliseFeesTracker(decoded);
    expect(account.amount).toBe(285_000n);
    expect(account.payedAt).toBe(T0);
  });

  it("SlashedBondsTracker round-trips unresolved and resolved", async () => {
    const unresolved = normaliseSlashedBondsTracker(
      decodeAccount<RawSlashedBondsTracker>(
        "slashedBondsTracker",
        await encodeAccount("slashedBondsTracker", makeRawSlashedBondsTracker()),
      ),
    );
    expect(unresolved.amount).toBeNull();
    expect(unresolved.seizedAt).toBeNull();

    const resolved = normaliseSlashedBondsTracker(
      decodeAccount<RawSlashedBondsTracker>(
        "slashedBondsTracker",
        await encodeAccount(
          "slashedBondsTracker",
          makeRawSlashedBondsTracker({ amount: new BN(100_000_000), seizedAt: new BN(T0 + 1) }),
        ),
      ),
    );
    expect(resolved.amount).toBe(100_000_000n);
    expect(resolved.seizedAt).toBe(T0 + 1);
  });

  it("FacilitatorRewardTracker round-trips", async () => {
    const raw = makeRawFacilitatorRewardTracker();
    const decoded = decodeAccount<RawFacilitatorRewardTracker>(
      "facilitatorRewardTracker",
      await encodeAccount("facilitatorRewardTracker", raw),
    );
    const account = normaliseFacilitatorRewardTracker(decoded);
    expect(account.amount).toBe(14_250n);
    expect(account.facilitator.equals(raw.facilitator)).toBe(true);
  });
});

describe("Config decoder", () => {
  it("round-trips", async () => {
    const raw = makeRawConfig();
    const decoded = decodeAccount<RawConfig>("config", await encodeAccount("config", raw));
    const account = normaliseConfig(decoded);
    expect(account.liquidityGuard.equals(raw.liquidityGuard)).toBe(true);
    expect(account.facilitatorFeeBps).toBe(500);
  });
});
