#!/bin/sh
# The whole pipeline for one body: face pictures, build, export, rig check.
#   sh tools/creator/blender/all.sh <body>
set -e
here=$(dirname "$0")
root=$(cd "$here/../../.." && pwd)
body=$1
sh "$here/bl.sh" face.py "$body"
sh "$here/bl.sh" build.py "$body"
sh "$here/bl.sh" export.py "$body" | grep EXPORTED
python3 "$here/check_rig.py" "$root/game3d/assets/$body/walk.glb" "$root/art/parts/blender/$body.glb" | tail -1
