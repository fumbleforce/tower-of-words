#!/bin/sh
# Historical texture-take install helper; re-bake idle afterward with export-approved-idle.mjs.
# The game files for Review crowd-pilot-3: round 2's rig, clips, weights and idle as they were (walk.glb, run.glb,
# sit.glb, idle.json from art/parts/crowd-pilot-2/game/<m>/), with the face take's texture as base.webp, into the main
# checkout's art/parts/crowd-pilot-3/game/<m>/. Nothing goes into game3d/.
#   sh art/candidates/crowd-pilot-3/install.sh <a|b> <take>
set -e
M=$1; T=$2
P2=/home/jorgen/repo/japanese/art/parts/crowd-pilot-2/game/$M
P3=/home/jorgen/repo/japanese/art/parts/crowd-pilot-3
mkdir -p $P3/game/$M
cp $P2/walk.glb $P2/run.glb $P2/sit.glb $P2/idle.json $P3/game/$M/
cp $P3/takes/$M-$T/base.webp $P3/game/$M/base.webp
echo "$M-$T" > $P3/game/$M/take.txt
ls -la $P3/game/$M
