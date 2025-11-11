#!/usr/bin/env python3
import subprocess
import sys

cmd = ["/usr/sbin/nethogs", "-t", "-d", "2"]
print(f"Running: {' '.join(cmd)}", file=sys.stderr)
print("Waiting for output...", file=sys.stderr)

proc = subprocess.Popen(
    cmd,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    bufsize=1,
)

count = 0
for line in proc.stdout:
    print(f"Line {count}: {line.strip()}")
    count += 1
    if count >= 10:
        break

proc.terminate()
print(f"\nTotal lines received: {count}", file=sys.stderr)
