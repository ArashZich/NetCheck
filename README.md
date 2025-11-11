# NetCheck - Network Usage Monitor for GNOME

<div align="center">

![NetCheck Logo](https://img.shields.io/badge/GNOME-Extension-4A86E8?style=for-the-badge&logo=gnome&logoColor=white)
![Version](https://img.shields.io/badge/version-1.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-GPL--3.0-green?style=for-the-badge)

**Monitor per-application network usage with beautiful charts and detailed reports**

</div>

---

## Overview

NetCheck is a powerful GNOME Shell extension that monitors network usage on a per-application basis. It provides real-time insights into which applications are consuming bandwidth, with beautiful visualizations and detailed historical reports.

### Why NetCheck?

- **Per-App Monitoring**: Track exactly which applications are using your network
- **Historical Data**: View usage reports for today, this week, or this month
- **Lightweight**: Minimal CPU and memory footprint
- **Beautiful UI**: Clean, modern interface with progress bars and charts
- **Easy to Use**: One-click installation, no configuration needed

---

## Features

✨ Real-time network usage monitoring per application
📊 Beautiful panel indicator showing total network usage
📈 Detailed breakdown of download/upload for each app
📅 Historical usage reports (Today/Week/Month)
🎨 Visual progress bars showing relative usage
🎭 Multiple color themes (Blue, Green, Purple, Orange, Red, Auto Dark/Light)
⚙️ Customizable refresh intervals
📜 Scrollable list for monitoring many applications
🏷️ Smart app grouping (e.g., all npm commands → "npm")
💾 SQLite database for persistent storage
🚀 Automatic startup with systemd user service

---

## Installation

### Quick Install (Recommended)

\`\`\`bash
git clone git@github.com:ArashZich/NetCheck.git
cd NetCheck
bash scripts/install.sh
\`\`\`

Then:
1. **Logout and login** (or restart GNOME Shell with \`Alt+F2\` → \`r\` on X11)
2. Open **Extensions** app and enable **NetCheck**
3. Wait ~1 minute for data to accumulate

---

## Usage

### Panel Indicator

Click the network icon in your top panel to open the NetCheck menu. You'll see:

- **Period Selector**: Switch between Today/Week/Month views
- **Total Usage**: See your total download/upload for the selected period
- **App List**: Scrollable list of applications with usage details

### Settings

You can access settings in two ways:
1. Click the **⚙️ Settings** button in the NetCheck menu
2. Open GNOME Extensions app, find NetCheck, and click the gear icon

Available settings:
- **Refresh Interval**: How often to update (1-60 seconds)
- **Show Panel Label**: Toggle total usage in the panel
- **Maximum Apps**: Number of apps to show (5-50)
- **Theme**: Choose from 5 color themes (Blue, Green, Purple, Orange, Red)

### Daemon Management

\`\`\`bash
# Check status
systemctl --user status netcheckd

# View logs
journalctl --user -u netcheckd -f
\`\`\`

---

## Troubleshooting

### "Daemon not running" message

\`\`\`bash
systemctl --user restart netcheckd
\`\`\`

### No data appears

Wait at least 1 minute after starting the daemon for data to accumulate.

---

## License

GPL-3.0 License

---

## Contact & Support

- **Telegram**: [@ArashZich](https://t.me/ArashZich)
- **GitHub**: [ArashZich/NetCheck](https://github.com/arashzich/NetCheck)

---

**Made with ❤️ for the GNOME community**
