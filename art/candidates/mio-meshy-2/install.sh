#!/bin/sh
# Mio's candidate game files (reviews/mio-meshy-2, mio-2), made the way Kuro's, Aoi's and Emi's were
# (aoi-emi-meshy-2/install.sh): walk and run are Meshy's auto-rig clips, sit is Meshy's Chair_Sit_Idle_F on her rig,
# each with the embedded texture taken out (game3d/tools/slim_glb.py); base.webp is the texture Meshy painted styled
# from h1 (mio-2), base-d1.webp the one styled from d1 on the same UVs (mio-2-d1, the viewer's other texture). Then the approved relaxed-3 idle is baked onto
# her rig, as for the others (the server on 8771 must be up). They load only with ?mio=meshy2 (chibi.js mioBody)
# until Jørgen picks; her approved model stays in game3d/assets/mio/.
#   sh art/candidates/mio-meshy-2/install.sh        (run from the worktree root)
set -e
M=/home/jorgen/repo/japanese/art/parts/mio-meshy-2/meshy
G=game3d/assets/characters/mio2
PY=~/ai/sd/venv/bin/python
WT=$(pwd)
mkdir -p "$G"
python3 game3d/tools/slim_glb.py $M/mio-2b-texg-walking.glb "$G/walk.glb" $M/mio-2b-texg-running.glb "$G/run.glb" \
  $M/mio-2b-sit.glb "$G/sit.glb"
$PY - $M/mio-2b-texg.glb "$G/base.webp" $M/mio-2b-tex.glb "$G/base-d1.webp" <<'EOF'
import io, json, struct, sys
from PIL import Image
for src, dst in zip(sys.argv[1::2], sys.argv[2::2]):
    b = open(src, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n]); blob = b[28 + n:]
    bv = j['bufferViews'][j['images'][0]['bufferView']]
    im = Image.open(io.BytesIO(blob[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB')
    im.save(dst, quality=90, method=6)
EOF
# the colour tweak toward the portrait's dark green (mio-2-green)
$PY art/candidates/mio-meshy-2/green.py "$G/base.webp" "$G/base-green.webp"
# the approved idle, baked onto her rig (as carina-meshy-1/install.sh: the exporter reads the creator's source models
# through the served worktree; it also rewrites Eric's and Mio's idles, which stay as committed)
S=/home/jorgen/repo/japanese/art/parts/src
mkdir -p art/parts/src/mio art/parts/candidates
LINKS="art/parts/src/eric art/parts/src/mio/mesh.glb art/parts/src/mio/tex.webp art/parts/candidates/idle-neutral-3.glb"
ln -sfn $S/eric art/parts/src/eric; ln -sf $S/mio/mesh.glb art/parts/src/mio/mesh.glb; ln -sf $S/mio/tex.webp art/parts/src/mio/tex.webp
ln -sf /home/jorgen/repo/japanese/art/parts/candidates/idle-neutral-3.glb art/parts/candidates/idle-neutral-3.glb
SOURCE_BASE="http://127.0.0.1:8771/${WT#/home/jorgen/repo/japanese/}/" \
  IDLE_SOURCE=/home/jorgen/repo/japanese/art/parts/candidates/idle-neutral-3.glb \
  node tools/characters/export-approved-idle.mjs mio2 || { rm -f $LINKS; exit 1; }
rm -f $LINKS
git checkout game3d/assets/characters/relaxed-idle-eric.json game3d/assets/characters/relaxed-idle-mio.json
ls -la "$G"
