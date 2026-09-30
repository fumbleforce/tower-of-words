#!/usr/bin/env bash
set -euo pipefail
attempt=${1:-attempt-03}
if compgen -G "art/parts/astra/$attempt/renders/*.png" > /dev/null; then
  echo "Choose a new attempt directory; existing renders are preserved." >&2; exit 73
fi
owner=codex-astra-creator
lock=/tmp/claude-1000/gpu.lock
mkdir "$lock" || exit 75
printf '%s\n' "$owner" > "$lock/owner"
trap 'if [[ -f "$lock/owner" ]] && [[ "$(cat "$lock/owner")" == "$owner" ]]; then rm -r "$lock"; fi' EXIT INT TERM
run() {
  [[ "$(cat "$lock/owner")" == "$owner" ]] || exit 76
  timeout 240 "$HOME/.local/bin/blender" -b -t 8 --python-exit-code 1 --factory-startup -P "tools/creator/astra/$1" -- "${@:2}"
}
mkdir -p "art/parts/astra/$attempt/source"
cp tools/creator/astra/*.py "art/parts/astra/$attempt/source/"
run prepare.py "$attempt" mio eric > "art/parts/astra/$attempt/prepare.log" 2>&1
"$HOME/ai/flat-venv/bin/python" tools/creator/astra/opaque.py "art/parts/astra/$attempt"
for body in mio eric; do
  python3 tools/creator/astra/idle.py "$body" "art/parts/astra/$attempt/$body-idle-source.glb"
  run build.py "$body" "$attempt" > "art/parts/astra/$attempt/$body-build.log" 2>&1
  run render.py "$body" "$attempt" dressed dressed front,three-quarter,side,back,face,face-3q,neck,neck-back,cuff,feet > "art/parts/astra/$attempt/$body-render.log" 2>&1
  run render.py "$body" "$attempt" bare bare front,three-quarter,side,back,neck,neck-back,hand,feet >> "art/parts/astra/$attempt/$body-render.log" 2>&1
  run render.py "$body" "$attempt" nohair nohair front,face,face-3q >> "art/parts/astra/$attempt/$body-render.log" 2>&1
  run render.py "$body" "$attempt" hoodinside hoodinside hood >> "art/parts/astra/$attempt/$body-render.log" 2>&1
  for pose in time0 time0.3 time0.6 time0.9 8 20 idle1 idle3; do
    run render.py "$body" "$attempt" "$pose" dressed front,three-quarter,side,back "$pose" >> "art/parts/astra/$attempt/$body-render.log" 2>&1
  done
done
