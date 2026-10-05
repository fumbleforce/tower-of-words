#!/bin/sh
# Renders for reviews/<id>-meshy-1, from the textured (not yet rigged) model, with the scripts, camera and light of
# Kuro's, Aoi's and Emi's rounds (tools/characters/parts/render.py; aoi-emi-meshy-1/chin_bl.py;
# kuro-meshy-orig-3/front_bl.py, grid.py, uvstats.py), into the main checkout's art/parts/<id>-meshy-1/:
# renders/<name>/ (turnaround and face), renders/measure/<name>.png (straight-on, for the head share),
# renders/chin-<name>/ (from below, texture colours only), diag/uv-<name>.png and atlas-<name>.png.
# Blender: hold the GPU lock.
#   sh art/candidates/staff-meshy-1/renders.sh <id> <name> <tex.glb> [chin=0.57] [tex=<image>]
HERE=$(cd "$(dirname "$0")" && pwd)
C=$1; NAME=$2; TEX=$3; CHIN=${4:-0.57}; T=$5
ROOT=$(cd "$HERE/../../.." && pwd)
A=/home/jorgen/repo/japanese/art/parts/$C-meshy-1
K=$HERE/../kuro-meshy-orig-3
PY=~/ai/sd/venv/bin/python
mkdir -p "$A/diag" "$A/renders/measure" "$A/renders/chin-$NAME"
blender -b -t 8 --python-exit-code 1 -P "$ROOT/tools/characters/parts/render.py" -- \
  "$TEX" "$A/renders/$NAME" size=768 face_z=1.15 face_dist=1.5 2>&1 | grep -E "RENDERED|rror"
blender -b -P "$K/front_bl.py" -- "$TEX" "$A/renders/measure/$NAME.png" 2>&1 | grep -E "HEIGHT|rror"
$PY "$K/grid.py" "$A/renders/measure/$NAME.png" "$A/renders/measure/$NAME-grid.png"
blender -b -P "$HERE/../aoi-emi-meshy-1/chin_bl.py" -- "$TEX" "$A/renders/chin-$NAME/$C" chin=$CHIN ${T:+"$T"} 2>&1 | grep -E "WROTE|rror"
$PY "$K/uvstats.py" layout "$TEX" "$A/diag/uv-$NAME.png"
$PY - "$TEX" "$A/diag/atlas-$NAME.png" <<'EOF'
import io, json, struct, sys
from PIL import Image
b = open(sys.argv[1], 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n]); blob = b[28 + n:]
bv = j['bufferViews'][j['images'][0]['bufferView']]
Image.open(io.BytesIO(blob[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB').save(sys.argv[2])
EOF
