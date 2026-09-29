#!/bin/sh
# Same as tools/with-browser-lock.sh (GUIDE: one headless browser at a time), retrying every second.
#   sh game3d/tools/perf/locked.sh <name> <command...>
name=$1; shift
L=/tmp/claude-1000/browser.lock
until mkdir "$L" 2>/dev/null; do sleep 1; done
echo "$name $(date -u +%FT%TZ)" > "$L/owner"
trap 'grep -q "^$name " "$L/owner" 2>/dev/null && rm -r "$L"' EXIT INT TERM
"$@"
