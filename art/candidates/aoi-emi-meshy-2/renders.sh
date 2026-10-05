#!/bin/sh
# Round 2 renders for reviews/aoi-meshy-1 or emi-meshy-1, from the textured round-2 model (the rigged one's bounds run
# past her feet, which shrinks her in the frame), the same scripts, camera and
# light as round 1 (aoi-emi-meshy-1/render.sh, chin_bl.py; kuro-meshy-orig-3/front_bl.py, grid.py, uvstats.py), into
# the main checkout's art/parts/<char>-meshy-1/: renders/tex2/ (turnaround and face), renders/measure/<char>-2.png
# (straight-on, for the head share), renders/chin2/ (from below, texture colours only), round2/uv.png and atlas.png.
# Blender: hold the GPU lock.
#   sh art/candidates/aoi-emi-meshy-2/renders.sh <aoi|emi> <tex.glb> <rigged.glb> [chin=0.57] [tex2]
# The last argument names the turnaround folder (tex2; Emi's fixed texture goes in tex2-fixed via a glb with it).
HERE=$(cd "$(dirname "$0")" && pwd)
C=$1; TEX=$2; RIG=$3; CHIN=${4:-0.57}; NAME=${5:-tex2}
A=/home/jorgen/repo/japanese/art/parts/$C-meshy-1
K=$HERE/../kuro-meshy-orig-3
PY=~/ai/sd/venv/bin/python
mkdir -p "$A/round2" "$A/renders/measure" "$A/renders/chin2"
sh "$HERE/../aoi-emi-meshy-1/render.sh" "$C" "$NAME=$TEX"
blender -b -P "$K/front_bl.py" -- "$TEX" "$A/renders/measure/$C-2.png" 2>&1 | grep -E "HEIGHT|rror"
$PY "$K/grid.py" "$A/renders/measure/$C-2.png" "$A/renders/measure/$C-2-grid.png"
blender -b -P "$HERE/../aoi-emi-meshy-1/chin_bl.py" -- "$TEX" "$A/renders/chin2/$C" chin=$CHIN 2>&1 | grep -E "WROTE|rror"
$PY "$K/uvstats.py" layout "$TEX" "$A/round2/uv.png"
$PY - "$TEX" "$A/round2/atlas.png" <<'EOF'
import io, json, struct, sys
from PIL import Image
b = open(sys.argv[1], 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n]); blob = b[28 + n:]
bv = j['bufferViews'][j['images'][0]['bufferView']]
Image.open(io.BytesIO(blob[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB').save(sys.argv[2])
EOF
