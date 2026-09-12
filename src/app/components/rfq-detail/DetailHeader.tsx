import { Coins } from "lucide-react";
import type { RFQ } from "@/types/rfq";
import { StatusBadge } from "@/app/components/StatusBadge";
import { RFQStatePipeline } from "@/app/components/RFQStatePipeline";
import { AddressDisplay } from "@/app/components/AddressDisplay";
import { ShareRfqButton } from "@/app/components/ShareRfqButton";
import type { RfqAccount } from "@/chain/accounts/rfq";
import { truncateAddress } from "@/app/lib/format";
import { Metric } from "@/app/components/rfq-detail/Metric";

export function DetailHeader({ rfq, account }: { rfq: RFQ; account: RfqAccount }) {
  const [base = rfq.baseMint, quote = rfq.quoteMint] = rfq.pair.split("/");
  const usdcSymbol = "USDC";

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs text-white/40 font-mono mb-1">RFQ</div>
          <div className="mb-3">
            <AddressDisplay address={rfq.publicKey} />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <Coins className="h-5 w-5 text-cyan-400" />
            <span className="text-2xl font-bold text-white">{rfq.pair}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <span>Posted by</span>
            <AddressDisplay address={account.maker.toBase58()} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShareRfqButton rfqPda={rfq.publicKey} state={rfq.state} />
          <StatusBadge status={rfq.state} />
        </div>
      </div>

      <RFQStatePipeline state={rfq.state} className="mb-4" />

      <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10 sm:grid-cols-4">
        <Metric label="Base amount" value={rfq.baseAmount.toLocaleString()} unit={base} />
        <Metric label="Target quote" value={rfq.minQuoteAmount.toLocaleString()} unit={quote} />
        <Metric label="Bond per side" value={rfq.bondAmount.toLocaleString()} unit={usdcSymbol} />
        <Metric
          label={rfq.expiresIn ? "Expires in" : "Status"}
          value={rfq.expiresIn ?? rfq.state}
          unit={
            rfq.facilitator ? `reward → ${truncateAddress(rfq.facilitator)}` : "no reward recipient"
          }
        />
      </div>
    </div>
  );
}
