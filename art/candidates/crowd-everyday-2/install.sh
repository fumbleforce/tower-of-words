#!/bin/sh
# Review files for one candidate of crowd-everyday-2, made as the approved office pair's were (crowd-pilot-2/install.sh):
# Meshy's rig, walk, run and Chair_Sit_Idle_F with new skin weights (crowd-pilot-2/reweight.py, Blender bone heat:
# hold the GPU lock), each slimmed of its embedded texture (game3d/tools/slim_glb.py), and base.webp, the texture as
# Meshy painted it. Into the main checkout's art/parts/crowd-everyday-2/game/<cand>/. Nothing goes into game3d/.
#   sh art/candidates/crowd-everyday-2/install.sh <cand>   (from the worktree root)
set -e
C=$1
A=/home/jorgen/repo/japanese/art/parts/crowd-everyday-2
M=$A/meshy
PY=~/ai/sd/venv/bin/python
mkdir -p $A/game/$C $A/rig
$PY art/candidates/crowd-pilot-2/reweight.py $M/$C-rigged.glb $A/rig/$C-rigged.glb $M/$C-walking.glb $A/rig/$C-walk.glb \
  $M/$C-running.glb $A/rig/$C-run.glb $M/$C-sit.glb $A/rig/$C-sit.glb
python3 game3d/tools/slim_glb.py $A/rig/$C-walk.glb $A/game/$C/walk.glb $A/rig/$C-run.glb $A/game/$C/run.glb \
  $A/rig/$C-sit.glb $A/game/$C/sit.glb
$PY - $M/$C-rigged.glb $A/game/$C/base.webp <<'EOF'
import io, json, struct, sys
from PIL import Image
b = open(sys.argv[1], 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n]); blob = b[28 + n:]
bv = j['bufferViews'][j['images'][0]['bufferView']]
im = Image.open(io.BytesIO(blob[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB')
im.save(sys.argv[2], quality=90, method=6)
EOF
ls -la $A/game/$C
