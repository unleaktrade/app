#!/usr/bin/env bash
set -euo pipefail

# Convenience helper for bringing up the settlement-engine on a local validator
# so the app (with VITE_SOLANA_CLUSTER=localnet) can read Config end-to-end.
# Requires anchor + solana-cli (+ yarn, with `yarn install` done in the sibling
# repo) and the settlement-engine repo checked out next to this one.
#
# The validator runs in the background (`anchor localnet` has no detach mode
# and blocks); its pid + log live next to its ledger under
# ../settlement-engine/.anchor/. Re-running the script restarts the validator
# on the same ledger, so Config and any local USDC mint survive; RESET=1 wipes
# it (then create a new mint: init_config does not check that the mint exists).
#
# Config is initialised too when both values are provided (idempotent):
#   LIQUIDITY_GUARD=<guard /health service_pubkey> USDC_MINT=<local mint> \
#     bash scripts/dev-localnet.sh

ENGINE_DIR=../settlement-engine
RPC_URL=http://127.0.0.1:8899
ANCHOR_WALLET=${ANCHOR_WALLET:-$HOME/.config/solana/id.json}

if [ ! -d "$ENGINE_DIR" ]; then
  echo "$ENGINE_DIR not found — check out the settlement-engine repo next to this one" >&2
  exit 1
fi

pushd "$ENGINE_DIR" > /dev/null

LEDGER_DIR=$PWD/.anchor/dev-localnet-ledger
PID_FILE=$PWD/.anchor/dev-localnet.pid
LOG_FILE=$PWD/.anchor/dev-localnet.log
mkdir -p .anchor

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2> /dev/null; then
  echo "Stopping the previous dev-localnet validator…"
  kill "$(cat "$PID_FILE")"
  while kill -0 "$(cat "$PID_FILE")" 2> /dev/null; do sleep 0.5; done
fi
if solana cluster-version -u "$RPC_URL" > /dev/null 2>&1; then
  echo "Something else already serves $RPC_URL — stop it first (e.g. a foreground solana-test-validator)." >&2
  exit 1
fi

VALIDATOR_ARGS="--quiet"
if [ "${RESET:-0}" = "1" ]; then VALIDATOR_ARGS="--reset --quiet"; fi

echo "Starting solana-test-validator in the background (log: $LOG_FILE)…"
# shellcheck disable=SC2086 # VALIDATOR_ARGS is a flag list, split on purpose
nohup solana-test-validator $VALIDATOR_ARGS --ledger "$LEDGER_DIR" > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

echo "Waiting for validator…"
for _ in $(seq 1 60); do
  if solana cluster-version -u "$RPC_URL" > /dev/null 2>&1; then break; fi
  if ! kill -0 "$(cat "$PID_FILE")" 2> /dev/null; then
    echo "Validator exited early — see $LOG_FILE" >&2
    exit 1
  fi
  sleep 1
done
solana cluster-version -u "$RPC_URL" > /dev/null

solana airdrop 10 "$(solana address -k "$ANCHOR_WALLET")" -u "$RPC_URL" > /dev/null

echo "Building + deploying program…"
anchor build
anchor deploy --provider.cluster localnet --provider.wallet "$ANCHOR_WALLET"

if [ -n "${LIQUIDITY_GUARD:-}" ] && [ -n "${USDC_MINT:-}" ]; then
  echo "Initialising Config (no-op if it already exists)…"
  ANCHOR_PROVIDER_URL=$RPC_URL ANCHOR_WALLET=$ANCHOR_WALLET yarn init-config
  CONFIG_HINT=""
else
  # init-config-devnet.ts defaults USDC_MINT to the devnet mint, which does not
  # exist on a fresh local validator, so both values are spelled out.
  CONFIG_HINT=$(
    cat << EOF
Config is not initialised (npm run seed aborts without it). From $ENGINE_DIR:
  spl-token create-token --decimals 6 -u localhost   # local USDC mint, if you have none
  ANCHOR_PROVIDER_URL=localnet ANCHOR_WALLET=$ANCHOR_WALLET \\
    LIQUIDITY_GUARD=<guard /health service_pubkey> USDC_MINT=<local USDC mint> \\
    yarn init-config
or re-run this script with LIQUIDITY_GUARD and USDC_MINT set.
EOF
  )
fi

popd > /dev/null

echo ""
echo "Localnet up. Set VITE_SOLANA_CLUSTER=localnet in .env.local and run 'npm run dev'."
echo "Stop the validator with: kill \$(cat $PID_FILE)"
if [ -n "$CONFIG_HINT" ]; then
  echo ""
  echo "$CONFIG_HINT"
fi
