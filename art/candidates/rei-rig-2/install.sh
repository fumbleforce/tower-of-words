#!/bin/sh
# Rebuild the selected Rei mesh on donor-aligned bone axes, then map corrected
# Emi idle onto those same axes. Run the shared approved-idle exporter for Emi first.
set -eu
HERE=art/candidates/rei-rig-2
SHARED=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
M="$SHARED/art/parts/rei-meshy-1"
R="$SHARED/art/parts/rei-rig-2"
G=game3d/assets/characters/rei
PY=${RIG_PYTHON:-$HOME/ai/sd/venv/bin/python}
mkdir -p "$R/rig"
for clip in walk run sit; do
  "$PY" "$HERE/rerig2.py" "$M/meshy/rei-1-tex-rigged.glb" "game3d/assets/characters/emi/$clip.glb" \
    "$M/rig2/rei-walk-rig.json" "$R/rig/rei-$clip.glb"
  # Worktree assets may link to a shared immutable blob. Replace the link itself.
  if [ -L "$G/$clip.glb" ]; then rm "$G/$clip.glb"; fi
  python3 game3d/tools/slim_glb.py "$R/rig/rei-$clip.glb" "$G/$clip.glb"
done
"$PY" "$HERE/donor_idle.py" "$G/walk.glb" game3d/assets/characters/emi/walk.glb \
  game3d/assets/characters/relaxed-idle-emi.json game3d/assets/characters/relaxed-idle-rei.json
