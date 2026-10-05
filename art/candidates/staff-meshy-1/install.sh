#!/bin/sh
# The game's files for one of the staff (Reviews <id>-meshy-1), made as Kuro's, Aoi's and Emi's were
# (aoi-emi-meshy-2/install.sh): walk and run are Meshy's auto-rig clips, sit is Meshy's Chair_Sit_Idle_F
# (`tools/characters/meshy.py anim <id> <rig task> 32 sit`), each with the embedded texture taken out
# (game3d/tools/slim_glb.py); base.webp is the texture, as Meshy painted it, or with dark marks on the skin under the
# jaw repainted (kuro-meshy-orig-3/cheek_fix.py) when cheek options are given. Then the approved relaxed-3 idle is
# baked onto the rig (tools/characters/export-approved-idle.mjs; the server on 8771 must be up).
#   sh art/candidates/staff-meshy-1/install.sh <id> <part, e.g. mori-1-tex> [cheek_fix options: lo=.. hi=.. skip=..]
# Run from the worktree root.
set -e
C=$1; P=$2; shift 2
A=/home/jorgen/repo/japanese/art/parts/$C-meshy-1/meshy
G=game3d/assets/characters/$C
WT=$(pwd)
mkdir -p "$G"
rm -f "$G"/*.json "$G"/idle.glb
python3 game3d/tools/slim_glb.py "$A/$P-walking.glb" "$G/walk.glb" "$A/$P-running.glb" "$G/run.glb" \
  "tools/characters/out/$C/meshy/anim-sit.glb" "$G/sit.glb"
if [ $# -gt 0 ]; then
  ~/ai/sd/venv/bin/python art/candidates/kuro-meshy-orig-3/cheek_fix.py "$A/$P-rigged.glb" "$G/base.webp" \
    "/home/jorgen/repo/japanese/art/parts/$C-meshy-1/diag/fix-mask.png" "$@"
else
  ~/ai/sd/venv/bin/python - "$A/$P-rigged.glb" "$G/base.webp" <<'EOF'
import io, json, struct, sys
from PIL import Image
b = open(sys.argv[1], 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n]); blob = b[28 + n:]
bv = j['bufferViews'][j['images'][0]['bufferView']]
im = Image.open(io.BytesIO(blob[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB')
im.save(sys.argv[2], quality=90, method=6)
EOF
fi
# the exporter reads the creator's source models (git-ignored, in the main checkout) through the served worktree;
# it also rewrites Eric's and Mio's idles, which stay as committed
S=/home/jorgen/repo/japanese/art/parts/src
mkdir -p art/parts/src/mio
LINKS="art/parts/src/eric art/parts/src/mio/mesh.glb art/parts/src/mio/tex.webp art/parts/candidates/idle-neutral-3.glb"
ln -sfn $S/eric art/parts/src/eric; ln -sf $S/mio/mesh.glb art/parts/src/mio/mesh.glb; ln -sf $S/mio/tex.webp art/parts/src/mio/tex.webp
mkdir -p art/parts/candidates; ln -sf /home/jorgen/repo/japanese/art/parts/candidates/idle-neutral-3.glb art/parts/candidates/idle-neutral-3.glb
SOURCE_BASE="http://127.0.0.1:8771/${WT#/home/jorgen/repo/japanese/}/" \
  IDLE_SOURCE=/home/jorgen/repo/japanese/art/parts/candidates/idle-neutral-3.glb \
  node tools/characters/export-approved-idle.mjs "$C" || { rm -f $LINKS; exit 1; }
rm -f $LINKS
git checkout game3d/assets/characters/relaxed-idle-eric.json game3d/assets/characters/relaxed-idle-mio.json
ls -la "$G"
