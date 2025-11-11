#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
UNIT_DIR="${HOME}/.config/systemd/user"
mkdir -p "${UNIT_DIR}"

cat > "${UNIT_DIR}/netcheckd.service" <<'EOF'
[Unit]
Description=NetCheck per-app network usage daemon
After=default.target

[Service]
Type=simple
Environment=PYTHONUNBUFFERED=1
ExecStart=%h/.local/share/netcheckd/venv/bin/python -m netcheckd
Restart=on-failure

[Install]
WantedBy=default.target
EOF

# Create venv and install deps under ~/.local/share/netcheckd
APP_HOME="${HOME}/.local/share/netcheckd"
mkdir -p "${APP_HOME}"
python3 -m venv "${APP_HOME}/venv"
"${APP_HOME}/venv/bin/pip" install -r "${ROOT_DIR}/requirements.txt"
# Install package in editable mode
"${APP_HOME}/venv/bin/pip" install -e "${ROOT_DIR}"

echo "Installed systemd unit at ${UNIT_DIR}/netcheckd.service"
echo "Use: systemctl --user daemon-reload && systemctl --user enable --now netcheckd.service"






