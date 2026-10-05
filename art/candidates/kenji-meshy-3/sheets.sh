#!/bin/sh
# Round 3 sheets for reviews/kenji-meshy-1 (Jørgen on kenji-2: "his model is a bit broken, his hair is getting skin
# color due to aggressive lighting in reference"), into the main checkout's art/parts/kenji-meshy-1/sheets/r3-*.webp,
# after staff-meshy-1/renders.sh kenji tex3, reweight.py, weightmap.py, rei-rig-1/close-shots.mjs (kenji-2,
# kenji-3 (Meshy weights), kenji-3), ratios and staff-meshy-1/game-shots.mjs (WHO=kenji).
#   sh art/candidates/kenji-meshy-3/sheets.sh
HERE=$(cd "$(dirname "$0")" && pwd)
R=/home/jorgen/repo/japanese
A=$R/art/parts/kenji-meshy-1
K=$R/art/parts/kuro-meshy-orig-3
O=$R/art/parts/kuro-meshy-orig-1/renders
S=$A/sheets
G=$HERE/../../../game3d/shots/staff-meshy/kenji-day1-1366x860
sheet() { python3 "$HERE/../kuro-meshy-orig-2/sheet.py" "$@"; }
sheet $S/r3-steps.webp 480 "e2 (round 2, attached)=$A/pics/e2.png" "f1=$A/pics/f1.png" "f2=$A/pics/f2.png" "f3, picked=$A/pics/f3.png"
sheet $S/r3-shape-previews.webp 420 front=$A/meshy/kenji-3-front.png left=$A/meshy/kenji-3-left.png right=$A/meshy/kenji-3-right.png back=$A/meshy/kenji-3-back.png
sheet $S/r3-uv.webp 560 "face piece (red)=$A/diag/uv-face-3.png" "UV layout=$A/diag/uv-tex3.png" "Meshy's texture on it=$A/diag/atlas-tex3.png"
sheet $S/r3-tex.webp 520 front=$A/renders/tex3/front.png "3/4, the left side of the image=$A/renders/tex3/l45.png" "side=$A/renders/tex3/l90.png" \
  back=$A/renders/tex3/back.png "3/4, the right side of the image=$A/renders/tex3/r45.png" face=$A/renders/tex3/face.png
sheet $S/r3-before-after.webp 560 "round 2 (kenji-2)=$A/renders/tex2/front.png" "round 3 (kenji-3)=$A/renders/tex3/front.png" \
  "round 2, back=$A/renders/tex2/back.png" "round 3, back=$A/renders/tex3/back.png"
sheet $S/r3-weights.webp 520 "kenji-2, Meshy's weights=$A/diag/weights-2-meshy.png" "kenji-3, Meshy's weights=$A/diag/weights-3-meshy.png" \
  "kenji-3, mended=$A/diag/weights-3-fix.png"
V2=$A/viewer/close-2; V3m=$A/viewer/close-3-meshy; V3=$A/viewer/close-3
sheet $S/r3-walk.webp 430 "kenji-2 walk=$V2/walk-0.png" "kenji-2 walk, side=$V2/walk-157.png" \
  "kenji-3, Meshy's weights, walk=$V3m/walk-0.png" "kenji-3, Meshy's weights, walk, side=$V3m/walk-157.png" \
  "kenji-3 walk=$V3/walk-0.png" "kenji-3 walk, side=$V3/walk-157.png"
sheet $S/r3-viewer.webp 430 "rest=$V3/rest-0.png" "idle=$V3/idle-0.png" "idle, 3/4=$V3/idle-80.png" "idle, side=$V3/idle-157.png" \
  "idle, back=$V3/idle-314.png" "walk, 3/4=$V3/walk-80.png" "walk, back=$V3/walk-314.png"
sheet $S/r3-faces.webp 470 "from below, image left=$A/renders/chin-tex3/kenji-right.png" "from below=$A/renders/chin-tex3/kenji-front.png" \
  "from below, image right=$A/renders/chin-tex3/kenji-left.png"
sheet $S/r3-compare.webp 640 "kenji-3=$A/renders/tex3/front.png" "Eric (in game)=$O/eric/front.png" "Mio (in game)=$O/mio/front.png" "Kuro=$K/renders/tex/front.png"
sheet $S/r3-ingame.webp 520 "at his desk in B2 (day 1)=$G/office-kenji-close-1.jpg" "talking to Eric=$G/office-kenji-1.jpg"
