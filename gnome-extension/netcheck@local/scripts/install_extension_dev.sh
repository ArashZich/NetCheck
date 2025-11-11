#!/usr/bin/env bash
set -euo pipefail

EXT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
UUID="netcheck@local"
DEST_DIR="$HOME/.local/share/gnome-shell/extensions/${UUID}"
mkdir -p "$DEST_DIR"
rsync -a --delete "$EXT_DIR/" "$DEST_DIR/" --exclude scripts

echo "Installed to ${DEST_DIR}."
echo "Restart GNOME Shell (Alt+F2, r) or re-login, then enable via Extensions app."






