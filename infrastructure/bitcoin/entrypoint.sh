#!/bin/sh
set -eu

: "${BITCOIN_RPC_USER:=nodi}"
: "${BITCOIN_RPC_PASSWORD:?BITCOIN_RPC_PASSWORD is required}"
: "${BITCOIN_PRUNE_MIB:=200000}"
: "${BITCOIN_DBCACHE_MIB:=450}"

case "$BITCOIN_PRUNE_MIB" in *[!0-9]*|'') echo "BITCOIN_PRUNE_MIB must be numeric" >&2; exit 64 ;; esac
case "$BITCOIN_DBCACHE_MIB" in *[!0-9]*|'') echo "BITCOIN_DBCACHE_MIB must be numeric" >&2; exit 64 ;; esac
case "$BITCOIN_RPC_USER" in *[!A-Za-z0-9._-]*|'') echo "BITCOIN_RPC_USER contains unsupported characters" >&2; exit 64 ;; esac
case "$BITCOIN_RPC_PASSWORD" in *[!A-Za-z0-9]*|'') echo "BITCOIN_RPC_PASSWORD must be a non-empty alphanumeric secret" >&2; exit 64 ;; esac

mkdir -p /data
chown bitcoin:bitcoin /data
cat > /data/bitcoin.conf <<EOF
server=1
listen=1
rpcbind=0.0.0.0
rpcallowip=172.16.0.0/12
rpcuser=$BITCOIN_RPC_USER
rpcpassword=$BITCOIN_RPC_PASSWORD
prune=$BITCOIN_PRUNE_MIB
dbcache=$BITCOIN_DBCACHE_MIB
disablewallet=1
EOF
chown bitcoin:bitcoin /data/bitcoin.conf
chmod 0600 /data/bitcoin.conf

exec gosu bitcoin bitcoind \
  -datadir=/data \
  -printtoconsole=1
