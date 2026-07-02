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
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
    label: "Draft",
    description:
      "Initial state while the request is being configured. Parameters can still be edited before opening.",
  },
  Open: {
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    label: "Open",
    description:
      "RFQ is open and accepting commitments. Cryptographic proof commitments can now be submitted.",
  },
  Committed: {
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    label: "Committed",
    description:
      "At least one commitment has been received. Committed quotes must now be revealed during the reveal window.",
  },
  Revealed: {
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/20",
    label: "Revealed",
    description:
      "At least one quote has been revealed. The best quote can now be reviewed and selected.",
  },
  Selected: {
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    label: "Selected",
    description:
      "A quote has been selected and settlement initiated. The escrow must now be funded to complete the trade.",
  },
  Settled: {
    color: "text-teal-400",
    bgColor: "bg-teal-500/20",
    label: "Settled",
    description:
      "Settlement completed successfully! The escrow was funded and the trade has been executed.",
  },
  Ignored: {
    color: "text-gray-400",
    bgColor: "bg-gray-500/20",
    label: "Ignored",
    description:
      "No valid quote was selected within the selection window. The RFQ lapsed without settlement.",
  },
  Expired: {
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    label: "Expired",
    description:
      "RFQ expired without receiving any valid commitments or reveals. No one participated in time.",
  },
  Incomplete: {
    color: "text-red-400",
    bgColor: "bg-red-600/20",
    label: "Incomplete",
    description:
      "The escrow was not funded in time after selection. The trade failed to complete and bonds may be slashed.",
  },
};

export function getStatusConfig(status: RFQState): StatusConfig {
  return STATUS_CONFIG[status];
}

const CARD_GRADIENTS: Record<RFQState, string> = {
  Draft: "bg-gradient-to-br from-slate-500/10 via-slate-600/5 to-white/[0.02]",
  Open: "bg-gradient-to-br from-cyan-500/15 via-cyan-600/8 to-white/[0.02]",
  Committed: "bg-gradient-to-br from-purple-500/15 via-purple-600/8 to-white/[0.02]",
  Revealed: "bg-gradient-to-br from-indigo-500/15 via-indigo-600/8 to-white/[0.02]",
  Selected: "bg-gradient-to-br from-blue-500/15 via-blue-600/8 to-white/[0.02]",
  Settled: "bg-gradient-to-br from-teal-500/15 via-teal-600/8 to-white/[0.02]",
  Ignored: "bg-gradient-to-br from-gray-500/15 via-gray-600/8 to-white/[0.02]",
  Expired: "bg-gradient-to-br from-orange-500/15 via-orange-600/8 to-white/[0.02]",
  Incomplete: "bg-gradient-to-br from-red-500/15 via-red-600/8 to-white/[0.02]",
};

const CARD_BORDERS: Record<RFQState, string> = {
  Draft: "border-slate-500/20 hover:border-slate-400/40",
  Open: "border-cyan-500/20 hover:border-cyan-400/40",
  Committed: "border-purple-500/20 hover:border-purple-400/40",
  Revealed: "border-indigo-500/20 hover:border-indigo-400/40",
  Selected: "border-blue-500/20 hover:border-blue-400/40",
  Settled: "border-teal-500/20 hover:border-teal-400/40",
  Ignored: "border-gray-500/20 hover:border-gray-400/40",
  Expired: "border-orange-500/20 hover:border-orange-400/40",
  Incomplete: "border-red-500/20 hover:border-red-400/40",
};

const CARD_GLOWS: Record<RFQState, string> = {
  Draft: "from-slate-500/0 to-slate-600/0 group-hover:from-slate-500/5 group-hover:to-slate-600/10",
  Open: "from-cyan-500/0 to-cyan-600/0 group-hover:from-cyan-500/5 group-hover:to-cyan-600/10",
  Committed:
    "from-purple-500/0 to-purple-600/0 group-hover:from-purple-500/5 group-hover:to-purple-600/10",
  Revealed:
    "from-indigo-500/0 to-indigo-600/0 group-hover:from-indigo-500/5 group-hover:to-indigo-600/10",
  Selected: "from-blue-500/0 to-blue-600/0 group-hover:from-blue-500/5 group-hover:to-blue-600/10",
  Settled: "from-teal-500/0 to-teal-600/0 group-hover:from-teal-500/5 group-hover:to-teal-600/10",
  Ignored: "from-gray-500/0 to-gray-600/0 group-hover:from-gray-500/5 group-hover:to-gray-600/10",
  Expired:
    "from-orange-500/0 to-orange-600/0 group-hover:from-orange-500/5 group-hover:to-orange-600/10",
  Incomplete: "from-red-500/0 to-red-600/0 group-hover:from-red-500/5 group-hover:to-red-600/10",
};

// Per-state styling for the Marketplace grouped/swimlane section headers.
const SECTION_GRADIENTS: Record<RFQState, string> = {
  Draft: "from-slate-500/10 to-slate-600/5",
  Open: "from-cyan-500/10 to-cyan-600/5",
  Committed: "from-purple-500/10 to-purple-600/5",
  Revealed: "from-indigo-500/10 to-indigo-600/5",
  Selected: "from-blue-500/10 to-blue-600/5",
  Settled: "from-teal-500/10 to-teal-600/5",
  Expired: "from-orange-500/10 to-orange-600/5",
  Ignored: "from-gray-500/10 to-gray-600/5",
  Incomplete: "from-red-500/10 to-red-600/5",
};

const STATE_TITLE_COLORS: Record<RFQState, string> = {
  Draft: "text-slate-400",
  Open: "text-cyan-400",
  Committed: "text-purple-400",
  Revealed: "text-indigo-400",
  Selected: "text-blue-400",
  Settled: "text-teal-400",
  Expired: "text-orange-400",
  Ignored: "text-gray-400",
  Incomplete: "text-red-400",
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
    border: "border-slate-500/70 shadow-lg shadow-slate-500/25",
    badge: "bg-gradient-to-r from-slate-500 via-slate-500 to-slate-600 border-slate-400/30",
    triangle: "border-t-slate-900",
  },
  Open: {
    border: "border-cyan-500/70 shadow-lg shadow-cyan-500/25",
    badge: "bg-gradient-to-r from-cyan-500 via-cyan-500 to-cyan-600 border-cyan-400/30",
    triangle: "border-t-cyan-900",
  },
  Committed: {
    border: "border-purple-500/70 shadow-lg shadow-purple-500/25",
    badge: "bg-gradient-to-r from-purple-500 via-purple-500 to-purple-600 border-purple-400/30",
    triangle: "border-t-purple-900",
  },
  Revealed: {
    border: "border-indigo-500/70 shadow-lg shadow-indigo-500/25",
    badge: "bg-gradient-to-r from-indigo-500 via-indigo-500 to-indigo-600 border-indigo-400/30",
    triangle: "border-t-indigo-900",
  },
  Selected: {
    border: "border-blue-500/70 shadow-lg shadow-blue-500/25",
    badge: "bg-gradient-to-r from-blue-500 via-blue-500 to-blue-600 border-blue-400/30",
    triangle: "border-t-blue-900",
  },
  Settled: {
    border: "border-teal-500/70 shadow-lg shadow-teal-500/25",
    badge: "bg-gradient-to-r from-teal-500 via-teal-500 to-teal-600 border-teal-400/30",
    triangle: "border-t-teal-900",
  },
  Expired: {
    border: "border-orange-500/70 shadow-lg shadow-orange-500/25",
    badge: "bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 border-orange-400/30",
    triangle: "border-t-orange-900",
  },
  Ignored: {
    border: "border-gray-500/70 shadow-lg shadow-gray-500/25",
    badge: "bg-gradient-to-r from-gray-500 via-gray-500 to-gray-600 border-gray-400/30",
    triangle: "border-t-gray-900",
  },
  Incomplete: {
    border: "border-red-500/70 shadow-lg shadow-red-500/25",
    badge: "bg-gradient-to-r from-red-500 via-red-500 to-red-600 border-red-400/30",
    triangle: "border-t-red-900",
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
