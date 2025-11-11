#!/usr/bin/env bash
set -euo pipefail

# One-click installer for NetCheck (Debian/Mint)
# - Installs missing packages
# - Grants caps to nethogs
# - Sets up daemon (systemd --user)
# - Installs GNOME extension for current user

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXT_DIR="${ROOT_DIR}/gnome-extension/netcheck@local"
DAEMON_DIR="${ROOT_DIR}/netcheckd"
APP_HOME="${HOME}/.local/share/netcheckd"
UNIT_DIR="${HOME}/.config/systemd/user"
UUID="netcheck@local"
EXT_DEST="${HOME}/.local/share/gnome-shell/extensions/${UUID}"

need_sudo() {
  if [[ $(id -u) -ne 0 ]]; then echo sudo; else echo; fi
}

pkg_installed() {
  dpkg -s "$1" >/dev/null 2>&1
}

install_packages() {
  local pkgs=(python3 python3-pip python3-venv sqlite3 vnstat nethogs dbus-x11)
  local missing=()
  for p in "${pkgs[@]}"; do
    if ! pkg_installed "$p"; then missing+=("$p"); fi
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "Installing packages: ${missing[*]}"
    $(need_sudo) apt update -y
    $(need_sudo) apt install -y "${missing[@]}"
  else
    echo "All apt packages already installed."
  fi
}

set_caps() {
  if command -v setcap >/dev/null 2>&1; then
    if ! getcap /usr/sbin/nethogs 2>/dev/null | grep -q cap_net_raw; then
      echo "Granting caps to /usr/sbin/nethogs"
      $(need_sudo) setcap cap_net_raw,cap_net_admin+eip /usr/sbin/nethogs || true
    else
      echo "nethogs caps already set."
    fi
  fi
}

setup_daemon() {
  echo "Setting up daemon..."
  mkdir -p "${APP_HOME}" "${UNIT_DIR}"

  # Create or update venv
  if [[ ! -d "${APP_HOME}/venv" ]]; then
    echo "  Creating Python virtual environment..."
    python3 -m venv "${APP_HOME}/venv"
  fi

  echo "  Installing Python dependencies..."
  "${APP_HOME}/venv/bin/pip" install -U pip >/dev/null 2>&1
  "${APP_HOME}/venv/bin/pip" install -r "${DAEMON_DIR}/requirements.txt" >/dev/null 2>&1
  "${APP_HOME}/venv/bin/pip" install -e "${DAEMON_DIR}" >/dev/null 2>&1

  # Create systemd service file
  cat > "${UNIT_DIR}/netcheckd.service" <<EOF
[Unit]
Description=NetCheck per-app network usage daemon
After=default.target

[Service]
Type=simple
Environment=PYTHONUNBUFFERED=1
ExecStart=%h/.local/share/netcheckd/venv/bin/python -m netcheckd
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
EOF

  # Stop old daemon if running
  systemctl --user stop netcheckd.service 2>/dev/null || true
  systemctl --user daemon-reload

  # Enable and start daemon
  echo "  Starting daemon..."
  systemctl --user enable netcheckd.service >/dev/null 2>&1
  systemctl --user start netcheckd.service

  # Wait for daemon to start
  sleep 3

  # Verify daemon is running
  if systemctl --user is-active --quiet netcheckd.service; then
    echo "  ✓ Daemon is running"
  else
    echo "  ✗ Warning: Daemon failed to start"
    echo "  Check logs with: journalctl --user -u netcheckd -f"
  fi

  # Test D-Bus connection
  if gdbus call --session --dest org.netcheckd.Service --object-path /org/netcheckd/Service --method org.netcheckd.Interface.Ping >/dev/null 2>&1; then
    echo "  ✓ D-Bus service is accessible"
  else
    echo "  ✗ Warning: D-Bus service not responding (this is normal on first boot)"
  fi
}

copy_dir() {
  local src="$1"; local dst="$2"
  mkdir -p "$dst"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete --exclude scripts "$src/" "$dst/"
  else
    # Fallback: copy everything except the 'scripts' directory
    # Remove files that might have been deleted (best-effort)
    # Create a temp tar excluding scripts and extract to dst
    ( cd "$src" && tar cf - --exclude='./scripts' . ) | ( cd "$dst" && tar xpf - )
  fi
}

install_extension() {
  echo "Installing GNOME extension..."
  copy_dir "${EXT_DIR}" "${EXT_DEST}"

  # Compile schemas if they exist
  if [[ -d "${EXT_DEST}/schemas" ]]; then
    echo "  Compiling schemas..."
    glib-compile-schemas "${EXT_DEST}/schemas" 2>/dev/null || true
  fi

  # Enable extension (will take effect after GNOME Shell restart)
  echo "  Enabling extension..."
  gnome-extensions enable "${UUID}" 2>/dev/null || true

  # Verify extension is installed
  if gnome-extensions list 2>/dev/null | grep -q "${UUID}"; then
    echo "  ✓ Extension is installed"
  else
    echo "  ✗ Warning: Extension installation may have failed"
  fi
}

main() {
  echo "==================================="
  echo "  NetCheck Installer"
  echo "==================================="
  echo

  install_packages
  echo
  set_caps
  echo
  setup_daemon
  echo
  install_extension

  echo
  echo "============================================"
  echo "  ✓ Installation Complete!"
  echo "============================================"
  echo
  echo "📋 Next Steps:"
  echo "  1. Logout and login (required for Wayland)"
  echo "     OR press Alt+F2, type 'r' and press Enter (X11 only)"
  echo
  echo "  2. After login:"
  echo "     - Extension will auto-enable"
  echo "     - Look for network icon in top panel"
  echo "     - Click it to see network usage"
  echo
  echo "  3. Wait 1-2 minutes for initial data"
  echo "     - Daemon collects data every 60 seconds"
  echo "     - You'll see apps and usage stats"
  echo
  echo "🔧 Useful Commands:"
  echo "  systemctl --user status netcheckd    # Check daemon status"
  echo "  journalctl --user -u netcheckd -f    # View live logs"
  echo "  gnome-extensions prefs ${UUID}       # Open settings"
  echo
  echo "🐛 Troubleshooting:"
  echo "  If you see 'Daemon not running':"
  echo "    systemctl --user restart netcheckd"
  echo
  echo "  If extension doesn't appear after restart:"
  echo "    bash ${ROOT_DIR}/scripts/install.sh"
  echo
}

main "$@"
