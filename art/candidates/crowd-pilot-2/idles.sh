#!/bin/sh
# The approved relaxed-3 idle baked onto each of the round's models (tools/characters/export-approved-idle.mjs, as for
# the cast), into the main checkout's art/parts/crowd-pilot-2/game/<m>/idle.json. The exporter reads
# game3d/assets/characters/<id>/, so the files are staged there as crowd2-<m> for the run only and removed after
# (nothing stays in game3d/). GL=soft runs the browser on the CPU. Run from the worktree root after
# tools/worktree.sh setup (Eric's, Mio's and the idle source's files linked in); the server on 8771 must be up.
#   sh art/candidates/crowd-pilot-2/idles.sh a b
set -e
A=/home/jorgen/repo/japanese/art/parts/crowd-pilot-2/game
WT=$(pwd)
IDS=""
for m in "$@"; do
  mkdir -p game3d/assets/characters/crowd2-$m
  cp $A/$m/walk.glb $A/$m/base.webp game3d/assets/characters/crowd2-$m/
  IDS="$IDS crowd2-$m"
done
SOURCE_BASE="http://127.0.0.1:8771/${WT#/home/jorgen/repo/japanese/}/" \
  IDLE_SOURCE=/home/jorgen/repo/japanese/art/parts/candidates/idle-neutral-3.glb \
  node tools/characters/export-approved-idle.mjs $IDS || true
for m in "$@"; do
  [ -f game3d/assets/characters/relaxed-idle-crowd2-$m.json ] && mv game3d/assets/characters/relaxed-idle-crowd2-$m.json $A/$m/idle.json
  rm -rf game3d/assets/characters/crowd2-$m
done
git checkout game3d/assets/characters/relaxed-idle-eric.json game3d/assets/characters/relaxed-idle-mio.json
ls -la $A/*/idle.json
