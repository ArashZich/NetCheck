#!/usr/bin/env bash
set -euo pipefail

ok() { echo -e "[OK] $1"; }
warn() { echo -e "[WARN] $1"; }
err() { echo -e "[ERR] $1"; }

check_pkg() {
  if dpkg -s "$1" >/dev/null 2>&1; then ok "pkg $1"; else err "missing pkg $1"; fi
}

check_caps() {
  if getcap /usr/sbin/nethogs 2>/dev/null | grep -q cap_net_raw; then ok "nethogs caps"; else warn "nethogs caps missing"; fi
}

check_service() {
  if systemctl --user is-active --quiet netcheckd.service; then ok "netcheckd active"; else warn "netcheckd not active"; fi
}

check_dbus() {
  if gdbus call --session --dest org.netcheckd.Service --object-path /org/netcheckd/Service --method org.netcheckd.Interface.Ping >/dev/null 2>&1; then ok "dbus reachable"; else warn "dbus not reachable"; fi
}

check_ext() {
  local UUID="netcheck@local"
  local DIR="$HOME/.local/share/gnome-shell/extensions/${UUID}"
  if [[ -d "$DIR" ]]; then ok "extension installed"; else warn "extension not installed"; fi
}

check_pkg python3
check_pkg sqlite3
check_pkg nethogs
check_pkg vnstat
check_caps
check_service
check_dbus
check_ext







