#!/usr/bin/env bash
set -euo pipefail

# Convenience helper for bringing up the settlement-engine on a local validator
# so the app (with VITE_SOLANA_CLUSTER=localnet) can read Config end-to-end.
# Requires anchor + solana-cli installed and the sibling repo checked out.

ENGINE_DIR=../settlement-engine
if [ ! -d "$ENGINE_DIR" ]; then
  echo "$ENGINE_DIR not found — check out the settlement-engine repo next to this one" >&2
  exit 1
fi

pushd "$ENGINE_DIR" > /dev/null

echo "Starting anchor localnet (detached)…"
anchor localnet --detach

echo "Waiting for validator…"
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if solana cluster-version -u http://localhost:8899 > /dev/null 2>&1; then break; fi
  sleep 1
done

solana airdrop 10 "$(solana address)" -u http://localhost:8899 || true

echo "Building + deploying program…"
anchor build
anchor deploy --provider.cluster localnet

popd > /dev/null

echo ""
echo "Localnet up. Set VITE_SOLANA_CLUSTER=localnet in .env.local and run 'npm run dev'."
echo "If Config isn't initialised yet, run 'anchor run init-config' in $ENGINE_DIR."
