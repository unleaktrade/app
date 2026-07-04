import type { SVGProps } from "react";

/**
 * Inline SVG empty-state illustrations (issue #16 — "empty states with
 * personality"). No image assets, no network: each is a small hand-rolled
 * line drawing tinted via the state tokens, so they follow the theme.
 */

type IllustrationProps = SVGProps<SVGSVGElement>;

function base(props: IllustrationProps): IllustrationProps {
  return {
    width: 96,
    height: 96,
    viewBox: "0 0 96 96",
    fill: "none",
    "aria-hidden": true,
    ...props,
  };
}

/** Sweeping radar — nothing on the marketplace scope yet. */
export function RadarIllustration(props: IllustrationProps) {
  return (
    <svg {...base(props)}>
      <circle
        cx="48"
        cy="48"
        r="34"
        stroke="var(--state-open)"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      <circle
        cx="48"
        cy="48"
        r="22"
        stroke="var(--state-open)"
        strokeOpacity="0.2"
        strokeWidth="1.5"
      />
      <circle
        cx="48"
        cy="48"
        r="10"
        stroke="var(--state-open)"
        strokeOpacity="0.15"
        strokeWidth="1.5"
      />
      <path d="M48 48 L76 34" stroke="var(--state-open)" strokeWidth="2" strokeLinecap="round" />
      <path d="M48 48 L76 34 A34 34 0 0 0 60 17 Z" fill="var(--state-open)" fillOpacity="0.12" />
      <circle cx="63" cy="60" r="2.5" fill="var(--state-open)" fillOpacity="0.7" />
      <circle cx="34" cy="38" r="2" fill="var(--state-open)" fillOpacity="0.4" />
      <circle cx="48" cy="48" r="3" fill="var(--state-open)" />
    </svg>
  );
}

/** Sprouting seedling — activity will grow here. */
export function SeedlingIllustration(props: IllustrationProps) {
  return (
    <svg {...base(props)}>
      <path d="M48 74 V46" stroke="var(--state-settled)" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M48 52 C48 40 38 34 27 34 C27 46 37 52 48 52 Z"
        stroke="var(--state-settled)"
        strokeWidth="2"
        fill="var(--state-settled)"
        fillOpacity="0.12"
      />
      <path
        d="M48 44 C48 34 56 28 66 28 C66 38 58 44 48 44 Z"
        stroke="var(--state-settled)"
        strokeWidth="2"
        fill="var(--state-settled)"
        fillOpacity="0.18"
      />
      <path
        d="M30 74 H66"
        stroke="white"
        strokeOpacity="0.15"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Wrapped gift — rewards land here. */
export function GiftIllustration(props: IllustrationProps) {
  return (
    <svg {...base(props)}>
      <rect
        x="24"
        y="40"
        width="48"
        height="34"
        rx="4"
        stroke="var(--state-selected)"
        strokeWidth="2"
        fill="var(--state-selected)"
        fillOpacity="0.08"
      />
      <rect
        x="20"
        y="30"
        width="56"
        height="12"
        rx="3"
        stroke="var(--state-selected)"
        strokeWidth="2"
        fill="var(--state-selected)"
        fillOpacity="0.15"
      />
      <path d="M48 30 V74" stroke="var(--state-selected)" strokeWidth="2" />
      <path
        d="M48 30 C40 30 34 24 38 19 C42 15 48 20 48 30 Z"
        stroke="var(--state-selected)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M48 30 C56 30 62 24 58 19 C54 15 48 20 48 30 Z"
        stroke="var(--state-selected)"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

/** Shield with check — nothing slashed, protocol holding. */
export function ShieldIllustration(props: IllustrationProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M48 18 L72 27 V47 C72 61 62 70 48 77 C34 70 24 61 24 47 V27 Z"
        stroke="var(--state-committed)"
        strokeWidth="2"
        fill="var(--state-committed)"
        fillOpacity="0.1"
        strokeLinejoin="round"
      />
      <path
        d="M38 48 L45 55 L59 40"
        stroke="var(--state-settled)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Quiet inbox — no notifications yet. */
export function InboxIllustration(props: IllustrationProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M24 52 L32 30 H64 L72 52 V68 A4 4 0 0 1 68 72 H28 A4 4 0 0 1 24 68 Z"
        stroke="var(--state-revealed)"
        strokeWidth="2"
        fill="var(--state-revealed)"
        fillOpacity="0.08"
        strokeLinejoin="round"
      />
      <path
        d="M24 52 H38 C38 57 42 60 48 60 C54 60 58 57 58 52 H72"
        stroke="var(--state-revealed)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="66" cy="26" r="5" fill="var(--state-revealed)" fillOpacity="0.5" />
    </svg>
  );
}
