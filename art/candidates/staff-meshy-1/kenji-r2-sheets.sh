#!/bin/sh
# Round 2 sheets for reviews/kenji-meshy-1 (Jørgen on kenji-1: "he is too slim, doesnt look like himself"), into the
# main checkout's art/parts/kenji-meshy-1/sheets/r2-*.webp, after renders.sh kenji tex2 <kenji-2-tex.glb> and
# shots.mjs (ATTEMPT=kenji-2).
#   sh art/candidates/staff-meshy-1/kenji-r2-sheets.sh
HERE=$(cd "$(dirname "$0")" && pwd)
R=/home/jorgen/repo/japanese
A=$R/art/parts/kenji-meshy-1
K=$R/art/parts/kuro-meshy-orig-3
O=$R/art/parts/kuro-meshy-orig-1/renders
S=$A/sheets
sheet() { python3 "$HERE/../kuro-meshy-orig-2/sheet.py" "$@"; }
sheet $S/r2-steps.webp 480 "d1 (round 1, attached)=$A/pics/d1.png" "e1=$A/pics/e1.png" "e2, picked=$A/pics/e2.png" \
  "e3 (hand in pocket)=$A/pics/e3.png" "his portrait=$R/game3d/assets/portraits/kenji-neutral.webp"
sheet $S/r2-shape-previews.webp 420 front=$A/meshy/kenji-2-front.png left=$A/meshy/kenji-2-left.png right=$A/meshy/kenji-2-right.png back=$A/meshy/kenji-2-back.png
sheet $S/r2-uv.webp 560 "face piece (red)=$A/diag/uv-face-2.png" "UV layout=$A/diag/uv-tex2.png" "Meshy's texture on it=$A/diag/atlas-tex2.png"
sheet $S/r2-tex.webp 520 front=$A/renders/tex2/front.png "3/4, the left side of the image=$A/renders/tex2/l45.png" "side=$A/renders/tex2/l90.png" \
  back=$A/renders/tex2/back.png "3/4, the right side of the image=$A/renders/tex2/r45.png" face=$A/renders/tex2/face.png
sheet $S/r2-before-after.webp 560 "round 1 (kenji-1)=$A/renders/tex/front.png" "round 2 (kenji-2)=$A/renders/tex2/front.png" \
  "round 1, 3/4=$A/renders/tex/r45.png" "round 2, 3/4=$A/renders/tex2/r45.png"
sheet $S/r2-faces.webp 470 "from below, image left=$A/renders/chin-tex2/kenji-right.png" "from below=$A/renders/chin-tex2/kenji-front.png" \
  "from below, image right=$A/renders/chin-tex2/kenji-left.png"
sheet $S/r2-compare.webp 640 "kenji-2=$A/renders/tex2/front.png" "Eric (in game)=$O/eric/front.png" "Mio (in game)=$O/mio/front.png" "Kuro=$K/renders/tex/front.png"
V=$A/viewer/kenji-2
sheet $S/r2-viewer.webp 430 rest=$V/rest-0.png idle=$V/idle-0.png walk=$V/walk-0.png "walk, side=$V/walk-157.png"
