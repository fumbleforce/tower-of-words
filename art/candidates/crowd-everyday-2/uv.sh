#!/bin/sh
# Face-first UV layout (art/candidates/kuro-meshy-orig-3/uv_bl.py, as crowd-pilot-1/2 used) on each shape, in Blender
# headless under the GPU lock. Writes <cand>-uv.glb next to the shape in the main checkout's
# art/parts/crowd-everyday-2/meshy/.  sh art/candidates/crowd-everyday-2/uv.sh casual-1 casual-2 ...
set -e
D=/home/jorgen/repo/japanese/art/parts/crowd-everyday-2/meshy
UV=/home/jorgen/repo/japanese/art/candidates/kuro-meshy-orig-3/uv_bl.py
for c in "$@"; do
  blender -b -P $UV -- $D/$c.glb $D/$c-uv.glb 2>&1 | grep -E "face polygons|WROTE|Error" || true
done
