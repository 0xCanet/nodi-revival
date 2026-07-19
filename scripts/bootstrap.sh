#!/bin/sh
set -eu
umask 077

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
env_file="$repo_dir/.env"
example_file="$repo_dir/.env.example"

if [ -e "$env_file" ]; then
  echo ".env already exists; no file was changed."
  exit 0
fi

if [ ! -r "$example_file" ]; then
  echo "Missing .env.example" >&2
  exit 1
fi

if command -v openssl >/dev/null 2>&1; then
  rpc_password=$(openssl rand -hex 24)
else
  rpc_password=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 48)
fi

sed "s|^BITCOIN_RPC_PASSWORD=.*$|BITCOIN_RPC_PASSWORD=$rpc_password|" "$example_file" > "$env_file"
chmod 0600 "$env_file"
echo "Created .env with a random Bitcoin RPC password."
echo "Mining remains disabled. Read docs/RUNBOOK.md before enabling it."
