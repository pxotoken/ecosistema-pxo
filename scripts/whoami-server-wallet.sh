#!/usr/bin/env bash
# Print ONLY the address derived from the server wallet key, never the key.
#
# Answers the SL-001 question: is POLYGON_PXO_RECEIVER_ADDRESS
# (0x9f0f2EAc50AD04D37D3Bf3359735928126aC8382) the same wallet the backend
# signs with? If yes, we control it and the "unknown third party" reading is
# wrong. If no, user PXO is landing somewhere the app cannot spend from.
#
# Usage:
#   railway variable list -s @pxo/api-exchange -e prod -p <project> --kv \
#     | grep '^WALLET_PRIVATE_KEY=' | cut -d= -f2- | scripts/whoami-server-wallet.sh
# or:
#   WALLET_PRIVATE_KEY=0x... scripts/whoami-server-wallet.sh
#
# The key is read from stdin or the environment, used in-process, and never
# printed or written anywhere.

set -euo pipefail
KEY="${WALLET_PRIVATE_KEY:-}"
if [ -z "$KEY" ] && [ ! -t 0 ]; then KEY="$(cat)"; fi
KEY="$(printf '%s' "$KEY" | tr -d '[:space:]')"
[ -n "$KEY" ] || { echo "No key on stdin or in WALLET_PRIVATE_KEY." >&2; exit 1; }

RECEIVER="0x9f0f2eac50ad04d37d3bf3359735928126ac8382"

__K="$KEY" __R="$RECEIVER" node --input-type=module -e '
import { privateKeyToAccount } from "viem/accounts";
const raw = process.env.__K.startsWith("0x") ? process.env.__K : "0x" + process.env.__K;
let addr;
try { addr = privateKeyToAccount(raw).address; }
catch (e) { console.error("Could not derive an address — is this a raw private key?"); process.exit(1); }
const recv = process.env.__R;
console.log("server wallet : " + addr);
console.log("receiver      : " + recv);
console.log(addr.toLowerCase() === recv.toLowerCase()
  ? "\nSAME ADDRESS. The backend controls the receiver — SL-001 downgrades to\n\"undocumented but ours\": set the env var explicitly and drop the hardcoded\nfallback, but no funds were ever out of reach."
  : "\nDIFFERENT ADDRESSES. User PXO goes to the receiver, which the backend\ncannot spend from. Establish who holds that key before beta.");
' || { echo "Failed — run this from the repo root, where viem is installed." >&2; exit 1; }
