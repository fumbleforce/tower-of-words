#!/bin/sh
# The sheets for reviews/<id>-meshy-1, in the review's order, into the main checkout's art/parts/<id>-meshy-1/sheets/
# (kuro-meshy-orig-2/sheet.py). Every ChatGPT take is listed in order with its label.
#   sh art/candidates/staff-meshy-1/sheets.sh <id> <model name, e.g. tex> "<label>=<take>" ...
HERE=$(cd "$(dirname "$0")" && pwd)
R=/home/jorgen/repo/japanese
C=$1; N=$2; shift 2
A=$R/art/parts/$C-meshy-1
K=$R/art/parts/kuro-meshy-orig-3
O=$R/art/parts/kuro-meshy-orig-1/renders
S=$A/sheets
mkdir -p "$S"
sheet() { python3 "$HERE/../kuro-meshy-orig-2/sheet.py" "$@"; }
sheet $S/step0-inputs.webp 520 "attached 1: the approved portrait=$R/game3d/assets/portraits/$C-neutral.webp" "attached 2: your Mio chibi=$R/tools/characters/ref/mio-chibi-34.png"
for t in "$@"; do set -- "$@" "${t%%=*}=$A/pics/${t#*=}.png"; shift; done
sheet $S/steps.webp 420 "$@"
sheet $S/shape-previews.webp 420 front=$A/meshy/$C-1-front.png left=$A/meshy/$C-1-left.png right=$A/meshy/$C-1-right.png back=$A/meshy/$C-1-back.png
sheet $S/uv.webp 560 "face piece (red)=$A/diag/uv-face.png" "UV layout=$A/diag/uv-$N.png" "Meshy's texture on it=$A/diag/atlas-$N.png"
sheet $S/tex.webp 520 front=$A/renders/$N/front.png "3/4, the left side of the image=$A/renders/$N/l45.png" "side=$A/renders/$N/l90.png" \
  back=$A/renders/$N/back.png "3/4, the right side of the image=$A/renders/$N/r45.png" face=$A/renders/$N/face.png
sheet $S/faces.webp 470 "from below, image left=$A/renders/chin-$N/$C-right.png" "from below=$A/renders/chin-$N/$C-front.png" \
  "from below, image right=$A/renders/chin-$N/$C-left.png"
# each figure cut to its own outline, so they stand at the same height on the sheet
for f in eric:$K/renders/measure/eric.png kuro:$K/renders/measure/kuro-3.png aoi:$R/art/parts/aoi-meshy-1/renders/measure/aoi-2.png \
  emi:$R/art/parts/emi-meshy-1/renders/measure/emi-2.png $C:$A/renders/measure/$N.png; do
  python3 -c "from PIL import Image; im=Image.open('${f#*:}').convert('RGBA'); im.crop(im.getbbox()).save('$A/diag/fig-${f%%:*}.png')"
done
sheet $S/measure.webp 620 "Eric in game: 0.46=$A/diag/fig-eric.png" "Kuro: 0.41=$A/diag/fig-kuro.png" "Aoi: 0.40=$A/diag/fig-aoi.png" \
  "Emi: 0.43=$A/diag/fig-emi.png" \
  "$C: $(python3 -c "import json;print('%.2f' % json.load(open('$A/diag/ratios.json'))['model']['height_share'])")=$A/diag/fig-$C.png"
sheet $S/compare.webp 640 "$C=$A/renders/$N/front.png" "Eric (in game)=$O/eric/front.png" "Mio (in game)=$O/mio/front.png" "Kuro=$K/renders/tex/front.png" \
  "$C=$A/renders/$N/r45.png" "Eric=$O/eric/r45.png" "Mio=$O/mio/r45.png" "Kuro=$K/renders/tex/r45.png"
V=$A/viewer/$C-1
sheet $S/viewer.webp 430 rest=$V/rest-0.png idle=$V/idle-0.png walk=$V/walk-0.png "walk, side=$V/walk-157.png"
