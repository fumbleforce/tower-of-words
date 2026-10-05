#!/bin/sh
# Carina's game files (reviews/carina-meshy-1, carina-2) from her rig of ours (rig.py, as Rei's): her carina-2 model
# with the game's Meshy skeleton placed in her body and Emi's walk, run and Chair_Sit_Idle_F clips, each with the
# embedded texture taken out (game3d/tools/slim_glb.py); base.webp is the texture as Meshy painted it. Then the
# approved relaxed-3 idle is baked onto the rig, as for the others (rei-rig-1/install.sh; the server on 8771 must be up).
#   sh art/candidates/carina-meshy-1/install.sh        (run from the worktree root)
set -e
HERE=art/candidates/carina-meshy-1
M=/home/jorgen/repo/japanese/art/parts/carina-meshy-1
G=game3d/assets/characters/carina
PY=~/ai/sd/venv/bin/python
WT=$(pwd)
mkdir -p "$G" $M/rig
rm -f "$G"/*.json "$G"/idle.glb
for c in walk run sit; do
  $PY $HERE/rig.py $M/meshy/carina-2-tex-rigged.glb "$WT/game3d/assets/characters/emi/$c.glb" $M/rig/carina2-$c.glb model=carina-2
done
python3 game3d/tools/slim_glb.py $M/rig/carina2-walk.glb "$G/walk.glb" $M/rig/carina2-run.glb "$G/run.glb" $M/rig/carina2-sit.glb "$G/sit.glb"
$PY - $M/meshy/carina-2-tex.glb "$G/base.webp" <<'EOF'
import io, json, struct, sys
from PIL import Image
b = open(sys.argv[1], 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n]); blob = b[28 + n:]
bv = j['bufferViews'][j['images'][0]['bufferView']]
im = Image.open(io.BytesIO(blob[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB')
im.save(sys.argv[2], quality=90, method=6)
EOF
# the approved idle, baked onto her rig (the exporter reads the creator's source models through the served worktree;
# it also rewrites Eric's and Mio's idles, which stay as committed)
S=/home/jorgen/repo/japanese/art/parts/src
mkdir -p art/parts/src/mio art/parts/candidates
LINKS="art/parts/src/eric art/parts/src/mio/mesh.glb art/parts/src/mio/tex.webp art/parts/candidates/idle-neutral-3.glb"
ln -sfn $S/eric art/parts/src/eric; ln -sf $S/mio/mesh.glb art/parts/src/mio/mesh.glb; ln -sf $S/mio/tex.webp art/parts/src/mio/tex.webp
ln -sf /home/jorgen/repo/japanese/art/parts/candidates/idle-neutral-3.glb art/parts/candidates/idle-neutral-3.glb
SOURCE_BASE="http://127.0.0.1:8771/${WT#/home/jorgen/repo/japanese/}/" \
  IDLE_SOURCE=/home/jorgen/repo/japanese/art/parts/candidates/idle-neutral-3.glb \
  node tools/characters/export-approved-idle.mjs carina || { rm -f $LINKS; exit 1; }
rm -f $LINKS
git checkout game3d/assets/characters/relaxed-idle-eric.json game3d/assets/characters/relaxed-idle-mio.json
ls -la "$G"
