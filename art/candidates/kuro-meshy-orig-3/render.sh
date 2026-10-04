#!/bin/sh
# Turnaround and face renders for reviews/kuro-meshy-orig-3 (Blender EEVEE, needs the GPU lock): the same script,
# camera and light as rounds 1 and 2 (tools/characters/parts/render.py), so all of them and Eric and Mio compare.
#   sh art/candidates/kuro-meshy-orig-3/render.sh <name>=<model.glb> ...
# Writes the main checkout's art/parts/kuro-meshy-orig-3/renders/<name>/.
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
ART=/home/jorgen/repo/japanese/art/parts/kuro-meshy-orig-3
for pair in "$@"; do
  name=${pair%%=*}; glb=${pair#*=}
  blender -b -t 8 --python-exit-code 1 -P "$ROOT/tools/characters/parts/render.py" -- \
    "$glb" "$ART/renders/$name" size=768 face_z=1.15 face_dist=1.5 2>&1 | grep -E "RENDERED|rror"
done
