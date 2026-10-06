#!/bin/sh
# carina-2 round 2 (reviews/carina-meshy-1): the Blender edits (fix_bl.py) and our rig on them (rig.py), into the main
# checkout's art/parts/carina-meshy-1/r2/. CPU only.
#   sh art/candidates/carina-meshy-1/r2.sh models     seam alone, then seam + head 0.85 + trousers, denim and grey
#   sh art/candidates/carina-meshy-1/r2.sh rig        our rig with Emi's walk, run and sit on both round-2 models
HERE=art/candidates/carina-meshy-1
M=/home/jorgen/repo/japanese/art/parts/carina-meshy-1
R=$M/r2
PY=~/ai/sd/venv/bin/python
WT=$(pwd)
mkdir -p $R/model $R/rig
fix() { blender -b --python-exit-code 1 -P $HERE/fix_bl.py -- $M/meshy/carina-2-tex-rigged.glb "$@" 2>&1 | grep -E "PIECES|SEAM|HEAD|TROUSERS|WROTE|rror"; }
if [ "$1" = models ]; then
  fix $R/model/seam.glb seam=1
  fix $R/model/carina-2r2-denim.glb seam=1 head=0.85 trousers=denim
  fix $R/model/carina-2r2-grey.glb seam=1 head=0.85 trousers=grey
fi
if [ "$1" = rig ]; then
  for t in denim grey; do
    for c in walk run sit; do
      $PY $HERE/rig.py $R/model/carina-2r2-$t.glb "$WT/game3d/assets/characters/emi/$c.glb" $R/rig/carina2r2-$t-$c.glb model=carina-2
    done
  done
fi
