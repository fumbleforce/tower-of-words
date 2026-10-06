#!/bin/sh
# Round 2's model on Meshy's own auto-rig with mended weights (as Kenji round 3 and crowd-pilot-2), for the walk check
# against our rig: Meshy's walk, run and Chair_Sit_Idle_F (sit.py, 3 credits) copied onto the Blender-edited model
# (clips.py), new skin weights (crowd-pilot-2/reweight.py: Blender bone heat, head pieces on Head, shoes on the
# ankles), slimmed, into the main checkout's art/parts/carina-meshy-1/r2/meshyrig/<t>/ in the game's layout.
#   sh art/candidates/carina-meshy-1/meshyrig.sh denim|grey      (from the worktree root; after r2.sh models)
set -e
T=$1
HERE=art/candidates/carina-meshy-1
M=/home/jorgen/repo/japanese/art/parts/carina-meshy-1
O=$M/r2/meshyrig/$T
PY=~/ai/sd/venv/bin/python
SRC=$M/r2/model/carina-2r2-$T.glb
mkdir -p $O/rig
$PY $HERE/clips.py $SRC $M/meshy/carina-2-tex-walking.glb $O/rig/walk-in.glb
$PY $HERE/clips.py $SRC $M/meshy/carina-2-tex-running.glb $O/rig/run-in.glb
$PY $HERE/clips.py $SRC $M/meshy/carina-2-tex-sit.glb $O/rig/sit-in.glb
$PY art/candidates/crowd-pilot-2/reweight.py $O/rig/walk-in.glb $O/rig/walk.glb $O/rig/run-in.glb $O/rig/run.glb \
  $O/rig/sit-in.glb $O/rig/sit.glb
python3 game3d/tools/slim_glb.py $O/rig/walk.glb $O/walk.glb $O/rig/run.glb $O/run.glb $O/rig/sit.glb $O/sit.glb
cp $M/r2/model/carina-2r2-$T.png $O/base.png
$PY -c "from PIL import Image; Image.open('$O/base.png').convert('RGB').save('$O/base.webp', quality=90, method=6)"
ls -la $O
