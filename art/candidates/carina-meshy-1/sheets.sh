#!/bin/sh
# The sheets for reviews/carina-meshy-1, in the review's order, into the main checkout's art/parts/carina-meshy-1/sheets/
# (kuro-meshy-orig-2/sheet.py). Every ChatGPT take in order with its label; then renders of the real models.
# carina-2 (from Jørgen's approved picture, in the game) first; carina-1 (from round 6 tile 3, made before) after.
#   sh art/candidates/carina-meshy-1/sheets.sh pictures     the ChatGPT steps, Meshy's previews and the UV layouts (CPU)
#   sh art/candidates/carina-meshy-1/sheets.sh model        renders, rig and viewer stills (after renders.sh and the shots)
HERE=$(cd "$(dirname "$0")" && pwd)
R=/home/jorgen/repo/japanese
A=$R/art/parts/carina-meshy-1
S=$A/sheets
P=$A/pics
D=$A/diag
mkdir -p "$S"
sheet() { python3 "$HERE/../kuro-meshy-orig-2/sheet.py" "$@"; }
if [ "$1" = pictures ]; then
  sheet $S/r9-inputs.webp 520 "attached 1: your picture of her (carina-9-jorgen)=$R/art/candidates/portraits/carina-9-jorgen/jorgen-r261005-203349-2fd-1.webp" \
    "attached 2: your Mio chibi=$R/tools/characters/ref/mio-chibi-34.png"
  sheet $S/r9-steps.webp 420 "na1 (step 1)=$P/na1.png" "nb1 (step 2)=$P/nb1.png" "nc1 (step 3)=$P/nc1.png" "nd1 (angle)=$P/nd1.png"
  sheet $S/shape2-previews.webp 420 front=$A/meshy/carina-2-front.png left=$A/meshy/carina-2-left.png \
    right=$A/meshy/carina-2-right.png back=$A/meshy/carina-2-back.png
  sheet $S/uv2.webp 560 "face piece (red)=$D/uv-face-2.png" "UV layout=$D/uv-uvonly-2.png" "Meshy's texture on it=$D/atlas-tex2.png"
  sheet $S/r6-inputs.webp 520 "attached 1: round 6 tile 3=$R/art/candidates/portraits/carina-6/carina6-03-final.webp" \
    "attached 2: your Mio chibi=$R/tools/characters/ref/mio-chibi-34.png"
  sheet $S/r6-steps.webp 420 "a1 (step 1)=$P/a1.png" "b1 (step 2)=$P/b1.png" "c1 (step 3)=$P/c1.png" "c2 (step 3 again)=$P/c2.png" \
    "r1 (roots, after c1)=$P/r1.png" "d1 (angle, after r1)=$P/d1.png"
  sheet $S/shape1-previews.webp 420 front=$A/meshy/carina-1-front.png left=$A/meshy/carina-1-left.png \
    right=$A/meshy/carina-1-right.png back=$A/meshy/carina-1-back.png
  sheet $S/uv1.webp 560 "face piece (red)=$D/uv-face.png" "UV layout=$D/uv-uvonly.png" "Meshy's texture on it=$D/atlas-tex.png"
  exit
fi
turn() { N=$A/renders/$2
  sheet $S/$1.webp 520 front=$N/front.png "3/4, the left side of the image=$N/l45.png" "side=$N/l90.png" back=$N/back.png \
    "3/4, the right side of the image=$N/r45.png" face=$N/face.png; }
turn turn2 tex2
turn turn1 tex
sheet $S/rig2.webp 560 "Meshy's skeleton (carina-2-meshy-rig)=$D/joints2-meshy.png" "ours (carina-2)=$D/joints2-ours.png"
sheet $S/rig1.webp 560 "Meshy's skeleton (carina-1-meshy-rig)=$D/joints-meshy.png" "ours (carina-1)=$D/joints-ours.png"
V=$A/viewer/carina-2
sheet $S/viewer2.webp 430 rest=$V/rest-0.png idle=$V/idle-0.png walk=$V/walk-0.png "walk, side=$V/walk-157.png" "walk, 3/4=$V/walk-60.png"
