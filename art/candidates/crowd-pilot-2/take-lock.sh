#!/bin/sh
# Wait for the GPU lock (GUIDE: GPU lock) and take it as crowd-pilot-2 for this round's short Blender runs: tries every
# 15 s while the lock is held or the image gen dashboard has priority; exits 0 once the lock is ours (owner file
# written), 1 after the limit. Release with:  grep -q crowd-pilot-2 /tmp/claude-1000/gpu.lock/owner && rm -r /tmp/claude-1000/gpu.lock
#   sh art/candidates/crowd-pilot-2/take-lock.sh [minutes=90]
L=/tmp/claude-1000/gpu.lock
END=$(( $(date +%s) + ${1:-90} * 60 ))
while [ "$(date +%s)" -lt "$END" ]; do
  if ! python3 tools/gpu_priority.py live >/dev/null 2>&1 && mkdir "$L" 2>/dev/null; then
    echo crowd-pilot-2 > "$L/owner"
    echo "lock taken $(date +%T)"; exit 0
  fi
  sleep 15
done
echo "no lock after ${1:-90} min (owner: $(cat $L/owner 2>/dev/null))"; exit 1
