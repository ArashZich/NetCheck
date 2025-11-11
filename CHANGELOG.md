# NetCheck Changelog

## Version 2.1 - 2025-11-11

### New Features
- **Smart App Grouping**: Process names are now automatically grouped by application
  - npm packages (e.g., "npm view @package" → "npm")
  - Browser processes (brave, chrome, firefox)
  - Development tools (code, claude, cursor)
  - System apps (gnome-shell, python, node)
  - Network connections are grouped as "Network Connections"

- **Theme Support**: 5 beautiful color themes to choose from
  - Default Blue (#4a9eff)
  - Green (#51cf66)
  - Purple (#a78bfa)
  - Orange (#ffa94d)
  - Red (#ff6b6b)

- **Settings Button**: Quick access to preferences from the main menu
  - Click ⚙️ Settings button in the dropdown
  - Opens GNOME Extensions preferences dialog

- **Improved UI**:
  - Maximum width limit (500px) to prevent overflow with long app names
  - App names truncated to 40 characters with "..." for better readability
  - Theme colors applied to progress bars, labels, and icons

### Contact Information
- Added Telegram contact: @ArashZich
- GitHub repository link in preferences

### Bug Fixes
- Fixed daemon data collection (nethogs output parsing)
- Fixed D-Bus return type errors (list vs tuple)
- Fixed database query issues
- Improved install script with better verification

### Technical Improvements
- Enhanced `_normalize_process_name()` function with extensive app mappings
- Better handling of long process names and IP addresses
- Updated README with new features
- Added comprehensive installation verification

---

## Version 2.0 - Previous Release

### Initial Features
- Per-app network usage monitoring
- Real-time and historical data (today/week/month)
- SystemD user service integration
- SQLite database storage
- GNOME Shell extension with beautiful UI
- Automatic installation script
