#!/bin/sh
set -eu

mkdir -p /data/store
chown -R node:node /data/store
exec gosu node node services/api/dist/server.js
