#!/bin/sh
# The sheets for reviews/mio-meshy-2, in the review's order, into the main checkout's art/parts/mio-meshy-2/sheets/
# (kuro-meshy-orig-2/sheet.py). Every ChatGPT take in order with its label; then renders of the real models.
#   sh art/candidates/mio-meshy-2/sheets.sh pictures   the ChatGPT steps, Meshy's previews and the UV layouts (CPU)
#   sh art/candidates/mio-meshy-2/sheets.sh shapes     untextured shape turnarounds
#   sh art/candidates/mio-meshy-2/sheets.sh model      textured turnarounds, faces, rig and viewer stills
HERE=$(cd "$(dirname "$0")" && pwd)
R=/home/jorgen/repo/japanese
A=$R/art/parts/mio-meshy-2
S=$A/sheets
P=$A/pics
D=$A/diag
mkdir -p "$S"
sheet() { python3 "$HERE/../kuro-meshy-orig-2/sheet.py" "$@"; }
turn() { N=$A/renders/$2
  sheet $S/$1.webp 420 front=$N/front.png "3/4, her left side turned to us=$N/l45.png" "side=$N/l90.png" back=$N/back.png \
    "3/4, her right side turned to us=$N/r45.png" face=$N/face.png "face 3/4=$N/face-l40.png"; }
case "$1" in
pictures)
  sheet $S/inputs.webp 520 "attached 1: her approved portrait (mio-after)=$R/art/approved/mio/mio-after.webp" \
    "attached 2: your Mio chibi=$R/tools/characters/ref/mio-chibi-34.png"
  sheet $S/steps.webp 400 "a1 (step 1)=$P/a1.png" "b1 (step 2)=$P/b1.png" "c1 (step 3, no glasses)=$P/c1.png" \
    "d1 (angle, after c1)=$P/d1.png" "g1 (step 3, glasses kept)=$P/g1.png" "h1 (angle, after g1)=$P/h1.png"
  sheet $S/uv.webp 560 "face piece (red)=$D/uv-face-2b.png" "texture styled from h1 (mio-2)=$D/atlas-texg.png" \
    "texture styled from d1=$D/atlas-tex.png"
  ;;
shapes)
  shape() { N=$A/renders/$2
    sheet $S/$1.webp 420 front=$N/front.png "3/4, her left side turned to us=$N/l45.png" "side, her left=$N/l90.png" back=$N/back.png \
      "3/4, her right side turned to us=$N/r45.png"; }
  shape shape2 shape2; shape shape3 shape3; shape shape2b shape2b ;;
model)
  for n in "$@"; do [ "$n" = model ] || turn turn-$n $n; done ;;
viewer)
  V=$A/viewer
  for s in now green textures; do
    sheet $S/viewer-$s.webp 520 "idle=$V/$s/idle-front.png" "idle, 3/4=$V/$s/idle-q.png" "idle, back=$V/$s/idle-back.png" \
      "walk=$V/$s/walk-front.png" "walk, side=$V/$s/walk-side.png" "sit=$V/$s/sit-front.png" "sit, side=$V/$s/sit-side.png" \
      "face=$V/$s/idle-face.png"
  done
  sheet $S/viewer-cast.webp 620 "idle=$V/cast/idle-front.png" "walk=$V/cast/walk-front.png" "walk, side=$V/cast/walk-side.png" ;;
game)
  G=$A/game
  sheet $S/game-train.webp 620 "mio-2 seated, laptop on her lap=$G/meshy2-1366x860/train-sit-1.jpg" \
    "mio-2, the story camera on her=$G/meshy2-1366x860/train-sit-close-1.jpg" \
    "mio-2 standing=$G/meshy2-1366x860/train-idle-close-1.jpg" \
    "Mio now, the same moment=$G/now-1366x860/train-sit-close-1.jpg"
  sheet $S/game-office.webp 620 "mio-2 at lunch in the machine room, beside her portrait=$G/meshy2-1366x860/office-sit-1.jpg" \
    "mio-2 seated, the story camera on her=$G/meshy2-1366x860/office-sit-close-1.jpg" \
    "mio-2 standing in the machine room=$G/meshy2-1366x860/office-idle-close-1.jpg" ;;
esac
