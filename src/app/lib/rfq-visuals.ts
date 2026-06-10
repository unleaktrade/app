// Visual config for the 9 RFQ lifecycle states — extracted from
// src/data/mock.ts so it survives the Phase 3–5 mock-data removal.
// Copy stays role-neutral (no maker/taker/facilitator wording).

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

export function getCardGradient(status: RFQState): string {
  return CARD_GRADIENTS[status];
}

export function getCardBorder(status: RFQState): string {
  return CARD_BORDERS[status];
}

export function getCardGlow(status: RFQState): string {
  return CARD_GLOWS[status];
}
