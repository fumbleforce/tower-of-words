#!/bin/sh
# Apply Jørgen's 2026-10-06 choice carina-2-r2-grey. The current game rig and
# corrected posture stay intact; earlier rebuild scripts remain diagnostics.
set -eu
SRC=art/parts/carina-meshy-1/r2/viewer/grey/base.webp
DST=game3d/assets/characters/carina
for file in walk.glb run.glb sit.glb; do test -f "$DST/$file"; done
cp "$SRC" "$DST/base.webp"
