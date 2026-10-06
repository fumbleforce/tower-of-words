#!/bin/sh
# The sheets for reviews/carina-meshy-1, in the review's order, into the main checkout's art/parts/carina-meshy-1/sheets/
# (kuro-meshy-orig-2/sheet.py). Every ChatGPT take in order with its label; then renders of the real models.
# carina-2 (from Jørgen's approved picture, in the game) first; carina-1 (from round 6 tile 3, made before) after.
#   sh art/candidates/carina-meshy-1/sheets.sh pictures     the ChatGPT steps, Meshy's previews and the UV layouts (CPU)
#   sh art/candidates/carina-meshy-1/sheets.sh model        renders, rig and viewer stills (after renders.sh and the shots)
#   sh art/candidates/carina-meshy-1/sheets.sh r2           carina-2 round 2 before/after (after closeups.sh before, after-denim, after-grey)
HERE=$(cd "$(dirname "$0")" && pwd)
R=/home/jorgen/repo/japanese
A=$R/art/parts/carina-meshy-1
S=$A/sheets
P=$A/pics
D=$A/diag
mkdir -p "$S"
sheet() { python3 "$HERE/../kuro-meshy-orig-2/sheet.py" "$@"; }
if [ "$1" = r2 ]; then
  # carina-2 round 2: before/after close-ups (closeups.sh) for the seam, the head and the trousers
  C=$A/r2/close
  B=$C/before; N=$C/after-denim; G=$C/after-grey
  # the seam alone first (still black trousers, closeup of r2/model/seam.glb), then with the new trousers
  F=$C/after-seam
  sheet $S/r2-seam.webp 420 "before, front=$B/waist/y0.png" "before, 3/4 (her right)=$B/waist/y-30.png" \
    "seam fixed, front=$F/waist/y0.png" "seam fixed, 3/4 (her right)=$F/waist/y-30.png" \
    "seam fixed, 3/4 (her left)=$F/waist/y30.png" "seam fixed, side=$F/waist/y90.png" "seam fixed, back=$F/waist/y180.png" \
    "with the denim, front=$N/waist/y0.png"
  sheet $S/r2-head.webp 420 "before=$B/body/y0.png" "after (head 0.85)=$N/body/y0.png" "before, side=$B/body/y90.png" \
    "after, side=$N/body/y90.png"
  sheet $S/r2-face.webp 420 "before=$B/head/y0.png" "after=$N/head/y0.png" "before, 3/4=$B/head/y40.png" \
    "after, 3/4=$N/head/y40.png" "after, other 3/4=$N/head/y-40.png" "after, back=$N/head/y180.png"
  sheet $S/r2-trousers.webp 420 "before, black=$B/legs/y0.png" "dark denim blue (installed)=$N/legs/y0.png" \
    "mid-grey (alternative)=$G/legs/y0.png" "denim, 3/4=$N/legs/y45.png" "grey, 3/4=$G/legs/y45.png" "denim, back=$N/legs/y180.png"
  sheet $S/r2-body.webp 420 "before=$B/body/y45.png" "after, dark denim blue=$N/body/y45.png" \
    "after, mid-grey=$G/body/y45.png" "after, denim, back=$N/body/y180.png"
  sheet $S/r2-walk.webp 360 "walk, side, frame 1=$N/walk/f1-y90.png" "6=$N/walk/f6-y90.png" "11=$N/walk/f11-y90.png" \
    "16=$N/walk/f16-y90.png" "21=$N/walk/f21-y90.png" "26=$N/walk/f26-y90.png"
  sheet $S/r2-walk-front.webp 360 "walk, front, frame 1=$N/walk/f1-y0.png" "6=$N/walk/f6-y0.png" "11=$N/walk/f11-y0.png" \
    "16=$N/walk/f16-y0.png" "21=$N/walk/f21-y0.png" "26=$N/walk/f26-y0.png"
  sheet $S/r2-walk-head.webp 360 "head in the walk, front, frame 1=$N/walkhead/f1-y0.png" "11=$N/walkhead/f11-y0.png" \
    "21=$N/walkhead/f21-y0.png" "side, frame 1=$N/walkhead/f1-y90.png" "11=$N/walkhead/f11-y90.png" "21=$N/walkhead/f21-y90.png"
  exit
fi
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
