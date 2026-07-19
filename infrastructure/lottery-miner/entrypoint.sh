#!/bin/sh
set -eu

: "${MINER_ENABLED:=false}"
: "${MINER_POOL:=stratum+tcp://public-pool.io:21496}"
: "${MINER_ADDRESS:=}"
: "${MINER_WORKER:=nodi}"
: "${MINER_THREADS:=1}"
: "${MINER_MAX_TEMP_C:=75}"
: "${HOST_THERMAL_PATH:=/host-thermal/thermal_zone0/temp}"

state_dir=/data/miner
state_file="$state_dir/state.json"
log_file="$state_dir/miner.log"

if [ "$(id -u)" -eq 0 ]; then
  mkdir -p "$state_dir"
  chown -R miner:miner "$state_dir"
  exec gosu miner "$0" "$@"
fi

mkdir -p "$state_dir"

write_state() {
  state_status=$1
  state_message=$2
  state_temp=${3:-null}
  now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  printf '{"status":"%s","enabled":%s,"pool":"%s","worker":"%s","threads":%s,"temperatureC":%s,"updatedAt":"%s","message":"%s"}\n' \
    "$state_status" "$MINER_ENABLED" "$MINER_POOL" "$MINER_WORKER" "$MINER_THREADS" "$state_temp" "$now" "$state_message" > "$state_file"
}

case "$MINER_ENABLED" in true|false) ;; *) MINER_ENABLED=false; write_state blocked "MINER_ENABLED must be true or false"; exit 64 ;; esac
case "$MINER_THREADS" in *[!0-9]*|'') write_state blocked "MINER_THREADS must be a positive integer"; exit 64 ;; esac
[ "$MINER_THREADS" -gt 0 ] || { write_state blocked "MINER_THREADS must be greater than zero"; exit 64; }
case "$MINER_MAX_TEMP_C" in *[!0-9]*|'') write_state blocked "MINER_MAX_TEMP_C must be numeric"; exit 64 ;; esac
case "$MINER_WORKER" in *[!A-Za-z0-9._-]*|'') write_state blocked "MINER_WORKER contains unsupported characters"; exit 64 ;; esac

if [ "$MINER_ENABLED" != "true" ]; then
  write_state disabled "Mining is opt-in; set MINER_ENABLED=true after reading the runbook"
  exec tail -f /dev/null
fi

if [ -z "$MINER_ADDRESS" ]; then
  write_state blocked "MINER_ADDRESS is required when mining is enabled"
  exit 64
fi

case "$MINER_ADDRESS" in *[!A-Za-z0-9]*) write_state blocked "MINER_ADDRESS contains unsupported characters"; exit 64 ;; esac
case "$MINER_POOL" in stratum+tcp://*) ;; *) write_state blocked "MINER_POOL must start with stratum+tcp://"; exit 64 ;; esac
case "$MINER_POOL" in *[!A-Za-z0-9+.:/_-]*) write_state blocked "MINER_POOL contains unsupported characters"; exit 64 ;; esac

touch "$log_file"
miner_pid=

read_temperature() {
  temperature=null
  if [ -r "$HOST_THERMAL_PATH" ]; then
    raw=$(tr -cd '0-9' < "$HOST_THERMAL_PATH")
    if [ -n "$raw" ]; then
      [ "$raw" -gt 1000 ] && raw=$((raw / 1000))
      temperature=$raw
    fi
  fi
}

stop_miner() {
  if [ -n "$miner_pid" ] && kill -0 "$miner_pid" 2>/dev/null; then
    kill "$miner_pid"
    wait "$miner_pid" 2>/dev/null || true
  fi
  write_state stopped "Miner stopped by signal" "${temperature:-null}"
  exit 0
}
trap stop_miner INT TERM

while :; do
  read_temperature
  if [ "$temperature" != null ] && [ "$temperature" -ge "$MINER_MAX_TEMP_C" ]; then
    write_state thermal-stop "Thermal limit reached; miner is paused" "$temperature"
    sleep 30
    continue
  fi

  write_state running "Lottery miner is running" "$temperature"
  minerd --algo=sha256d --url="$MINER_POOL" --userpass="${MINER_ADDRESS}.${MINER_WORKER}:x" --threads="$MINER_THREADS" \
    >> "$log_file" 2>&1 &
  miner_pid=$!
  thermal_stop=false

  while kill -0 "$miner_pid" 2>/dev/null; do
    sleep 10
    read_temperature
    if [ "$temperature" != null ] && [ "$temperature" -ge "$MINER_MAX_TEMP_C" ]; then
      write_state thermal-stop "Thermal limit reached; stopping miner" "$temperature"
      kill "$miner_pid"
      thermal_stop=true
      break
    fi
    write_state running "Lottery miner is running" "$temperature"
  done

  wait "$miner_pid" 2>/dev/null || true
  miner_pid=
  if [ "$thermal_stop" = true ]; then
    sleep 30
  else
    write_state offline "Miner exited; retrying in 15 seconds" "$temperature"
    sleep 15
  fi
done
