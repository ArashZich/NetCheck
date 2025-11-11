# NetCheck Installation & Testing Guide

## Quick Installation

```bash
cd /home/arashzich/Projects/arash/NetCheck
bash scripts/install.sh
```

## After Installation

### 1. Restart GNOME Shell
- **On X11**: Press `Alt+F2`, type `r`, press Enter
- **On Wayland**: Logout and login again (you're using Wayland)

### 2. Enable Extension
```bash
gnome-extensions enable netcheck@local
```

Or open **Extensions** app (GNOME Extensions) and enable **NetCheck**

### 3. Verify Extension
```bash
# Check if extension is enabled
gnome-extensions info netcheck@local

# Check daemon status
systemctl --user status netcheckd

# Test D-Bus
gdbus call --session --dest org.netcheckd.Service --object-path /org/netcheckd/Service --method org.netcheckd.Interface.Ping
```

### 4. View Logs
```bash
# Extension logs
journalctl -f /usr/bin/gnome-shell | grep netcheck

# Daemon logs
journalctl --user -u netcheckd -f
```

## What to Expect

After enabling the extension:
- You should see a network icon in your top panel
- Click it to open the menu
- Initially it will show "No data yet" - wait 1-2 minutes
- After data accumulates, you'll see apps and their network usage

## Troubleshooting

### Extension not showing
```bash
# Re-install
bash scripts/install.sh
# Logout and login
gnome-session-quit --logout
```

### "Daemon not running"
```bash
systemctl --user restart netcheckd
journalctl --user -u netcheckd -n 50
```

### No data after waiting
```bash
# Check nethogs permissions
getcap /usr/sbin/nethogs
# Should show: cap_net_admin,cap_net_raw=eip

# If not, run:
sudo setcap cap_net_raw,cap_net_admin+eip /usr/sbin/nethogs
```
