// Visual config for the 9 RFQ lifecycle states. Kept separate from the data
// layer so the screens depend only on decoded on-chain state (the mock data
// module was removed in Phase 2b). Copy stays role-neutral (no
// maker/taker/facilitator wording).

import type { RFQState } from "@/types/rfq";

export interface StatusConfig {
  color: string;
  bgColor: string;
  label: string;
  description: string;
}

const STATUS_CONFIG: Record<RFQState, StatusConfig> = {
  Draft: {
    color: "text-state-draft",
    bgColor: "bg-state-draft/20",
    label: "Draft",
    description:
      "Initial state while the request is being configured. Parameters can still be edited before opening.",
  },
  Open: {
    color: "text-state-open",
    bgColor: "bg-state-open/20",
    label: "Open",
    description:
      "RFQ is open and accepting commitments. Cryptographic proof commitments can now be submitted.",
  },
  Committed: {
    color: "text-state-committed",
    bgColor: "bg-state-committed/20",
    label: "Committed",
    description:
      "At least one commitment has been received. Committed quotes must now be revealed during the reveal window.",
  },
  Revealed: {
    color: "text-state-revealed",
    bgColor: "bg-state-revealed/20",
    label: "Revealed",
    description:
      "At least one quote has been revealed. The best quote can now be reviewed and selected.",
  },
  Selected: {
    color: "text-state-selected",
    bgColor: "bg-state-selected/20",
    label: "Selected",
    description:
      "A quote has been selected and settlement initiated. The escrow must now be funded to complete the trade.",
  },
  Settled: {
    color: "text-state-settled",
    bgColor: "bg-state-settled/20",
    label: "Settled",
    description:
      "Settlement completed successfully! The escrow was funded and the trade has been executed.",
  },
  Ignored: {
    color: "text-state-ignored",
    bgColor: "bg-state-ignored/20",
    label: "Ignored",
    description:
      "No valid quote was selected within the selection window. The RFQ lapsed without settlement.",
  },
  Expired: {
    color: "text-state-expired",
    bgColor: "bg-state-expired/20",
    label: "Expired",
    description:
      "RFQ expired without receiving any valid commitments or reveals. No one participated in time.",
  },
  Incomplete: {
    color: "text-state-incomplete",
    bgColor: "bg-state-incomplete-deep/20",
    label: "Incomplete",
    description:
      "The escrow was not funded in time after selection. The trade failed to complete and bonds may be slashed.",
  },
};

export function getStatusConfig(status: RFQState): StatusConfig {
  return STATUS_CONFIG[status];
}

const CARD_GRADIENTS: Record<RFQState, string> = {
  Draft: "bg-gradient-to-br from-state-draft/10 via-state-draft-deep/5 to-white/[0.02]",
  Open: "bg-gradient-to-br from-state-open/15 via-state-open-deep/8 to-white/[0.02]",
  Committed: "bg-gradient-to-br from-state-committed/15 via-state-committed-deep/8 to-white/[0.02]",
  Revealed: "bg-gradient-to-br from-state-revealed/15 via-state-revealed-deep/8 to-white/[0.02]",
  Selected: "bg-gradient-to-br from-state-selected/15 via-state-selected-deep/8 to-white/[0.02]",
  Settled: "bg-gradient-to-br from-state-settled/15 via-state-settled-deep/8 to-white/[0.02]",
  Ignored: "bg-gradient-to-br from-state-ignored/15 via-state-ignored-deep/8 to-white/[0.02]",
  Expired: "bg-gradient-to-br from-state-expired/15 via-state-expired-deep/8 to-white/[0.02]",
  Incomplete:
    "bg-gradient-to-br from-state-incomplete/15 via-state-incomplete-deep/8 to-white/[0.02]",
};

const CARD_BORDERS: Record<RFQState, string> = {
  Draft: "border-state-draft/20 hover:border-state-draft/40",
  Open: "border-state-open/20 hover:border-state-open/40",
  Committed: "border-state-committed/20 hover:border-state-committed/40",
  Revealed: "border-state-revealed/20 hover:border-state-revealed/40",
  Selected: "border-state-selected/20 hover:border-state-selected/40",
  Settled: "border-state-settled/20 hover:border-state-settled/40",
  Ignored: "border-state-ignored/20 hover:border-state-ignored/40",
  Expired: "border-state-expired/20 hover:border-state-expired/40",
  Incomplete: "border-state-incomplete/20 hover:border-state-incomplete/40",
};

const CARD_GLOWS: Record<RFQState, string> = {
  Draft:
    "from-state-draft/0 to-state-draft-deep/0 group-hover:from-state-draft/5 group-hover:to-state-draft-deep/10",
  Open: "from-state-open/0 to-state-open-deep/0 group-hover:from-state-open/5 group-hover:to-state-open-deep/10",
  Committed:
    "from-state-committed/0 to-state-committed-deep/0 group-hover:from-state-committed/5 group-hover:to-state-committed-deep/10",
  Revealed:
    "from-state-revealed/0 to-state-revealed-deep/0 group-hover:from-state-revealed/5 group-hover:to-state-revealed-deep/10",
  Selected:
    "from-state-selected/0 to-state-selected-deep/0 group-hover:from-state-selected/5 group-hover:to-state-selected-deep/10",
  Settled:
    "from-state-settled/0 to-state-settled-deep/0 group-hover:from-state-settled/5 group-hover:to-state-settled-deep/10",
  Ignored:
    "from-state-ignored/0 to-state-ignored-deep/0 group-hover:from-state-ignored/5 group-hover:to-state-ignored-deep/10",
  Expired:
    "from-state-expired/0 to-state-expired-deep/0 group-hover:from-state-expired/5 group-hover:to-state-expired-deep/10",
  Incomplete:
    "from-state-incomplete/0 to-state-incomplete-deep/0 group-hover:from-state-incomplete/5 group-hover:to-state-incomplete-deep/10",
};

// Per-state styling for the Marketplace grouped/swimlane section headers.
const SECTION_GRADIENTS: Record<RFQState, string> = {
  Draft: "from-state-draft/10 to-state-draft-deep/5",
  Open: "from-state-open/10 to-state-open-deep/5",
  Committed: "from-state-committed/10 to-state-committed-deep/5",
  Revealed: "from-state-revealed/10 to-state-revealed-deep/5",
  Selected: "from-state-selected/10 to-state-selected-deep/5",
  Settled: "from-state-settled/10 to-state-settled-deep/5",
  Expired: "from-state-expired/10 to-state-expired-deep/5",
  Ignored: "from-state-ignored/10 to-state-ignored-deep/5",
  Incomplete: "from-state-incomplete/10 to-state-incomplete-deep/5",
};

const STATE_TITLE_COLORS: Record<RFQState, string> = {
  Draft: "text-state-draft",
  Open: "text-state-open",
  Committed: "text-state-committed",
  Revealed: "text-state-revealed",
  Selected: "text-state-selected",
  Settled: "text-state-settled",
  Expired: "text-state-expired",
  Ignored: "text-state-ignored",
  Incomplete: "text-state-incomplete",
};

const STATE_SUBTITLES: Record<RFQState, string> = {
  Draft: "Complete and open these RFQs",
  Open: "Ready to quote",
  Committed: "Awaiting reveals",
  Revealed: "Review quotes",
  Selected: "Waiting for settlement",
  Settled: "Completed trades",
  Expired: "Time expired",
  Ignored: "Not pursued",
  Incomplete: "Missing information",
};

export function getStateSectionGradient(state: RFQState): string {
  return SECTION_GRADIENTS[state];
}

export function getStateTitleColor(state: RFQState): string {
  return STATE_TITLE_COLORS[state];
}

export function getStateSubtitle(state: RFQState): string {
  return STATE_SUBTITLES[state];
}

export interface OwnedHighlight {
  border: string;
  badge: string;
  triangle: string;
}

// Highlight styling ("MY RFQ" ribbon + border) for RFQs owned by the
// connected wallet, keyed by state.
const OWNED_HIGHLIGHTS: Record<RFQState, OwnedHighlight> = {
  Draft: {
    border: "border-state-draft/70 shadow-lg shadow-state-draft/25",
    badge: "glass-panel border-state-draft/40 text-state-draft",
    triangle: "border-t-black/60",
  },
  Open: {
    border: "border-state-open/70 shadow-lg shadow-state-open/25",
    badge: "glass-panel border-state-open/40 text-state-open",
    triangle: "border-t-black/60",
  },
  Committed: {
    border: "border-state-committed/70 shadow-lg shadow-state-committed/25",
    badge: "glass-panel border-state-committed/40 text-state-committed",
    triangle: "border-t-black/60",
  },
  Revealed: {
    border: "border-state-revealed/70 shadow-lg shadow-state-revealed/25",
    badge: "glass-panel border-state-revealed/40 text-state-revealed",
    triangle: "border-t-black/60",
  },
  Selected: {
    border: "border-state-selected/70 shadow-lg shadow-state-selected/25",
    badge: "glass-panel border-state-selected/40 text-state-selected",
    triangle: "border-t-black/60",
  },
  Settled: {
    border: "border-state-settled/70 shadow-lg shadow-state-settled/25",
    badge: "glass-panel border-state-settled/40 text-state-settled",
    triangle: "border-t-black/60",
  },
  Expired: {
    border: "border-state-expired/70 shadow-lg shadow-state-expired/25",
    badge: "glass-panel border-state-expired/40 text-state-expired",
    triangle: "border-t-black/60",
  },
  Ignored: {
    border: "border-state-ignored/70 shadow-lg shadow-state-ignored/25",
    badge: "glass-panel border-state-ignored/40 text-state-ignored",
    triangle: "border-t-black/60",
  },
  Incomplete: {
    border: "border-state-incomplete/70 shadow-lg shadow-state-incomplete/25",
    badge: "glass-panel border-state-incomplete/40 text-state-incomplete",
    triangle: "border-t-black/60",
  },
};

export function getOwnedHighlight(state: RFQState): OwnedHighlight {
  return OWNED_HIGHLIGHTS[state];
}

export function getCardGradient(status: RFQState): string {
  return CARD_GRADIENTS[status];
}

export function getCardBorder(status: RFQState): string {
  return CARD_BORDERS[status];
}

export function getCardGlow(status: RFQState): string {
  return CARD_GLOWS[status];
}
