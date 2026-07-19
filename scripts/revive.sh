#!/bin/sh
set -eu
umask 077

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
env_file="$repo_dir/.env"
bitcoin_data=
prune_mib=100000
miner_address=

usage() {
  cat <<'EOF'
Usage:
  ./scripts/revive.sh --bitcoin-data /absolute/path [options]

Options:
  --prune-mib N          Bitcoin block target in MiB (default: 100000)
  --miner-address ADDR   Explicitly enable the lottery miner for this payout address
  -h, --help             Show this help

The target filesystem must already exist or be mounted. This script never
partitions or formats a disk and never creates a wallet.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --bitcoin-data)
      [ "$#" -ge 2 ] || { echo "--bitcoin-data requires a path" >&2; exit 64; }
      bitcoin_data=$2
      shift 2
      ;;
    --prune-mib)
      [ "$#" -ge 2 ] || { echo "--prune-mib requires a number" >&2; exit 64; }
      prune_mib=$2
      shift 2
      ;;
    --miner-address)
      [ "$#" -ge 2 ] || { echo "--miner-address requires an address" >&2; exit 64; }
      miner_address=$2
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 64
      ;;
  esac
done

[ -n "$bitcoin_data" ] || { echo "--bitcoin-data is required" >&2; usage >&2; exit 64; }
case "$bitcoin_data" in
  /*) ;;
  *) echo "--bitcoin-data must be an absolute path" >&2; exit 64 ;;
esac
case "$bitcoin_data" in
  /|/boot|/etc|/home|/mnt|/opt|/root|/srv|/usr|/var)
    echo "Refusing broad system path: $bitcoin_data" >&2
    exit 64
    ;;
esac
case "$bitcoin_data" in
  *[!A-Za-z0-9_./-]*)
    echo "--bitcoin-data contains unsupported characters" >&2
    exit 64
    ;;
esac
case "$prune_mib" in *[!0-9]*|'') echo "--prune-mib must be numeric" >&2; exit 64 ;; esac
[ "$prune_mib" -ge 550 ] || { echo "--prune-mib must be at least 550" >&2; exit 64; }

if [ -n "$miner_address" ]; then
  case "$miner_address" in bc1*|1*|3*) ;; *) echo "Invalid Bitcoin mainnet payout address" >&2; exit 64 ;; esac
  case "$miner_address" in *[!A-Za-z0-9]*) echo "Payout address contains unsupported characters" >&2; exit 64 ;; esac
fi

command -v docker >/dev/null 2>&1 || {
  echo "Docker Engine is required. Install it from your distribution packages first." >&2
  exit 69
}
docker compose version >/dev/null 2>&1 || {
  echo "Docker Compose v2 is required (the 'docker compose' command)." >&2
  exit 69
}

if [ ! -d "$bitcoin_data" ]; then
  mkdir -p "$bitcoin_data" || {
    echo "Cannot create $bitcoin_data; mount the data disk and fix its permissions first." >&2
    exit 73
  }
fi

available_kib=$(df -Pk "$bitcoin_data" | awk 'NR == 2 { print $4 }')
if [ -d "$bitcoin_data/blocks" ] && [ -d "$bitcoin_data/chainstate" ]; then
  # An archive datadir can be larger than the requested target. Core deletes
  # old block files before downloading more, so only an operating margin is
  # required for the conversion itself.
  required_kib=$((1024 * 1024))
else
  required_kib=$((prune_mib * 1024 + 15 * 1024 * 1024))
fi
if [ -n "$available_kib" ] && [ "$available_kib" -lt "$required_kib" ]; then
  echo "Not enough free space to prepare prune=${prune_mib} MiB safely." >&2
  exit 73
fi

set_env() {
  key=$1
  value=$2
  temporary="$env_file.$$.tmp"
  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    $0 ~ "^" key "=" { print key "=" value; found = 1; next }
    { print }
    END { if (!found) print key "=" value }
  ' "$env_file" > "$temporary"
  chmod 0600 "$temporary"
  mv "$temporary" "$env_file"
}

cd "$repo_dir"
./scripts/bootstrap.sh
set_env BITCOIN_DATA_PATH "$bitcoin_data"
set_env BITCOIN_PRUNE_MIB "$prune_mib"

docker compose config --quiet
docker compose up -d --build
docker compose --profile miner build lottery-miner

if [ -n "$miner_address" ]; then
  ./scripts/configure-miner.sh "$miner_address"
  docker compose --profile miner up -d --no-deps lottery-miner
fi

docker compose ps
echo
echo "NOD-I Revival started. Open http://DEVICE_IP:8080."
if [ -z "$miner_address" ]; then
  echo "No miner activation was requested. Enable it explicitly with:"
  echo "  ./scripts/configure-miner.sh <bitcoin-address>"
  echo "  docker compose --profile miner up -d lottery-miner"
fi
