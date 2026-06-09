#!/usr/bin/env bash
set -euo pipefail

# Copy the settlement-engine IDL + generated TS types into src/chain/idl/.
# Run after `anchor build` in the sibling settlement-engine repo.

SRC_JSON=../settlement-engine/target/idl/settlement_engine.json
SRC_TS=../settlement-engine/target/types/settlement_engine.ts
DEST=src/chain/idl

if [ ! -f "$SRC_JSON" ] || [ ! -f "$SRC_TS" ]; then
  echo "IDL missing — run 'anchor build' in ../settlement-engine first" >&2
  echo "Expected: $SRC_JSON" >&2
  echo "Expected: $SRC_TS" >&2
  exit 1
fi

mkdir -p "$DEST"
cp "$SRC_JSON" "$DEST/"
cp "$SRC_TS" "$DEST/"
echo "Copied IDL + types into $DEST/"
