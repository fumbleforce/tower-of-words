#!/bin/sh
# The viewer's and the in-game check's files for one model on Meshy's rig (Review crowd-pilot-2), in the layout the
# game loads (walk.glb, run.glb, sit.glb, base.webp; the idle comes from idles.sh), into the main checkout's
# art/parts/crowd-pilot-2/game/<m>/. Meshy's auto-rig, its walk and run, its Chair_Sit_Idle_F, all with new skin
# weights (reweight.py, needs Blender: hold the GPU lock); each slimmed of its embedded texture (game3d/tools/slim_glb.py);
# base.webp is the texture as Meshy painted it. Nothing goes into game3d/.
#   sh art/candidates/crowd-pilot-2/install.sh <m> <rigged.glb> <walking.glb> <running.glb> <sit.glb>   (from the worktree root)
set -e
M=$1; RIG=$2; WALK=$3; RUN=$4; SIT=$5
A=/home/jorgen/repo/japanese/art/parts/crowd-pilot-2
PY=~/ai/sd/venv/bin/python
HERE=art/candidates/crowd-pilot-2
mkdir -p $A/game/$M $A/rig
$PY $HERE/reweight.py "$RIG" $A/rig/$M-rigged.glb "$WALK" $A/rig/$M-walk.glb "$RUN" $A/rig/$M-run.glb "$SIT" $A/rig/$M-sit.glb
python3 game3d/tools/slim_glb.py $A/rig/$M-walk.glb $A/game/$M/walk.glb $A/rig/$M-run.glb $A/game/$M/run.glb \
  $A/rig/$M-sit.glb $A/game/$M/sit.glb
$PY - "$RIG" $A/game/$M/base.webp <<'EOF'
import io, json, struct, sys
from PIL import Image
b = open(sys.argv[1], 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n]); blob = b[28 + n:]
bv = j['bufferViews'][j['images'][0]['bufferView']]
im = Image.open(io.BytesIO(blob[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB')
im.save(sys.argv[2], quality=90, method=6)
EOF
ls -la $A/game/$M
