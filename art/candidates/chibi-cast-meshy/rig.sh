#!/bin/sh
# Decimate Meshy attempts to 60,000 faces (Blender, CPU; UVs and texture kept) and send that copy to Meshy's auto-rig
# (5 credits each; height 1.0 m for the big chibi head), as in chibi-meshy-1.
#   sh art/candidates/chibi-cast-meshy/rig.sh kuro-1 eric-1 mio-1
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
M=/home/jorgen/repo/japanese/art/parts/chibi-cast-meshy/meshy
for a in "$@"; do
  blender -b -t 8 -P "$ROOT/tools/characters/parts/decimate.py" -- "$M/$a.glb" "$M/$a-60k.glb" faces=60000 2>&1 | grep -E "DECIMATED|rror"
  python3 "$ROOT/tools/characters/parts/meshy_part.py" rig "$a" height=1.0 round=chibi-cast-meshy model="$M/$a-60k.glb" 2>&1 | tail -n 1
done
