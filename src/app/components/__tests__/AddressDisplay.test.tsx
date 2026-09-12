// AddressDisplay must follow the app-wide cluster from ClusterProvider — it
// used to call the raw cluster hook and fork its own copy, so a cluster switch
// left already-mounted addresses linking to the old explorer.

import { beforeEach, describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ClusterProvider, useCluster } from "@/app/providers/ClusterProvider";
import { AddressDisplay } from "../AddressDisplay";

const ADDRESS = "7wrjbU1NbVtUCUGP1obi3aiT6QrjXZnH5XJDXMsKtkPG";

function Switcher() {
  const { setCluster } = useCluster();
  return (
    <button type="button" onClick={() => setCluster("mainnet-beta")}>
      switch
    </button>
  );
}

function renderWithProviders(ui: ReactElement) {
  return render(
    <MemoryRouter>
      <ClusterProvider>
        {ui}
        <Switcher />
      </ClusterProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.setItem("unleak.cluster", "devnet");
});

describe("AddressDisplay", () => {
  it("links to the explorer for the provider's cluster and follows a switch", () => {
    renderWithProviders(<AddressDisplay address={ADDRESS} />);
    const link = screen.getByRole("link", { name: "View on Solscan" });
    expect(link).toHaveAttribute("href", expect.stringContaining("?cluster=devnet"));

    fireEvent.click(screen.getByRole("button", { name: "switch" }));

    expect(screen.getByRole("link", { name: "View on Solscan" })).toHaveAttribute(
      "href",
      `https://solscan.io/account/${ADDRESS}`,
    );
  });

  it("does not expose a bypassable cluster hook from src/chain/cluster", async () => {
    const mod: Record<string, unknown> = await import("@/chain/cluster");
    expect("useClusterState" in mod).toBe(false);
  });
});
