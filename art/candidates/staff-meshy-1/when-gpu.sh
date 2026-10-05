#!/bin/sh
# Run a browser job once no image or model job holds the exclusive GPU lock (GUIDE: GPU lock; a browser job only
# waits 60 s for a slot). Retries a deferred run. Up to about 50 minutes.
#   sh art/candidates/staff-meshy-1/when-gpu.sh <command> [args...]
i=0
while [ $i -lt 200 ]; do
  o=$(cat /tmp/claude-1000/gpu.lock/owner 2>/dev/null)
  case "$o" in
    ""|browser-gpu-pool*)
      out=$("$@" 2>&1); code=$?
      if ! echo "$out" | grep -q "render deferred"; then echo "$out"; exit $code; fi ;;
  esac
  i=$((i + 1)); sleep 15
done
echo "GPU never free"; exit 1
