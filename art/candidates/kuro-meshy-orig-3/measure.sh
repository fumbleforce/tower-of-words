#!/bin/sh
# Straight-on orthographic pictures (front_bl.py, rest pose, full height fills the frame) of the in-game Eric and Mio
# and of Kuro rounds 2 and 3, with a row grid each (grid.py), to read off crown, chin and soles for the head-to-body
# ratio in reviews/kuro-meshy-orig-3. Blender: hold the GPU lock.
#   sh art/candidates/kuro-meshy-orig-3/measure.sh
HERE=$(cd "$(dirname "$0")" && pwd)
J=/home/jorgen/repo/japanese
O=$J/art/parts/kuro-meshy-orig-3/renders/measure
mkdir -p "$O"
front() { blender -b -P "$HERE/front_bl.py" -- "$@" 2>&1 | grep -E "HEIGHT|rror"; }
front "$J/game3d/assets/eric/walk.glb" "$O/eric.png" "$J/game3d/assets/eric/base.webp"
front "$J/game3d/assets/mio/walk.glb" "$O/mio.png" "$J/game3d/assets/mio/base-clean.webp"
front "$J/art/parts/kuro-meshy-orig-2/meshy/kuro-2-tex.glb" "$O/kuro-2.png"
front "$J/art/parts/kuro-meshy-orig-3/meshy/kuro-3b-tex.glb" "$O/kuro-3.png"
for n in eric mio kuro-2 kuro-3; do ~/ai/sd/venv/bin/python "$HERE/grid.py" "$O/$n.png" "$O/$n-grid.png"; done
