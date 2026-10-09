#!/bin/sh
# The approved relaxed-3 idle baked onto each candidate's own rig (tools/characters/export-approved-idle.mjs, the same
# bake as the selected office pair: host rest frames, approved arms), read from and written to the main checkout's
# art/parts/crowd-everyday-2/game/<cand>/ (nothing in game3d/). Needs the server on 8771; one headless browser.
#   sh art/candidates/crowd-everyday-2/idles.sh casual-1 casual-2 ...   (from the worktree root)
set -e
G=/home/jorgen/repo/japanese/art/parts/crowd-everyday-2/game
OUT=/home/jorgen/repo/japanese/art/parts/crowd-everyday-2/idle-out
mkdir -p $OUT
IDLE_ONLY_EXTRA=1 IDLE_OUTPUT=$OUT CHARACTER_DIR=art/parts/crowd-everyday-2/game/ \
  IDLE_SOURCE=/home/jorgen/repo/japanese/art/parts/candidates/idle-neutral-3.glb \
  node tools/characters/export-approved-idle.mjs "$@"
for c in "$@"; do mv $OUT/relaxed-idle-$c.json $G/$c/idle.json; done
ls -la $G/*/idle.json
