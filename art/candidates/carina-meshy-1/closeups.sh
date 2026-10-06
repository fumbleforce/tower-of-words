#!/bin/sh
# Before/after close-ups for carina-2 round 2 (closeup_bl.py, Cycles on the CPU), into the main checkout's
# art/parts/carina-meshy-1/r2/close/<name>/. Every model stood at 1.12 m, her game height, except the waist close-ups
# (metres as in the file, the same for both since the body is unchanged).
#   sh art/candidates/carina-meshy-1/closeups.sh <name> <walk glb>
HERE=art/candidates/carina-meshy-1
O=/home/jorgen/repo/japanese/art/parts/carina-meshy-1/r2/close/$1
G=$2
shot() { n=$1; shift; blender -b -t 8 --python-exit-code 1 -P $HERE/closeup_bl.py -- "$G" "$O/$n" "$@" 2>&1 | grep -E "RENDERED|rror"; }
shot body fit=1.12 z=0.56 dist=2.6 yaws=0,45,-45,180,90
shot head fit=1.12 z=0.82 dist=1.2 yaws=0,40,-40,90,180
shot legs fit=1.12 z=0.24 dist=1.3 yaws=0,45,-45,180
shot waist z=0.41 dist=0.6 lens=150 yaws=0,30,-30,90,-90,180
for f in 1 6 11 16 21 26; do
  shot walk fit=1.12 z=0.56 dist=1.9 yaws=0,90 frame=$f prefix=f$f-
  shot walkhead fit=1.12 z=0.8 dist=1.2 yaws=0,90 frame=$f prefix=f$f-
done
