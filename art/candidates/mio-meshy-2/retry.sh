#!/bin/sh
# Rerun a browser job of this round while tools/lib/browser-job.mjs defers it (load over 24, or no GPU slot), a minute
# apart, up to <tries> times; its output goes to <log>. Run from the worktree root.
#   sh art/candidates/mio-meshy-2/retry.sh <tries> <log> <cmd...>
N=$1; LOG=$2; shift 2
i=0
while [ $i -lt "$N" ]; do
  "$@" > "$LOG" 2>&1 && { tail -3 "$LOG"; exit 0; }
  grep -q DEFERRED "$LOG" || { tail -20 "$LOG"; exit 1; }
  i=$((i + 1)); sleep 60
done
echo "not admitted after $N tries"; exit 1
