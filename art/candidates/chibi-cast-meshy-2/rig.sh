#!/bin/sh
# As round 1 (art/candidates/chibi-cast-meshy/rig.sh): decimate each Meshy attempt to 60,000 faces (Blender, CPU; UVs
# and texture kept) and send that copy to Meshy's auto-rig (5 credits each; height 1.0 m for the big chibi head).
#   sh art/candidates/chibi-cast-meshy-2/rig.sh mori-1 emi-1 ...
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
M=/home/jorgen/repo/japanese/art/parts/chibi-cast-meshy-2/meshy
for a in "$@"; do
  blender -b -t 8 -P "$ROOT/tools/characters/parts/decimate.py" -- "$M/$a.glb" "$M/$a-60k.glb" faces=60000 2>&1 | grep -E "DECIMATED|rror"
  python3 "$ROOT/tools/characters/parts/meshy_part.py" rig "$a" height=1.0 round=chibi-cast-meshy-2 \
    review=chibi-cast-meshy-2 model="$M/$a-60k.glb" 2>&1 | tail -n 1
done
