#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo on the NOD-I device" >&2
  exit 1
fi

source_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
install_dir=/opt/nodi-screen
config_dir=/etc/nodi

getent group nodi-screen >/dev/null 2>&1 || groupadd --system nodi-screen
id nodi-screen >/dev/null 2>&1 || useradd --system --gid nodi-screen --home-dir "$install_dir" --shell /usr/sbin/nologin nodi-screen
for device_group in spi gpio; do
  if getent group "$device_group" >/dev/null 2>&1; then
    usermod -a -G "$device_group" nodi-screen
  fi
done

install -d -m 0755 "$install_dir" "$config_dir"
install -m 0644 "$source_dir/screen_agent.py" "$source_dir/requirements.txt" "$install_dir/"
python3 -m venv "$install_dir/venv"
"$install_dir/venv/bin/pip" install --requirement "$install_dir/requirements.txt"
if [ ! -e "$config_dir/screen.json" ]; then
  install -m 0644 "$source_dir/config.example.json" "$config_dir/screen.json"
fi
systemctl stop nodi-screen.service 2>/dev/null || true
install -m 0644 "$source_dir/nodi-screen.service" /etc/systemd/system/nodi-screen.service
chown -R nodi-screen:nodi-screen "$install_dir"
systemctl daemon-reload
systemctl enable --now nodi-screen.service
echo "Screen agent installed. Existing /etc/nodi/screen.json was preserved."
