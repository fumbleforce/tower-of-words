#!/bin/bash
# waits for the coordinator's release (collab/private.md), then takes the lock. Stops if the dashboard has priority.
cd /home/jorgen/repo/japanese
for i in $(seq 1 400); do
  tail -n +250 collab/private.md | grep -q '^## .* · release' || { sleep 30; continue; }
  [ -e /tmp/claude-1000/gpu.priority ] || { grep -q imagegen-dashboard /tmp/claude-1000/gpu.lock/owner 2>/dev/null; } || { mkdir /tmp/claude-1000/gpu.lock 2>/dev/null && break; }
  sleep 30
done
echo carina-faces-1 > /tmp/claude-1000/gpu.lock/owner
cd art/candidates/portraits/carina-faces-1
~/ai/sd/venv/bin/python gen.py > run1.log 2>&1
echo done > faces.done
