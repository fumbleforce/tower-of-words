#!/bin/sh
# One attempt of reviews/char-mio-parts-1: assemble two Meshy parts, render the turnaround, make the sheet.
#   sh tools/characters/parts/attempt.sh <attempt> <body part> <head part> [assemble options ...]
# Parts are names in the main checkout's art/parts/char-mio-parts/meshy/ (body, body-t2, head, head-t2, ...).
set -e
cd "$(dirname "$0")/../../.."
A=$1; BODY=$2; HEAD=$3; shift 3
M=/home/jorgen/repo/japanese/art/parts/char-mio-parts/meshy
OUT=/home/jorgen/repo/japanese/art/parts/char-mio-parts/$A
blender -b -t 8 --python-exit-code 1 -P tools/characters/parts/assemble.py -- "$A" "$M/$BODY.glb" "$M/$HEAD.glb" "$@" 2>&1 | grep -E "ASSEMBLED|rror" || true
blender -b -t 8 --python-exit-code 1 -P tools/characters/parts/render.py -- "$OUT/mio-full.glb" "$OUT/renders" size=768 2>&1 | grep -E "RENDERED|rror" || true
~/ai/sd/venv/bin/python tools/characters/parts/sheet.py "$OUT/renders" "$OUT/sheet.webp" "$A"
