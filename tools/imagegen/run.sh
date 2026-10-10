#!/usr/bin/env bash
# Start the image gen dashboard on http://127.0.0.1:8772/ (Ctrl+C stops it and ends any GPU session it holds).
#   --bg       run it in the background (log: island/private/imagegen/server.out)
#   --restart  restart a running dashboard on new code: waits until nothing is queued or rendering, keeps the
#              GPU session and ComfyUI (the new server picks them up), then starts in the background
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
PY="$HOME/ai/sd/venv/bin/python"
[ -x "$PY" ] || PY=python3
URL="http://127.0.0.1:8772/"
OUT="$REPO/island/private/imagegen/server.out"
mkdir -p "$REPO/island/private/imagegen"

if [ "$1" = "--restart" ]; then
  PID=$(ss -ltnp 2>/dev/null | grep ':8772 ' | grep -o 'pid=[0-9]*' | cut -d= -f2 | head -1)
  if [ -n "$PID" ]; then
    while true; do
      BUSY=$(curl -s -m 3 "${URL}api/state" | "$PY" -c 'import json,sys; d=json.load(sys.stdin); print(d["queued"]+d["running"])' 2>/dev/null || echo 0)
      [ "$BUSY" = "0" ] && break
      echo "Waiting: $BUSY job(s) queued or rendering"; sleep 5
    done
    kill -HUP "$PID"
    for _ in $(seq 1 20); do ss -ltn | grep -q ':8772 ' || break; sleep 0.5; done
  fi
  set -- --bg
fi

if curl -s -m 1 -o /dev/null "${URL}api/state"; then
  echo "Already running: $URL"
  exit 0
fi
if [ "$1" = "--bg" ]; then
  nohup "$PY" "$HERE/server.py" >> "$OUT" 2>&1 &
  sleep 1
  echo "Image gen dashboard: $URL"
else
  echo "Image gen dashboard: $URL"
  exec "$PY" "$HERE/server.py"
fi
