#!/bin/sh
# Rei's game files on the fixed rig (rerig2.py): her rei-1 model as Meshy made it, round 1's joints and weights, the
# bones turned so Emi's walk, run and Chair_Sit_Idle_F put them in Emi's directions; each slimmed of its embedded
# texture (game3d/tools/slim_glb.py). base.webp is untouched. Then the approved relaxed-3 idle is baked onto the rig,
# as for the others (rei-rig-1/install.sh; the server on 8771 must be up).
#   sh art/candidates/rei-rig-2/install.sh        (run from the worktree root)
set -e
HERE=art/candidates/rei-rig-2
M=/home/jorgen/repo/japanese/art/parts/rei-meshy-1
R=/home/jorgen/repo/japanese/art/parts/rei-rig-2
G=game3d/assets/characters/rei
PY=~/ai/sd/venv/bin/python
WT=$(pwd)
mkdir -p $R/rig
for c in walk run sit; do
  $PY $HERE/rerig2.py $M/meshy/rei-1-tex-rigged.glb /home/jorgen/repo/japanese/game3d/assets/characters/emi/$c.glb \
    $M/rig2/rei-walk-rig.json $R/rig/rei-$c.glb
done
# the worktree's files are read-only links to main's: replace them with new files
rm -f "$G/walk.glb" "$G/run.glb" "$G/sit.glb"
python3 game3d/tools/slim_glb.py $R/rig/rei-walk.glb "$G/walk.glb" $R/rig/rei-run.glb "$G/run.glb" $R/rig/rei-sit.glb "$G/sit.glb"
S=/home/jorgen/repo/japanese/art/parts/src
mkdir -p art/parts/src/mio art/parts/candidates
LINKS="art/parts/src/eric art/parts/src/mio/mesh.glb art/parts/src/mio/tex.webp art/parts/candidates/idle-neutral-3.glb"
ln -sfn $S/eric art/parts/src/eric; ln -sf $S/mio/mesh.glb art/parts/src/mio/mesh.glb; ln -sf $S/mio/tex.webp art/parts/src/mio/tex.webp
ln -sf /home/jorgen/repo/japanese/art/parts/candidates/idle-neutral-3.glb art/parts/candidates/idle-neutral-3.glb
rm -f game3d/assets/characters/relaxed-idle-rei.json
SOURCE_BASE="http://127.0.0.1:8771/${WT#/home/jorgen/repo/japanese/}/" \
  IDLE_SOURCE=/home/jorgen/repo/japanese/art/parts/candidates/idle-neutral-3.glb \
  node tools/characters/export-approved-idle.mjs rei || { rm -f $LINKS; exit 1; }
rm -f $LINKS
git checkout game3d/assets/characters/relaxed-idle-eric.json game3d/assets/characters/relaxed-idle-mio.json
ls -la "$G" game3d/assets/characters/relaxed-idle-rei.json
