// Shared shapes for the RFQ wizard (RFQForm.tsx + the rfq-form/ step files).
// `RFQFormValues` is re-exported from RFQForm.tsx so the modals keep importing
// it from there.

import type { Token } from "@/app/components/TokenSelector";

export interface RFQFormValues {
  baseToken: Token | null;
  quoteToken: Token | null;
  baseAmount: string;
  minQuoteAmount: string;
  bondAmount: string;
  takerFeeBps: string;
  commitTtlSecs: string;
  revealTtlSecs: string;
  selectionTtlSecs: string;
  fundTtlSecs: string;
  facilitatorAddress: string;
}

export type RFQFormMode = "create" | "update";

export type FormStep = "tokens" | "economics" | "timing" | "review";

export type TtlField = "commitTtlSecs" | "revealTtlSecs" | "selectionTtlSecs" | "fundTtlSecs";

/** Props every step layout receives from the wizard's step machine. */
export interface StepProps {
  mode: RFQFormMode;
  values: RFQFormValues;
  set: <K extends keyof RFQFormValues>(key: K, value: RFQFormValues[K]) => void;
  isLocked: (field: keyof RFQFormValues) => boolean;
}
