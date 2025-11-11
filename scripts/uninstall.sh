#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
UUID="netcheck@local"
EXT_DEST="${HOME}/.local/share/gnome-shell/extensions/${UUID}"
UNIT_DIR="${HOME}/.config/systemd/user"
APP_HOME="${HOME}/.local/share/netcheckd"

systemctl --user disable --now netcheckd.service || true
rm -f "${UNIT_DIR}/netcheckd.service"
systemctl --user daemon-reload || true

rm -rf "${EXT_DEST}"
rm -rf "${APP_HOME}"

echo "Uninstalled NetCheck daemon and extension."








