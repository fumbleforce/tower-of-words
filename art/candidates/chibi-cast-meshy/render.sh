#!/bin/sh
# Turnaround and face renders of Meshy attempts for reviews/chibi-cast-meshy-1 (Blender EEVEE, needs the GPU lock).
#   sh art/candidates/chibi-cast-meshy/render.sh kuro-1 eric-1 mio-1
# Reads the main checkout's art/parts/chibi-cast-meshy/meshy/<attempt>.glb, writes .../<attempt>/renders/.
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
ART=/home/jorgen/repo/japanese/art/parts/chibi-cast-meshy
for a in "$@"; do
  blender -b -t 8 --python-exit-code 1 -P "$ROOT/tools/characters/parts/render.py" -- \
    "$ART/meshy/$a.glb" "$ART/$a/renders" size=768 face_z=1.15 face_dist=1.5 2>&1 | grep -E "RENDERED|rror"
done
