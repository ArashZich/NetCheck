from __future__ import annotations

import subprocess
import threading
import time
from collections import defaultdict
from datetime import datetime
from typing import Dict, Tuple

from .config import NETHOGS_BIN, NETHOGS_REFRESH_SECONDS


class NethogsCollector(threading.Thread):
    def __init__(self):
        super().__init__(daemon=True)
        self._stop = threading.Event()
        self._rates_lock = threading.Lock()
        self._rates: Dict[Tuple[str, int, str], Tuple[int, int]] = {}

    def run(self):
        cmd = [NETHOGS_BIN, "-t", "-d", str(NETHOGS_REFRESH_SECONDS)]
        # Output format (trace):
        # <process>/<pid>/<uid>\t<sent_KB/s>\t<recv_KB/s>
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            bufsize=1,
        )
        assert proc.stdout is not None
        for line in proc.stdout:
            if self._stop.is_set():
                break
            line = line.strip()
            # Skip header lines and refreshing markers
            if not line or line.startswith("Refreshing") or "/" not in line:
                continue
            try:
                parts = line.split("\t")
                if len(parts) < 3:
                    continue
                # Parse process/pid/uid - last occurrence of / separates process from pid/uid
                # Format: process_name/pid/uid
                proc_with_pid = parts[0]
                # Find the last two / characters for pid and uid
                last_slash = proc_with_pid.rfind("/")
                if last_slash == -1:
                    continue
                second_last_slash = proc_with_pid.rfind("/", 0, last_slash)
                if second_last_slash == -1:
                    continue

                process = proc_with_pid[:second_last_slash]
                pid = int(proc_with_pid[second_last_slash+1:last_slash])
                # Parse rates (sent and recv are in KB/s)
                tx_kbps = float(parts[1])
                rx_kbps = float(parts[2])
                # Use first interface or "all"
                device = "all"
                key = (process, pid, device)
                # Convert to bytes/second
                tx_bps = int(tx_kbps * 1024)
                rx_bps = int(rx_kbps * 1024)
                with self._rates_lock:
                    self._rates[key] = (rx_bps, tx_bps)
            except Exception as e:
                # Skip lines that don't match expected format
                continue
        try:
            proc.terminate()
        except Exception:
            pass

    def stop(self):
        self._stop.set()

    def snapshot_rates(self) -> Dict[Tuple[str, int, str], Tuple[int, int]]:
        with self._rates_lock:
            return dict(self._rates)







