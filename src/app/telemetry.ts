// Stub telemetry sink. Swap with a real Sentry (or equivalent) client when one
// is provisioned. Intentionally accepts anything so error boundaries and
// liquidity-guard failure paths can call it without a conditional.

export function captureError(_error: unknown, _info?: Record<string, unknown>): void {
  // no-op
}
