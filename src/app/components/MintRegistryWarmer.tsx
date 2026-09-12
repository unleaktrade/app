import { useMemo } from "react";
import { useRfqAccounts } from "@/chain/accounts/lists";
import { useMintRegistryWarmup } from "@/app/hooks/useMintRegistryWarmup";

/**
 * Mounted once inside the authenticated dashboard tree. Reads the mints of
 * every loaded RFQ (the list query is already shared with the marketplace and
 * the notification inbox, so this adds no getProgramAccounts call) and warms
 * the mint registry so amounts render with real decimals everywhere.
 */
export function MintRegistryWarmer() {
  const rfqs = useRfqAccounts();
  const mints = useMemo(
    () =>
      (rfqs.data ?? []).flatMap((row) => [
        row.account.baseMint.toBase58(),
        row.account.quoteMint.toBase58(),
        row.account.usdcMint.toBase58(),
      ]),
    [rfqs.data],
  );
  useMintRegistryWarmup(mints);
  return null;
}
