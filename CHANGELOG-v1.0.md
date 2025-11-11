# NetCheck v1.0 - Initial Release

## 🎉 Release Date: 2025-11-11

## ✨ Features

### Core Functionality
- **Per-application network monitoring** - Track network usage for each running application
- **Real-time updates** - Live monitoring with configurable refresh intervals (default: 15 seconds)
- **Historical data** - View usage for Today, Week, or Month
- **Smart app grouping** - Automatically groups related processes:
  - Browser processes (Brave, Chrome, Firefox)
  - Development tools (Code, Claude, Cursor)
  - Package managers (npm, apt)
  - System services (GNOME Shell, Python, Node, etc.)

### User Interface
- **Clean popup menu** with network usage display
- **Beautiful progress bars** showing relative usage per app
- **Period selector** buttons (Today/Week/Month)
- **Quick refresh button** in header (small icon, non-intrusive)
- **Download/Upload breakdown** for each application
- **Percentage indicators** showing relative usage
- **Scrollable list** supporting up to 50 apps

### Customization
- **6 Color Themes**:
  - Default Blue
  - Green
  - Purple
  - Orange
  - Red
  - **Auto (Dark/Light)** - Automatically adapts to system theme
- **Configurable refresh interval** (1-60 seconds, default: 15s)
- **Panel label toggle** - Show/hide total usage in top panel
- **Max apps display** - Configure how many apps to show (5-50)

### Settings Panel
- **Easy access** via Settings button in menu or Extensions app
- **Database management**:
  - View database location
  - **Reset All Data** button with confirmation dialog
- **Theme selector** with live preview
- **Contact information** (Telegram, GitHub)

### Backend (netcheckd)
- **Lightweight daemon** - Minimal CPU and memory usage
- **SQLite database** - Persistent storage at `~/.local/share/netcheckd/usage.sqlite3`
- **systemd integration** - Auto-start on login
- **DBus interface** - Efficient communication with extension
- **Process name normalization** - Smart grouping of related processes

## 🔧 Technical Details

### Performance Optimizations
- **Smart refresh timing** - Default 15 seconds (was 5s) to reduce system load
- **Efficient data queries** - Aggregated queries for minimal overhead
- **Lazy loading** - Only updates when menu is likely to be viewed

### Compatibility
- **GNOME Shell** 45, 46, 47, 48
- **Python** 3.9+
- **Linux** (tested on Debian/Ubuntu/Fedora)

## 📦 Installation

```bash
git clone git@github.com:ArashZich/NetCheck.git
cd NetCheck
bash scripts/install.sh
```

Then logout/login or restart GNOME Shell.

## 🐛 Known Issues

- Extension version may show cached value until logout/login
- Auto theme requires GNOME 42+ for color-scheme detection

## 👤 Credits

- **Author**: ArashZich
- **Contact**: [@ArashZich](https://t.me/ArashZich) on Telegram
- **Repository**: [github.com/ArashZich/NetCheck](https://github.com/ArashZich/NetCheck)
- **License**: GPL-3.0

## 🙏 Acknowledgments

Made with ❤️ for the GNOME community
