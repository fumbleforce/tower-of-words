#!/bin/sh
# The game's files for Aoi or Emi round 2, the way Kuro's were made (kuro-meshy-orig-3/cheek_fix.py's notes):
# walk and run are Meshy's auto-rig clips, sit is Meshy's Chair_Sit_Idle_F (`tools/characters/meshy.py anim <id>
# <rig task> 32 sit`), each with the embedded texture taken out (game3d/tools/slim_glb.py); base.webp is the texture.
# Aoi's is Meshy's as painted; Emi's has the grey-blue marks under her jaw repainted (cheek_fix.py with her band).
# The idle is `tools/characters/export-approved-idle.mjs <id>` afterwards.
#   sh art/candidates/aoi-emi-meshy-2/install.sh <aoi|emi>        (from the worktree root)
set -e
C=$1
A=/home/jorgen/repo/japanese/art/parts/$C-meshy-1/meshy
G=game3d/assets/characters/$C
mkdir -p "$G"
python3 game3d/tools/slim_glb.py "$A/$C-2-tex-walking.glb" "$G/walk.glb" "$A/$C-2-tex-running.glb" "$G/run.glb" \
  "tools/characters/out/$C/meshy/anim-sit.glb" "$G/sit.glb"
if [ "$C" = emi ]; then
  ~/ai/sd/venv/bin/python art/candidates/kuro-meshy-orig-3/cheek_fix.py "$A/$C-2-tex-rigged.glb" "$G/base.webp" \
    "/home/jorgen/repo/japanese/art/parts/emi-meshy-1/round2/fix-mask.png" lo=0.45 hi=0.65 skip=19,20,72,73
else
  ~/ai/sd/venv/bin/python - "$A/$C-2-tex-rigged.glb" "$G/base.webp" <<'EOF'
import io, json, struct, sys
from PIL import Image
b = open(sys.argv[1], 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n]); blob = b[28 + n:]
bv = j['bufferViews'][j['images'][0]['bufferView']]
im = Image.open(io.BytesIO(blob[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB')
im.save(sys.argv[2], quality=90, method=6)
EOF
fi
ls -la "$G"
