#!/bin/sh
# Offline pose checks (CPU, rei-rig-1/posecheck.py) of both rigs of both models, into the main checkout's
# art/parts/crowd-pilot-1/diag/<m>-<rig>-<clip>.png, printing how far head, chest and hips turn over each clip.
#   sh art/candidates/crowd-pilot-1/posechecks.sh
A=/home/jorgen/repo/japanese/art/parts/crowd-pilot-1
PC=art/candidates/rei-rig-1/posecheck.py
PY=~/ai/sd/venv/bin/python
cd "$(dirname "$0")/../../.." || exit 1
for m in a b; do
  for c in walk run sit; do
    echo "$m own $c"; $PY $PC $A/rig-own/$m-$c.glb $A/diag/$m-own-$c.png 6
  done
  echo "$m meshy walk"; $PY $PC $A/meshy/$m-1-tex-walking.glb $A/diag/$m-meshy-walk.png 6
  echo "$m meshy run"; $PY $PC $A/meshy/$m-1-tex-running.glb $A/diag/$m-meshy-run.png 6
  echo "$m meshy sit"; $PY $PC $A/meshy/$m-sit.glb $A/diag/$m-meshy-sit.png 6
done
