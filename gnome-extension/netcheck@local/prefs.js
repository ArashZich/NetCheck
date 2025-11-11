import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class NetCheckPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings("org.gnome.shell.extensions.netcheck");

    const page = new Adw.PreferencesPage({
      title: "General",
      icon_name: "dialog-information-symbolic",
    });
    window.add(page);

    const group = new Adw.PreferencesGroup({
      title: "Display Settings",
      description: "Configure how NetCheck displays network usage",
    });
    page.add(group);

    // Refresh interval
    const refreshRow = new Adw.SpinRow({
      title: "Refresh Interval",
      subtitle: "How often to update the display (in seconds)",
      adjustment: new Gtk.Adjustment({
        lower: 1,
        upper: 60,
        step_increment: 1,
      }),
    });
    settings.bind("refresh-interval", refreshRow, "value", Gio.SettingsBindFlags.DEFAULT);
    group.add(refreshRow);

    // Show panel label
    const showLabelRow = new Adw.SwitchRow({
      title: "Show Total Usage in Panel",
      subtitle: "Display total usage next to the icon in the top panel",
    });
    settings.bind("show-panel-label", showLabelRow, "active", Gio.SettingsBindFlags.DEFAULT);
    group.add(showLabelRow);

    // Max apps to display
    const maxAppsRow = new Adw.SpinRow({
      title: "Maximum Apps to Display",
      subtitle: "Number of apps to show in the list",
      adjustment: new Gtk.Adjustment({
        lower: 5,
        upper: 50,
        step_increment: 5,
      }),
    });
    settings.bind("max-apps", maxAppsRow, "value", Gio.SettingsBindFlags.DEFAULT);
    group.add(maxAppsRow);

    // Database management group
    const dbGroup = new Adw.PreferencesGroup({
      title: "Database",
      description: "Manage usage data and database",
    });
    page.add(dbGroup);

    const dbLocationRow = new Adw.ActionRow({
      title: "Database Location",
      subtitle: "~/.local/share/netcheckd/usage.sqlite3",
    });
    dbGroup.add(dbLocationRow);

    // Reset data button
    const resetRow = new Adw.ActionRow({
      title: "Reset All Data",
      subtitle: "Delete all network usage history",
    });
    const resetButton = new Gtk.Button({
      label: "Reset",
      valign: Gtk.Align.CENTER,
      css_classes: ["destructive-action"],
    });
    resetButton.connect("clicked", () => {
      const dialog = new Gtk.MessageDialog({
        transient_for: window,
        modal: true,
        buttons: Gtk.ButtonsType.YES_NO,
        message_type: Gtk.MessageType.WARNING,
        text: "Reset All Data?",
        secondary_text: "This will permanently delete all network usage history. This action cannot be undone.",
      });

      dialog.connect("response", (widget, response) => {
        if (response === Gtk.ResponseType.YES) {
          try {
            const dbPath = GLib.build_filenamev([GLib.get_home_dir(), ".local", "share", "netcheckd", "usage.sqlite3"]);
            const file = Gio.File.new_for_path(dbPath);
            if (file.query_exists(null)) {
              file.delete(null);
              // Restart daemon to recreate database
              GLib.spawn_command_line_async("systemctl --user restart netcheckd");

              const successDialog = new Gtk.MessageDialog({
                transient_for: window,
                modal: true,
                buttons: Gtk.ButtonsType.OK,
                message_type: Gtk.MessageType.INFO,
                text: "Data Reset Complete",
                secondary_text: "All network usage data has been deleted. The daemon is restarting.",
              });
              successDialog.show();
              successDialog.connect("response", () => successDialog.close());
            }
          } catch (e) {
            const errorDialog = new Gtk.MessageDialog({
              transient_for: window,
              modal: true,
              buttons: Gtk.ButtonsType.OK,
              message_type: Gtk.MessageType.ERROR,
              text: "Reset Failed",
              secondary_text: `Error: ${e.message}`,
            });
            errorDialog.show();
            errorDialog.connect("response", () => errorDialog.close());
          }
        }
        dialog.close();
      });

      dialog.show();
    });
    resetRow.add_suffix(resetButton);
    dbGroup.add(resetRow);

    // About group
    const aboutGroup = new Adw.PreferencesGroup({
      title: "About",
      description: "NetCheck - Per-app network usage monitor",
    });
    page.add(aboutGroup);

    const versionRow = new Adw.ActionRow({
      title: "Version",
      subtitle: "1.0.1",
    });
    aboutGroup.add(versionRow);

    const githubRow = new Adw.ActionRow({
      title: "GitHub",
      subtitle: "https://github.com/arashzich/NetCheck",
      activatable: true,
    });
    githubRow.connect("activated", () => {
      Gtk.show_uri(window, "https://github.com/arashzich/NetCheck", Gtk.get_current_event_time());
    });
    aboutGroup.add(githubRow);

    const telegramRow = new Adw.ActionRow({
      title: "Contact via Telegram",
      subtitle: "@ArashZich",
      activatable: true,
    });
    telegramRow.connect("activated", () => {
      Gtk.show_uri(window, "https://t.me/ArashZich", Gtk.get_current_event_time());
    });
    aboutGroup.add(telegramRow);

    // Theme selection
    const themeGroup = new Adw.PreferencesGroup({
      title: "Appearance",
      description: "Customize the look of NetCheck",
    });
    page.add(themeGroup);

    const themeRow = new Adw.ComboRow({
      title: "Theme",
      subtitle: "Choose a color theme for the extension",
      model: new Gtk.StringList({ strings: ["Default Blue", "Green", "Purple", "Orange", "Red", "Auto (Dark/Light)"] }),
    });
    settings.bind("theme", themeRow, "selected", Gio.SettingsBindFlags.DEFAULT);
    themeGroup.add(themeRow);
  }
}
