#!/bin/sh
# Turnaround and face renders for reviews/aoi-meshy-1 and emi-meshy-1 (Blender EEVEE, needs the GPU lock): the same
# script, camera and light as Kuro's rounds (tools/characters/parts/render.py), so they compare with Kuro, Eric and Mio.
#   sh art/candidates/aoi-emi-meshy-1/render.sh <aoi|emi> <name>=<model.glb> ...
# Writes the main checkout's art/parts/<char>-meshy-1/renders/<name>/.
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
ART=/home/jorgen/repo/japanese/art/parts/$1-meshy-1
shift
for pair in "$@"; do
  name=${pair%%=*}; glb=${pair#*=}
  blender -b -t 8 --python-exit-code 1 -P "$ROOT/tools/characters/parts/render.py" -- \
    "$glb" "$ART/renders/$name" size=768 face_z=1.15 face_dist=1.5 2>&1 | grep -E "RENDERED|rror"
done
