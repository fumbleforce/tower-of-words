#!/bin/sh
# Turnaround and face renders for reviews/mio-meshy-2: the same script, camera and light as Kuro's, Aoi's, Emi's and
# Carina's rounds (tools/characters/parts/render.py, face_z=1.15 face_dist=1.5 as aoi-emi-meshy-1/render.sh).
# ENGINE=cycles renders on the CPU (no GPU lock); the default is EEVEE, which needs the GPU lock.
#   sh art/candidates/mio-meshy-2/render.sh <name>=<model.glb> ...
# Writes the main checkout's art/parts/mio-meshy-2/renders/<name>/.
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
ART=/home/jorgen/repo/japanese/art/parts/mio-meshy-2
for pair in "$@"; do
  name=${pair%%=*}; glb=${pair#*=}
  blender -b -t 8 --python-exit-code 1 -P "$ROOT/tools/characters/parts/render.py" -- \
    "$glb" "$ART/renders/$name" size=768 face_z=1.15 face_dist=1.5 ${ENGINE:+engine=$ENGINE} 2>&1 | grep -E "RENDERED|rror"
done
