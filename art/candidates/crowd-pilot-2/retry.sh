#!/bin/sh
# Run a browser job again while it is deferred (machine load over GUIDE's 24, or GPU slots busy), up to N minutes.
#   sh art/candidates/crowd-pilot-2/retry.sh <minutes> <command> [args...]
END=$(( $(date +%s) + $1 * 60 )); shift
while :; do
  "$@" > /tmp/claude-1000/crowd-pilot-2-retry.$$ 2>&1; code=$?
  if [ $code -eq 0 ] || ! grep -q -E "LOAD_DEFERRED|GPU_DEFERRED" /tmp/claude-1000/crowd-pilot-2-retry.$$ || [ "$(date +%s)" -ge "$END" ]; then
    cat /tmp/claude-1000/crowd-pilot-2-retry.$$; rm -f /tmp/claude-1000/crowd-pilot-2-retry.$$; exit $code
  fi
  sleep 45
done
