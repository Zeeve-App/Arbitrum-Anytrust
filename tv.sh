#!/bin/bash
UPGRADE_EXECUTOR_ADDRESS=0xB540a6C687ea2B87888c4bE3732C0210DAE469A1
SEQUENCER_INBOX_ADDRESS=0x48345C733c7Cae57ab762C17b8d6B643C717a189
PARENT_CHAIN_RPC=https://bepolia.rpc.berachain.com
OWNER_PRIVATE_KEY=Redacted

# Encode the function call data for "setValidKeyset(bytes)"
echo "Encoding function call data for setValidKeyset..."
# function_call_data=$(cast calldata "setValidKeyset(bytes)" "$keyset")
function_call_data=$(cast calldata "setMaxTimeVariation(uint256,uint256,uint256,uint256)" 34000 100 86400 3600)
echo "Encoded function call data: $function_call_data"
# ========= Execute Upgrade Transaction =========
echo "Sending upgrade transaction..."
cast send "$UPGRADE_EXECUTOR_ADDRESS" \
  "executeCall(address,bytes)" \
  "$SEQUENCER_INBOX_ADDRESS" "$function_call_data" \
  --rpc-url "$PARENT_CHAIN_RPC" \
  --private-key "$OWNER_PRIVATE_KEY" \
