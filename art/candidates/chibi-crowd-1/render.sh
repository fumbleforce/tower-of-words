#!/bin/sh
# Turnaround and face renders of Meshy attempts for reviews/chibi-crowd-1 (Blender EEVEE, needs the GPU lock),
# the same camera and light as round 1 (art/candidates/chibi-cast-meshy/render.sh).
#   sh art/candidates/chibi-crowd-1/render.sh suit-1 polo-1 ...
# Reads the main checkout's art/parts/chibi-crowd-1/meshy/<attempt>.glb, writes .../<attempt>/renders/.
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
ART=/home/jorgen/repo/japanese/art/parts/chibi-crowd-1
for a in "$@"; do
  blender -b -t 8 --python-exit-code 1 -P "$ROOT/tools/characters/parts/render.py" -- \
    "$ART/meshy/$a.glb" "$ART/$a/renders" size=768 face_z=1.15 face_dist=1.5 2>&1 | grep -E "RENDERED|rror"
done
