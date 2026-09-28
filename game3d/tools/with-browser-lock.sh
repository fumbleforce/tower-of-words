#!/bin/sh
# Run one headless-browser command under the shared browser lock (GUIDE, Process: one headless browser at a time).
#   sh game3d/tools/with-browser-lock.sh <name> <command...>
# Waits for the lock (retrying every 10 s), runs the command, and always releases the lock it took.
name=$1; shift
L=/tmp/claude-1000/browser.lock
until mkdir "$L" 2>/dev/null; do sleep 10; done
echo "$name" > "$L/owner"
trap 'grep -q "$name" "$L/owner" 2>/dev/null && rm -r "$L"' EXIT INT TERM
"$@"
