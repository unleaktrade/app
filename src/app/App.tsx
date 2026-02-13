import { RouterProvider } from "react-router";
import { router } from "@/app/routes";

export type RFQState = "Draft" | "Open" | "Committed" | "Revealed" | "Selected" | "Settled" | "Ignored" | "Expired" | "Incomplete";

// Keep legacy RFQ interface for compatibility
export interface RFQ {
  id: string;
  pair: string;
  baseMint?: string;
  quoteMint?: string;
  baseAmount: number;
  quoteAmount: number;
  price: number;
  status: RFQState;
  state: RFQState;
  expires: string | null;
  maker?: string;
  taker?: string;
  facilitator?: string;
  bondAmount?: number;
  takerFee?: number;
  commitTtl?: number;
  revealTtl?: number;
  selectionTtl?: number;
  fundTtl?: number;
  createdAt?: string | number;
}

export type UserRole = "maker" | "taker" | "facilitator";

function App() {
  return <RouterProvider router={router} />;
}

export default App;
