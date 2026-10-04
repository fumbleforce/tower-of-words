#!/bin/sh
# Straight-on orthographic pictures (kuro-meshy-orig-3/front_bl.py, full height fills the frame) of one
# character's textured model before rigging (the rigged glb's bounds run past her feet), with a row grid (kuro-meshy-orig-3/grid.py), to read off the chin row for ratios.py. The
# in-game Eric and Mio and Kuro round 3 were measured the same way in kuro-meshy-orig-3/measure.sh. Blender: hold the GPU lock.
#   sh art/candidates/aoi-emi-meshy-1/measure.sh <aoi|emi> <model.glb>
HERE=$(cd "$(dirname "$0")" && pwd)
K=$HERE/../kuro-meshy-orig-3
O=/home/jorgen/repo/japanese/art/parts/$1-meshy-1/renders/measure
mkdir -p "$O"
blender -b -P "$K/front_bl.py" -- "$2" "$O/$1.png" 2>&1 | grep -E "HEIGHT|rror"
~/ai/sd/venv/bin/python "$K/grid.py" "$O/$1.png" "$O/$1-grid.png"
