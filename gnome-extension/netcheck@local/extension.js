import GObject from "gi://GObject";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import St from "gi://St";
import Clutter from "gi://Clutter";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Util from "resource:///org/gnome/shell/misc/util.js";

const BUS_NAME = "org.netcheckd.Service";
const OBJ_PATH = "/org/netcheckd/Service";
const IFACE = "org.netcheckd.Interface";

function _proxy() {
  return Gio.DBusProxy.new_for_bus_sync(
    Gio.BusType.SESSION,
    Gio.DBusProxyFlags.NONE,
    null,
    BUS_NAME,
    OBJ_PATH,
    IFACE,
    null
  );
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return bytes.toFixed(0) + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
  return (bytes / 1073741824).toFixed(2) + " GB";
}

const NetCheckIndicator = GObject.registerClass(
class NetCheckIndicator extends PanelMenu.Button {
  _init(settings) {
    super._init(0.0, "NetCheck");

    this._settings = settings;
    this._box = new St.BoxLayout({ style_class: "panel-status-indicators-box" });

    this._icon = new St.Icon({
      icon_name: "network-transmit-receive-symbolic",
      style_class: "system-status-icon",
    });
    this._box.add_child(this._icon);

    this._label = new St.Label({
      text: "",
      y_align: Clutter.ActorAlign.CENTER,
      style_class: "netcheck-panel-label"
    });
    this._box.add_child(this._label);

    this.add_child(this._box);

    this._proxy = null;
    this._listItems = [];
    this._currentPeriod = "today";
    this._daemonAvailable = false;

    // Connect settings changes
    if (this._settings) {
      this._settingsChangedId = this._settings.connect("changed", () => {
        this._onSettingsChanged();
      });
    }

    // Title with current period and refresh button
    this._headerBox = new St.BoxLayout({
      vertical: false,
      style: "padding: 10px 12px; spacing: 10px;"
    });

    this._titleLabel = new St.Label({
      text: "Network Usage",
      style: "font-weight: bold; font-size: 15px;",
      x_expand: true
    });
    this._headerBox.add_child(this._titleLabel);

    // Small refresh button in header
    const refreshBtn = new St.Button({
      style_class: "button",
      child: new St.Icon({
        icon_name: "view-refresh-symbolic",
        icon_size: 16
      })
    });
    refreshBtn.connect("clicked", () => this._refresh());
    this._headerBox.add_child(refreshBtn);

    const titleItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
    titleItem.actor.add_child(this._headerBox);
    this.menu.addMenuItem(titleItem);

    // Period selector buttons
    const periodBox = new St.BoxLayout({
      vertical: false,
      style: "padding: 6px 12px; spacing: 6px;"
    });

    const periods = [
      { id: "today", label: "Today" },
      { id: "week", label: "Week" },
      { id: "month", label: "Month" }
    ];

    this._periodButtons = {};

    periods.forEach(period => {
      const btn = new St.Button({
        label: period.label,
        style_class: "netcheck-period-button",
        x_expand: true
      });
      btn.connect("clicked", () => this._setPeriod(period.id));
      periodBox.add_child(btn);
      this._periodButtons[period.id] = btn;
    });

    const periodItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
    periodItem.actor.add_child(periodBox);
    this.menu.addMenuItem(periodItem);

    this._separator1 = new PopupMenu.PopupSeparatorMenuItem();
    this.menu.addMenuItem(this._separator1);

    // Total usage display
    this._totalItem = new PopupMenu.PopupMenuItem("Total: calculating...");
    this._totalItem.setSensitive(false);
    this._totalItem.label.style = "font-weight: bold;";
    this.menu.addMenuItem(this._totalItem);

    this._separator2 = new PopupMenu.PopupSeparatorMenuItem();
    this.menu.addMenuItem(this._separator2);

    // Scrollable app list container
    this._scrollView = new St.ScrollView({
      style: "max-height: 400px; max-width: 500px;",
      hscrollbar_policy: St.PolicyType.NEVER,
      vscrollbar_policy: St.PolicyType.AUTOMATIC
    });

    this._listBox = new St.BoxLayout({ vertical: true });
    this._scrollView.add_child(this._listBox);

    const scrollItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
    scrollItem.actor.add_child(this._scrollView);
    this.menu.addMenuItem(scrollItem);

    this._separator3 = new PopupMenu.PopupSeparatorMenuItem();
    this.menu.addMenuItem(this._separator3);

    // Settings button
    const settingsItem = new PopupMenu.PopupMenuItem("⚙️ Settings");
    settingsItem.connect("activate", () => this._openSettings());
    this.menu.addMenuItem(settingsItem);

    this._updatePeriodButtons();
    this._initProxy();
    this._refresh();

    this._startTimer();
    this._applyTheme();
  }

  _openSettings() {
    try {
      Util.spawn(["gnome-extensions", "prefs", "netcheck@local"]);
    } catch (e) {
      logError(e);
    }
  }

  _applyTheme() {
    const themeId = this._settings ? this._settings.get_int("theme") : 0;

    // Check if Auto Dark/Light is selected
    if (themeId === 5) {
      // Detect system theme
      const settings = new Gio.Settings({ schema: "org.gnome.desktop.interface" });
      const colorScheme = settings.get_string("color-scheme");
      const isDark = colorScheme.includes("dark");
      this._themeColor = isDark ? "#4a9eff" : "#2563eb"; // Lighter blue for light theme
    } else {
      const themes = {
        0: "#4a9eff", // Blue
        1: "#51cf66", // Green
        2: "#a78bfa", // Purple
        3: "#ffa94d", // Orange
        4: "#ff6b6b", // Red
      };
      this._themeColor = themes[themeId] || themes[0];
    }
  }

  _startTimer() {
    if (this._timer) {
      GLib.source_remove(this._timer);
    }
    const interval = this._settings ? this._settings.get_int("refresh-interval") : 5;
    this._timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
      this._refresh();
      return true;
    });
  }

  _onSettingsChanged() {
    this._startTimer();
    this._applyTheme();
    this._refresh();
  }

  _initProxy() {
    try {
      this._proxy = _proxy();
      this._daemonAvailable = true;
    } catch (e) {
      this._daemonAvailable = false;
    }
  }

  _setPeriod(period) {
    this._currentPeriod = period;
    this._updatePeriodButtons();
    this._refresh();
  }

  _updatePeriodButtons() {
    Object.keys(this._periodButtons).forEach(id => {
      const btn = this._periodButtons[id];
      if (id === this._currentPeriod) {
        btn.style_class = "netcheck-period-button netcheck-period-active";
      } else {
        btn.style_class = "netcheck-period-button";
      }
    });
  }

  _clearList() {
    this._listBox.destroy_all_children();
    this._listItems = [];
  }

  _refresh() {
    this._clearList();

    if (!this._proxy) {
      this._initProxy();
    }

    if (!this._daemonAvailable) {
      this._showError("Daemon not running");
      this._label.text = "";
      return;
    }

    try {
      // Get top apps
      const maxApps = this._settings ? this._settings.get_int("max-apps") : 20;
      const variant = this._proxy.call_sync(
        "GetTopApps",
        new GLib.Variant("(su)", [this._currentPeriod, maxApps]),
        Gio.DBusCallFlags.NONE,
        -1,
        null
      );

      const [apps] = variant.deep_unpack();

      // Calculate totals from apps
      let totalRx = 0;
      let totalTx = 0;
      apps.forEach(([_, rx, tx]) => {
        totalRx += rx;
        totalTx += tx;
      });
      const total = totalRx + totalTx;

      this._totalItem.label.text = `Total: ↓ ${formatBytes(totalRx)} | ↑ ${formatBytes(totalTx)} | Σ ${formatBytes(total)}`;

      const showLabel = this._settings ? this._settings.get_boolean("show-panel-label") : true;
      this._label.text = showLabel ? formatBytes(total) : "";

      if (apps.length === 0) {
        this._showMessage("No data yet\nWait a minute for data to accumulate");
        return;
      }

      apps.forEach(([name, rx, tx]) => {
        const totalBytes = rx + tx;
        const percentage = total > 0 ? (totalBytes / total * 100) : 0;

        const itemBox = new St.BoxLayout({
          vertical: true,
          style: "padding: 6px 12px; spacing: 4px;"
        });

        // Truncate long names
        const displayName = name.length > 40 ? name.substring(0, 37) + "..." : name;

        // App name and total
        const headerBox = new St.BoxLayout({ vertical: false });
        const nameLabel = new St.Label({
          text: displayName,
          style: "font-weight: bold; min-width: 150px; max-width: 300px;"
        });
        const totalLabel = new St.Label({
          text: formatBytes(totalBytes),
          x_expand: true,
          x_align: Clutter.ActorAlign.END,
          style: `color: ${this._themeColor};`
        });
        headerBox.add_child(nameLabel);
        headerBox.add_child(totalLabel);
        itemBox.add_child(headerBox);

        // Download / Upload details
        const detailBox = new St.BoxLayout({ vertical: false, style: "spacing: 15px;" });
        const downLabel = new St.Label({
          text: `↓ ${formatBytes(rx)}`,
          style: "color: #888; font-size: 11px;"
        });
        const upLabel = new St.Label({
          text: `↑ ${formatBytes(tx)}`,
          style: "color: #888; font-size: 11px;"
        });
        const percentLabel = new St.Label({
          text: `${percentage.toFixed(1)}%`,
          x_expand: true,
          x_align: Clutter.ActorAlign.END,
          style: "color: #666; font-size: 11px;"
        });
        detailBox.add_child(downLabel);
        detailBox.add_child(upLabel);
        detailBox.add_child(percentLabel);
        itemBox.add_child(detailBox);

        // Progress bar
        const barContainer = new St.Widget({
          style: "height: 4px; background-color: #333; border-radius: 2px;",
          layout_manager: new Clutter.BinLayout()
        });
        const bar = new St.Widget({
          style: `width: ${percentage}%; height: 4px; background-color: ${this._themeColor}; border-radius: 2px;`
        });
        barContainer.add_child(bar);
        itemBox.add_child(barContainer);

        this._listBox.add_child(itemBox);
        this._listItems.push(itemBox);
      });

    } catch (e) {
      this._daemonAvailable = false;
      this._showError("Daemon not running\nRun: systemctl --user start netcheckd");
      this._label.text = "";
      logError(e);
    }
  }

  _showError(message) {
    const errorBox = new St.BoxLayout({
      vertical: true,
      style: "padding: 20px; spacing: 8px;"
    });
    const icon = new St.Icon({
      icon_name: "dialog-error-symbolic",
      icon_size: 48,
      style: "color: #ff6b6b;"
    });
    const label = new St.Label({
      text: message,
      style: "color: #ff6b6b; text-align: center;"
    });
    errorBox.add_child(icon);
    errorBox.add_child(label);
    this._listBox.add_child(errorBox);
    this._totalItem.label.text = "Total: N/A";
  }

  _showMessage(message) {
    const msgBox = new St.BoxLayout({
      vertical: true,
      style: "padding: 20px; spacing: 8px;"
    });
    const icon = new St.Icon({
      icon_name: "dialog-information-symbolic",
      icon_size: 48,
      style: `color: ${this._themeColor};`
    });
    const label = new St.Label({
      text: message,
      style: "color: #888; text-align: center;"
    });
    msgBox.add_child(icon);
    msgBox.add_child(label);
    this._listBox.add_child(msgBox);
    this._totalItem.label.text = "Total: 0 B";
    this._label.text = "";
  }

  destroy() {
    if (this._timer) {
      GLib.source_remove(this._timer);
      this._timer = 0;
    }
    if (this._settingsChangedId && this._settings) {
      this._settings.disconnect(this._settingsChangedId);
      this._settingsChangedId = null;
    }
    this._clearList();
    super.destroy();
  }
});

export default class Extension {
  constructor(metadata) {
    this._metadata = metadata;
  }

  enable() {
    this._settings = this.getSettings("org.gnome.shell.extensions.netcheck");
    this._indicator = new NetCheckIndicator(this._settings);
    Main.panel.addToStatusArea("netcheck-indicator", this._indicator);
  }

  disable() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
    this._settings = null;
  }

  getSettings(schemaId) {
    const GioSSS = Gio.SettingsSchemaSource;
    const schemaDir = this._metadata.dir.get_child("schemas");
    let schemaSource;
    if (schemaDir.query_exists(null)) {
      schemaSource = GioSSS.new_from_directory(
        schemaDir.get_path(),
        GioSSS.get_default(),
        false
      );
    } else {
      schemaSource = GioSSS.get_default();
    }

    const schemaObj = schemaSource.lookup(schemaId, true);
    if (!schemaObj) {
      throw new Error(`Schema ${schemaId} not found`);
    }
    return new Gio.Settings({ settings_schema: schemaObj });
  }
}
