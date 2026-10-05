#!/bin/sh
# The approved relaxed-3 idle baked onto each of the round's four rigs (tools/characters/export-approved-idle.mjs, as
# for the cast), into the main checkout's art/parts/crowd-pilot-1/game/<rig>/idle.json. The exporter reads
# game3d/assets/characters/<id>/ through the served worktree, so the files are staged there as crowd-<rig> for the
# run only and removed after (nothing stays in game3d/). GL=soft runs the browser on the CPU.
#   sh art/candidates/crowd-pilot-1/idles.sh      (run from the worktree root; the server on 8771 must be up)
set -e
A=/home/jorgen/repo/japanese/art/parts/crowd-pilot-1/game
WT=$(pwd)
RIGS="a-own a-meshy b-own b-meshy"
IDS=""
for r in $RIGS; do
  mkdir -p game3d/assets/characters/crowd-$r
  cp $A/$r/walk.glb $A/$r/base.webp game3d/assets/characters/crowd-$r/
  IDS="$IDS crowd-$r"
done
# Eric's and Mio's game files (git-ignored binaries) from the main checkout, for this run only
MG=/home/jorgen/repo/japanese/game3d/assets
GLINKS=""
[ -e game3d/assets/eric ] || { ln -s $MG/eric game3d/assets/eric; GLINKS="game3d/assets/eric"; }
for f in $MG/mio/*; do
  n=game3d/assets/mio/$(basename $f)
  [ -e $n ] || { ln -s $f $n; GLINKS="$GLINKS $n"; }
done
S=/home/jorgen/repo/japanese/art/parts/src
mkdir -p art/parts/src/mio art/parts/candidates
LINKS="art/parts/src/eric art/parts/src/mio/mesh.glb art/parts/src/mio/tex.webp art/parts/candidates/idle-neutral-3.glb"
ln -sfn $S/eric art/parts/src/eric; ln -sf $S/mio/mesh.glb art/parts/src/mio/mesh.glb; ln -sf $S/mio/tex.webp art/parts/src/mio/tex.webp
ln -sf /home/jorgen/repo/japanese/art/parts/candidates/idle-neutral-3.glb art/parts/candidates/idle-neutral-3.glb
SOURCE_BASE="http://127.0.0.1:8771/${WT#/home/jorgen/repo/japanese/}/" \
  IDLE_SOURCE=/home/jorgen/repo/japanese/art/parts/candidates/idle-neutral-3.glb GL=soft \
  node tools/characters/export-approved-idle.mjs $IDS || true
rm -f $LINKS $GLINKS
for r in $RIGS; do
  [ -f game3d/assets/characters/relaxed-idle-crowd-$r.json ] && mv game3d/assets/characters/relaxed-idle-crowd-$r.json $A/$r/idle.json
  rm -rf game3d/assets/characters/crowd-$r
done
git checkout game3d/assets/characters/relaxed-idle-eric.json game3d/assets/characters/relaxed-idle-mio.json
ls -la $A/*/idle.json
