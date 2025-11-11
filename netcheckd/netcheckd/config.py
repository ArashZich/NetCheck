import os
from pathlib import Path

APP_NAME = "netcheckd"
DB_PATH = Path(os.environ.get("NETCHECKD_DB", str(Path.home() / ".local/share/netcheckd/usage.sqlite3")))
STATE_DIR = DB_PATH.parent

DBUS_BUS_NAME = "org.netcheckd.Service"
DBUS_OBJECT_PATH = "/org/netcheckd/Service"

DEFAULT_INTERFACE = None  # None means auto-detect default route
AGGREGATION_BUCKET_SECONDS = 60
NETHOGS_BIN = os.environ.get("NETHOGS_BIN", "/usr/sbin/nethogs")
NETHOGS_REFRESH_SECONDS = int(os.environ.get("NETHOGS_REFRESH", "2"))








