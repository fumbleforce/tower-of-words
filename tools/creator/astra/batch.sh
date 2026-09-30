#!/usr/bin/env bash
# One bounded, exclusive Blender batch. Never steals or waits on somebody else's lock.
set -euo pipefail
attempt=${1:-attempt-01}
mkdir -p "art/parts/astra/$attempt/source"
if compgen -G "art/parts/astra/$attempt/renders/*.png" > /dev/null; then
  echo "Choose a new attempt directory; existing renders are preserved." >&2; exit 73
fi
owner=codex-astra-creator
lock=/tmp/claude-1000/gpu.lock
mkdir "$lock" || { echo 'GPU busy; run this batch after the current owner releases it.' >&2; exit 75; }
printf '%s\n' "$owner" > "$lock/owner"
trap 'if [[ -f "$lock/owner" ]] && [[ "$(cat "$lock/owner")" == "$owner" ]]; then rm -r "$lock"; fi' EXIT INT TERM
run() {
  [[ "$(cat "$lock/owner")" == "$owner" ]] || exit 76
  timeout 240 "$HOME/.local/bin/blender" -b -t 8 --python-exit-code 1 --factory-startup -P "tools/creator/astra/$1" -- "${@:2}"
}
if [[ ! -f art/parts/astra/$attempt/eric-face.json ]]; then
  run prepare.py "$attempt" mio eric > art/parts/astra/$attempt/prepare.log 2>&1
fi
"$HOME/ai/flat-venv/bin/python" tools/creator/astra/opaque.py art/parts/astra/$attempt
cp tools/creator/astra/*.py "art/parts/astra/$attempt/source/"
for body in mio eric; do
  run build.py "$body" "$attempt" > "art/parts/astra/$attempt/$body-build.log" 2>&1
  run render.py "$body" "$attempt" dressed dressed front,three-quarter > "art/parts/astra/$attempt/$body-render.log" 2>&1
  run render.py "$body" "$attempt" bare bare front,side >> "art/parts/astra/$attempt/$body-render.log" 2>&1
done
