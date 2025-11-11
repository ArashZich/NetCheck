from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Tuple

from dateutil.tz import tzutc
from dbus_next.aio import MessageBus
from dbus_next.service import (ServiceInterface, method)

from .config import DBUS_BUS_NAME, DBUS_OBJECT_PATH, AGGREGATION_BUCKET_SECONDS
from .collector_nethogs import NethogsCollector
from .db import get_session, upsert_app, upsert_interface, UsageAppMinute


class NetcheckInterface(ServiceInterface):
    def __init__(self):
        super().__init__("org.netcheckd.Interface")

    @method()
    def Ping(self) -> "s":
        return "ok"

    @method()
    def GetLiveSnapshot(self) -> "a(sstt)":
        # returns array of (process_name, device, rx_bps, tx_bps)
        col = self._collector  # type: ignore[attr-defined]
        rates = col.snapshot_rates()
        out: List[Tuple[str, str, int, int]] = []
        for (process, pid, device), (rx_bps, tx_bps) in rates.items():
            out.append([process, device, rx_bps, tx_bps])
        return out

    @method()
    def GetTopApps(self, period: "s", limit: "u") -> "a(stt)":
        # returns array of (process_name, rx_bytes, tx_bytes)
        start = _period_start(period)
        with get_session() as s:
            from .db import App
            rows = (
                s.query(App.process_name,
                        UsageAppMinute.rx_bytes,
                        UsageAppMinute.tx_bytes)
                .join(App, UsageAppMinute.app_id == App.id)
                .filter(UsageAppMinute.ts_minute >= start)
                .all()
            )
            agg = defaultdict(lambda: [0, 0])
            for process_name, rx, tx in rows:
                # Normalize process names
                normalized = _normalize_process_name(process_name)
                agg[normalized][0] += int(rx)
                agg[normalized][1] += int(tx)
            items = [
                [name, vals[0], vals[1]] for name, vals in agg.items()
            ]
            items.sort(key=lambda x: (x[1] + x[2]), reverse=True)
            return items[: int(limit)]

    @method()
    def GetTotals(self, period: "s") -> "s":
        start = _period_start(period)
        with get_session() as s:
            rows = (
                s.query(UsageAppMinute.rx_bytes, UsageAppMinute.tx_bytes)
                .filter(UsageAppMinute.ts_minute >= start)
                .all()
            )
            rx = sum(int(r[0]) for r in rows)
            tx = sum(int(r[1]) for r in rows)
            return [f"{rx},{tx}"]


def _normalize_process_name(name: str) -> str:
    """Normalize process names to common app names."""
    name_lower = name.lower()

    # Common apps mapping
    app_mappings = {
        "brave": ["brave", "/opt/brave"],
        "chrome": ["chrome", "chromium", "/opt/google/chrome"],
        "firefox": ["firefox", "/usr/lib/firefox"],
        "code": ["code", "vscode", "/usr/share/code"],
        "claude": ["claude"],
        "cursor": ["cursor"],
        "telegram": ["telegram"],
        "npm": ["npm"],
        "python": ["python", "/usr/bin/python", "/home/", "venv/bin/python"],
        "node": ["node", "/usr/bin/node"],
        "git": ["git", "/usr/bin/git"],
        "wget": ["wget", "/usr/bin/wget"],
        "curl": ["curl", "/usr/bin/curl"],
        "apt": ["apt", "apt-get", "/usr/bin/apt"],
        "docker": ["docker", "/usr/bin/docker"],
        "gnome-shell": ["/usr/bin/gnome-shell"],
        "gnome-software": ["/usr/bin/gnome-software"],
        "goa-daemon": ["/usr/libexec/goa-daemon"],
    }

    # Check if name starts with any known app
    for app, patterns in app_mappings.items():
        for pattern in patterns:
            if name_lower.startswith(pattern):
                return app

    # For IP addresses or unknown connections, return "Network"
    if ":" in name and ("-" in name or name.count(".") >= 3):
        return "Network Connections"

    # Return original name if no match
    return name


def _period_start(period: str) -> datetime:
    now = datetime.utcnow()
    if period == "today":
        return datetime(now.year, now.month, now.day)
    if period == "week":
        # Monday-start week
        start = now - timedelta(days=now.weekday())
        return datetime(start.year, start.month, start.day)
    if period == "month":
        return datetime(now.year, now.month, 1)
    return now - timedelta(days=1)


class AppService:
    def __init__(self):
        self._collector = NethogsCollector()
        self._iface = NetcheckInterface()
        # Attach collector to iface for snapshot
        setattr(self._iface, "_collector", self._collector)

    async def run(self):
        from .db import init_db

        init_db()
        self._collector.start()
        bus = await MessageBus().connect()
        bus.export(DBUS_OBJECT_PATH, self._iface)
        await bus.request_name(DBUS_BUS_NAME)
        # Start aggregation loop
        asyncio.create_task(self._aggregation_loop())
        await asyncio.get_event_loop().create_future()

    async def _aggregation_loop(self):
        while True:
            await asyncio.sleep(AGGREGATION_BUCKET_SECONDS)
            rates = self._collector.snapshot_rates()
            # Approx bytes in last minute using mean bps * bucket seconds
            agg = defaultdict(lambda: [0, 0, None, None])  # rx, tx, process, device
            for (process, pid, device), (rx_bps, tx_bps) in rates.items():
                agg[(process, device)][0] += int(rx_bps * AGGREGATION_BUCKET_SECONDS)
                agg[(process, device)][1] += int(tx_bps * AGGREGATION_BUCKET_SECONDS)
                agg[(process, device)][2] = process
                agg[(process, device)][3] = device
            ts_min = datetime.utcnow().replace(second=0, microsecond=0)
            if not agg:
                continue
            from .db import UsageIfaceMinute, upsert_app, upsert_interface, get_session

            with get_session() as s:
                for (process, device), (rx, tx, _, _) in agg.items():
                    app = upsert_app(s, process_name=process, exe_path=None)
                    iface = upsert_interface(s, name=device)
                    row = UsageAppMinute(
                        app_id=app.id,
                        interface_id=iface.id,
                        ts_minute=ts_min,
                        rx_bytes=rx,
                        tx_bytes=tx,
                    )
                    s.add(row)
                s.commit()





