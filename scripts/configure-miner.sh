#!/bin/sh
set -eu

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
env_file="$repo_dir/.env"

if [ "$#" -ne 1 ]; then
  echo "Usage: ./scripts/configure-miner.sh <bitcoin-address>" >&2
  exit 64
fi

address=$1
case "$address" in
  bc1*|1*|3*) ;;
  *) echo "Address must look like a Bitcoin mainnet address" >&2; exit 64 ;;
esac

if [ ! -f "$env_file" ]; then
  echo "Run ./scripts/bootstrap.sh first" >&2
  exit 1
fi

temporary="$env_file.$$.tmp"
awk -v address="$address" '
  /^MINER_ENABLED=/ { print "MINER_ENABLED=true"; next }
  /^MINER_ADDRESS=/ { print "MINER_ADDRESS=" address; next }
  { print }
' "$env_file" > "$temporary"
chmod 0600 "$temporary"
mv "$temporary" "$env_file"
echo "Miner configuration updated. Start it explicitly with: docker compose --profile miner up -d lottery-miner"
