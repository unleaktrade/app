import { describe, expect, it } from "vitest";
import type { Buffer } from "buffer";
import {
  FACILITATOR_REWARD_FACILITATOR_OFFSET,
  FACILITATOR_REWARD_RFQ_OFFSET,
  QUOTE_RFQ_OFFSET,
  QUOTE_TAKER_OFFSET,
  RFQ_MAKER_OFFSET,
} from "@/chain/accounts/lists";
import {
  encodeAccount,
  makeRawFacilitatorRewardTracker,
  makeRawQuote,
  makeRawRfq,
  pk,
} from "./fixtures";

// Encoding goes through the committed-IDL Borsh coder, so asserting that a
// known pubkey lands at the memcmp offset proves the filter constant matches
// the real on-chain byte layout — the exact thing getProgramAccounts relies on.
function pubkeyAt(buf: Buffer, offset: number): Uint8Array {
  return Uint8Array.from(buf.subarray(offset, offset + 32));
}

describe("list memcmp offsets match the committed-IDL Borsh layout", () => {
  it("rfq.maker sits at RFQ_MAKER_OFFSET", async () => {
    const maker = pk();
    const encoded = await encodeAccount("rfq", makeRawRfq({ maker }));
    expect(pubkeyAt(encoded, RFQ_MAKER_OFFSET)).toEqual(maker.toBytes());
  });

  it("quote.rfq and quote.taker sit at their offsets", async () => {
    const rfq = pk();
    const taker = pk();
    const encoded = await encodeAccount("quote", makeRawQuote({ rfq, taker }));
    expect(pubkeyAt(encoded, QUOTE_RFQ_OFFSET)).toEqual(rfq.toBytes());
    expect(pubkeyAt(encoded, QUOTE_TAKER_OFFSET)).toEqual(taker.toBytes());
  });

  it("facilitatorRewardTracker.rfq and .facilitator sit at their offsets", async () => {
    const rfq = pk();
    const facilitator = pk();
    const encoded = await encodeAccount(
      "facilitatorRewardTracker",
      makeRawFacilitatorRewardTracker({ rfq, facilitator }),
    );
    expect(pubkeyAt(encoded, FACILITATOR_REWARD_RFQ_OFFSET)).toEqual(rfq.toBytes());
    expect(pubkeyAt(encoded, FACILITATOR_REWARD_FACILITATOR_OFFSET)).toEqual(facilitator.toBytes());
  });
});
