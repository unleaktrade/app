// Canonical outbound links to the landing site (unleak.trade). The FAQ slug
// anchors are coordinated with landing-page#35 — treat them as a stable API,
// don't invent ad-hoc anchors. Never append activation tokens or any user
// identifier to these URLs.

export const LANDING_URL = "https://unleak.trade";

export const LANDING_FAQ_URL = `${LANDING_URL}/faq`;

/** Primary beta-token guidance target: how devnet USDC is distributed to
 * activated waitlist members, and how to check distribution status. */
export const FAQ_DEVNET_USDC = `${LANDING_FAQ_URL}#devnet-usdc`;

export const FAQ_TRY_NOW = `${LANDING_FAQ_URL}#try-unleaktrade-now`;

export const FAQ_WHY_REQUEST_ACCESS = `${LANDING_FAQ_URL}#why-request-access`;
