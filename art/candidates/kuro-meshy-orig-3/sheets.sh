#!/bin/sh
# Every sheet for reviews/kuro-meshy-orig-3, in the review's order, into the main checkout's
# art/parts/kuro-meshy-orig-3/sheets/ (round 2's sheet.py; all paths absolute).
#   sh art/candidates/kuro-meshy-orig-3/sheets.sh
HERE=$(cd "$(dirname "$0")" && pwd)
R=/home/jorgen/repo/japanese
A=$R/art/parts/kuro-meshy-orig-3
P2=$R/art/parts/kuro-meshy-orig-2
O=$R/art/parts/kuro-meshy-orig-1/renders
S=$A/sheets
mkdir -p "$S"
sheet() { python3 "$HERE/../kuro-meshy-orig-2/sheet.py" "$@"; }
# the picture's face, cropped, for the face sheet
python3 -c "from PIL import Image; Image.open('$A/pics/e5.png').crop((440, 300, 660, 480)).resize((660, 540), Image.LANCZOS).save('$A/diag/e5-face.png')"

sheet $S/edit.webp 520 "d2 (round 2, attached; 0.51)=$P2/pics/d2.png" "e1 (0.43)=$A/pics/e1.png" "e2 (0.44)=$A/pics/e2.png" \
  "e3 (0.47)=$A/pics/e3.png" "e4 (0.51)=$A/pics/e4.png" "e5 (0.45), picked=$A/pics/e5.png" "e6 (0.43)=$A/pics/e6.png"
sheet $S/measure.webp 620 "Eric in game: 0.46=$A/renders/measure/eric.png" "Mio in game: 0.52=$A/renders/measure/mio.png" \
  "Kuro round 2: 0.47=$A/renders/measure/kuro-2.png" "Kuro round 3: 0.41=$A/renders/measure/kuro-3.png"
sheet $S/shape-previews.webp 420 "1st roll front=$A/meshy/kuro-3-front.png" "1st roll left=$A/meshy/kuro-3-left.png" \
  "1st roll back=$A/meshy/kuro-3-back.png" "2nd roll front=$A/meshy/kuro-3b-front.png" "2nd roll left=$A/meshy/kuro-3b-left.png" \
  "2nd roll right=$A/meshy/kuro-3b-right.png" "2nd roll back=$A/meshy/kuro-3b-back.png"
sheet $S/shape.webp 520 front=$A/renders/shape/front.png "her left 3/4=$A/renders/shape/l45.png" "her left side=$A/renders/shape/l90.png" \
  back=$A/renders/shape/back.png "her right 3/4=$A/renders/shape/r45.png"
sheet $S/diagnosis.webp 560 "round 2 texture=$A/diag/atlas-r2.jpg" "round 2 UVs (Meshy's)=$A/diag/uv-r2.png" \
  "round 3 UVs (face in one piece)=$A/diag/uv-r3.png" "round 3 texture=$A/diag/atlas-r3.jpg"
sheet $S/tex.webp 520 front=$A/renders/tex/front.png "her left 3/4=$A/renders/tex/l45.png" "her left side=$A/renders/tex/l90.png" \
  back=$A/renders/tex/back.png "her right 3/4=$A/renders/tex/r45.png" face=$A/renders/tex/face.png
sheet $S/faces.webp 600 "round 2=$A/renders/face/kuro-2.png" "round 3=$A/renders/face/kuro-3.png" "picture e5, her face=$A/diag/e5-face.png"
sheet $S/compare.webp 640 "Kuro=$A/renders/tex/front.png" "Eric (in game)=$O/eric/front.png" "Mio (in game)=$O/mio/front.png" \
  "Kuro=$A/renders/tex/r45.png" "Eric=$O/eric/r45.png" "Mio=$O/mio/r45.png"
V=$A/viewer/kuro-3
sheet $S/viewer.webp 430 rest=$V/rest-0.png idle=$V/idle-0.png walk=$V/walk-0.png "walk, side=$V/walk-157.png"
