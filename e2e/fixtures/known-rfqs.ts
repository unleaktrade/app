// Stable RFQ pubkeys the hermetic read-only specs navigate to directly. These
// exist in the committed RPC cassette (e2e/fixtures/rpc-cassette.json); the
// fixed replay clock keeps their deadline windows exactly as captured. When
// the cassette is re-recorded (see e2e/README.md) against a re-seeded devnet,
// refresh these to match — pick fixtures created with `npm run seed`.

// An Open RFQ seeded with a 24h commit window (`--only open` uses the LONG
// TTLs), so the commit CTA is live under the pinned clock. Used by the
// commit-modal + mobile action-sheet specs.
export const OPEN_RFQ_WITH_COMMIT_WINDOW = "CQ1NZW1PuxgQY74ds27dsmD3JDNu2Vewv5r2Wj3da8hK";
