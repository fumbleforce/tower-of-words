#!/bin/sh
# Install the saved, corrected Carina model on its native Meshy rig. The earlier
# fitted rig is retained in r2/viewer/denim for diagnostics; it hyperextends knees.
# Run r2.sh models and meshyrig.sh denim first if rebuilding from source.
set -eu
SRC=art/parts/carina-meshy-1/r2/meshyrig/denim
DST=game3d/assets/characters/carina
mkdir -p "$DST"
for file in walk.glb run.glb sit.glb base.webp; do cp "$SRC/$file" "$DST/$file"; done
# The separately tracked approved idle is retained; its donor stance is under a
# shared cast review. Re-export it through tools/characters/export-approved-idle.mjs
# when that source is corrected.
