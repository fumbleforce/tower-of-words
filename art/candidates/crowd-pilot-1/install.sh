#!/bin/sh
# The viewer's game files for one model on both rigs (Review crowd-pilot-1), in the layout the game loads
# (walk.glb, run.glb, sit.glb, base.webp, the relaxed-3 idle), into the main checkout's
# art/parts/crowd-pilot-1/game/<m>-own/ and <m>-meshy/. Nothing goes into game3d/.
#   (b) Meshy's: its auto-rig's walk and run, its Chair_Sit_Idle_F (staff-meshy-1/install.sh's way)
#   (a) ours:    rerig_gen.py on the same model with a donor's walk, run and sit (Hamada for A, Emi for B)
# Each without its embedded texture (game3d/tools/slim_glb.py); base.webp is the texture as Meshy painted it.
#   sh art/candidates/crowd-pilot-1/install.sh <a|b> <donor id>      (run from the worktree root; needs Blender, CPU)
set -e
M=$1; D=$2
A=/home/jorgen/repo/japanese/art/parts/crowd-pilot-1
P=$A/meshy/$M-1-tex
DON=/home/jorgen/repo/japanese/game3d/assets/characters/$D
PY=~/ai/sd/venv/bin/python
HERE=art/candidates/crowd-pilot-1
mkdir -p $A/game/$M-own $A/game/$M-meshy $A/rig-own
python3 game3d/tools/slim_glb.py "$P-walking.glb" $A/game/$M-meshy/walk.glb "$P-running.glb" $A/game/$M-meshy/run.glb \
  $A/meshy/$M-sit.glb $A/game/$M-meshy/sit.glb
$PY $HERE/joints_gen.py "$P-rigged.glb" $A/rig-own/$M-joints.json > $A/rig-own/$M-joints.txt
for c in walk run sit; do
  $PY $HERE/rerig_gen.py "$P-rigged.glb" "$DON/$c.glb" $A/rig-own/$M-$c.glb $A/rig-own/$M-joints.json
done
python3 game3d/tools/slim_glb.py $A/rig-own/$M-walk.glb $A/game/$M-own/walk.glb $A/rig-own/$M-run.glb $A/game/$M-own/run.glb \
  $A/rig-own/$M-sit.glb $A/game/$M-own/sit.glb
$PY - "$P-rigged.glb" $A/game/$M-own/base.webp <<'EOF'
import io, json, struct, sys
from PIL import Image
b = open(sys.argv[1], 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n]); blob = b[28 + n:]
bv = j['bufferViews'][j['images'][0]['bufferView']]
im = Image.open(io.BytesIO(blob[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB')
im.save(sys.argv[2], quality=90, method=6)
EOF
cp $A/game/$M-own/base.webp $A/game/$M-meshy/base.webp
ls -la $A/game/$M-own $A/game/$M-meshy
