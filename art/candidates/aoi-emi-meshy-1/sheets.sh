#!/bin/sh
# Every sheet for reviews/aoi-meshy-1 or emi-meshy-1, in the review's order, into the main checkout's
# art/parts/<char>-meshy-1/sheets/ (Kuro round 2's sheet.py; all paths absolute).
#   sh art/candidates/aoi-emi-meshy-1/sheets.sh aoi|emi
HERE=$(cd "$(dirname "$0")" && pwd)
R=/home/jorgen/repo/japanese
C=$1
A=$R/art/parts/$C-meshy-1
K=$R/art/parts/kuro-meshy-orig-3
O=$R/art/parts/kuro-meshy-orig-1/renders
S=$A/sheets
mkdir -p "$S"
sheet() { python3 "$HERE/../kuro-meshy-orig-2/sheet.py" "$@"; }

sheet $S/step0-inputs.webp 520 "attached 1: her portrait=$R/game3d/assets/portraits/$C-neutral.webp" "attached 2: your Mio chibi=$R/tools/characters/ref/mio-chibi-34.png"
if [ "$C" = aoi ]; then
  sheet $S/steps.webp 420 "1: a1, picked=$A/pics/a1.png" "1: a2=$A/pics/a2.png" "2: b1, picked=$A/pics/b1.png" \
    "3: c1 (hand up)=$A/pics/c1.png" "3: c2 (0.42), picked=$A/pics/c2.png" "angle: d1 (hand up)=$A/pics/d1.png"
  M=0.43
else
  sheet $S/steps.webp 420 "1: a1=$A/pics/a1.png" "1: a2, picked=$A/pics/a2.png" "2: b1, picked=$A/pics/b1.png" \
    "3: c1 (0.47), picked=$A/pics/c1.png" "angle: d1 (glasses)=$A/pics/d1.png" "angle: d2 (glasses)=$A/pics/d2.png"
  M=0.48
fi
sheet $S/measure.webp 620 "Eric in game: 0.46=$K/renders/measure/eric.png" "Mio in game: 0.52=$K/renders/measure/mio.png" \
  "Kuro round 3: 0.41=$K/renders/measure/kuro-3.png" "$C: $M=$A/renders/measure/$C.png"
sheet $S/shape-previews.webp 420 front=$A/meshy/$C-1-front.png left=$A/meshy/$C-1-left.png right=$A/meshy/$C-1-right.png back=$A/meshy/$C-1-back.png
sheet $S/uv.webp 560 "face island (red)=$A/diag/uv-face.png" "UV layout=$A/diag/uv.png" "Meshy's texture on it=$A/diag/atlas-0.jpg"
sheet $S/tex.webp 520 front=$A/renders/tex/front.png "her left 3/4=$A/renders/tex/l45.png" "her left side=$A/renders/tex/l90.png" \
  back=$A/renders/tex/back.png "her right 3/4=$A/renders/tex/r45.png" face=$A/renders/tex/face.png
sheet $S/faces.webp 520 "face=$A/renders/tex/face.png" "face, her left 3/4=$A/renders/tex/face-l40.png" \
  "from below, her right=$A/renders/chin/$C-right.png" "from below=$A/renders/chin/$C-front.png" "from below, her left=$A/renders/chin/$C-left.png"
sheet $S/compare.webp 640 "${C}=$A/renders/tex/front.png" "Eric (in game)=$O/eric/front.png" "Mio (in game)=$O/mio/front.png" "Kuro round 3=$K/renders/tex/front.png" \
  "${C}=$A/renders/tex/r45.png" "Eric=$O/eric/r45.png" "Mio=$O/mio/r45.png" "Kuro=$K/renders/tex/r45.png"
V=$A/viewer/$C-1
sheet $S/viewer.webp 430 rest=$V/rest-0.png idle=$V/idle-0.png walk=$V/walk-0.png "walk, side=$V/walk-157.png"
