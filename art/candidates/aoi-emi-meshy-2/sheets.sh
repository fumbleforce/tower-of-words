#!/bin/sh
# Round 2 sheets for reviews/aoi-meshy-1 or emi-meshy-1, in the review's order, into the main checkout's
# art/parts/<char>-meshy-1/sheets/r2-*.webp (kuro-meshy-orig-2/sheet.py; all paths absolute).
#   sh art/candidates/aoi-emi-meshy-2/sheets.sh aoi|emi
HERE=$(cd "$(dirname "$0")" && pwd)
R=/home/jorgen/repo/japanese
C=$1
A=$R/art/parts/$C-meshy-1
K=$R/art/parts/kuro-meshy-orig-3
O=$R/art/parts/kuro-meshy-orig-1/renders
S=$A/sheets
PY=~/ai/sd/venv/bin/python
mkdir -p "$S" "$A/round2/crops"
sheet() { $PY "$HERE/../kuro-meshy-orig-2/sheet.py" "$@"; }
# crop <src> <x0> <y0> <x1> <y1> <out>: a close-up, enlarged
crop() { $PY -c "from PIL import Image; im=Image.open('$1').convert('RGBA'); bg=Image.new('RGBA', im.size, 'white'); bg.alpha_composite(im); c=bg.crop(($2,$3,$4,$5)); c.resize((c.width*600//c.height, 600), Image.LANCZOS).convert('RGB').save('$6')"; }

if [ "$C" = aoi ]; then
  sheet $S/r2-steps.webp 520 "c2 (round 1, attached; 0.42)=$A/pics/c2.png" "e1 (0.41)=$A/pics/e1.png" "e2 (0.41), picked=$A/pics/e2.png" "e3 (0.38)=$A/pics/e3.png"
  M2=0.40; M1=0.43
else
  sheet $S/r2-steps.webp 520 "c1 (round 1, with the lanyard; 0.47)=$A/pics/c1.png" "c2 (hand on hip; 0.50)=$A/pics/c2.png" \
    "c3 (0.44), picked=$A/pics/c3.png" "c4 (0.49)=$A/pics/c4.png"
  M2=0.43; M1=0.48
fi
sheet $S/r2-shape-previews.webp 420 front=$A/meshy/$C-2-front.png left=$A/meshy/$C-2-left.png right=$A/meshy/$C-2-right.png back=$A/meshy/$C-2-back.png
sheet $S/r2-uv.webp 560 "face piece (red)=$A/round2/uv-face.png" "UV layout=$A/round2/uv.png" "Meshy's texture on it=$A/round2/atlas.png"
sheet $S/r2-tex.webp 520 front=$A/renders/tex2/front.png "her left 3/4=$A/renders/tex2/l45.png" "her left side=$A/renders/tex2/l90.png" \
  back=$A/renders/tex2/back.png "her right 3/4=$A/renders/tex2/r45.png" face=$A/renders/tex2/face.png
sheet $S/r2-before-after.webp 560 "round 1=$A/renders/tex/front.png" "round 2=$A/renders/tex2/front.png" \
  "round 1 face=$A/renders/tex/face.png" "round 2 face=$A/renders/tex2/face.png"
sheet $S/r2-measure.webp 620 "Kuro round 3: 0.41=$K/renders/measure/kuro-3.png" "$C round 1: $M1=$A/renders/measure/$C.png" \
  "$C round 2: $M2=$A/renders/measure/$C-2.png"
if [ "$C" = aoi ]; then
  sheet $S/r2-chin.webp 420 "from below, her right=$A/renders/chin2/aoi-right.png" "from below=$A/renders/chin2/aoi-front.png" \
    "from below, her left=$A/renders/chin2/aoi-left.png"
  crop $A/round2/hands-1.png 284 268 414 398 $A/round2/crops/hand-1.png
  crop $A/round2/hands-075.png 284 268 414 398 $A/round2/crops/hand-075.png
  crop $A/round2/hands-1.png 300 140 720 400 $A/round2/crops/arms-1.png
  crop $A/round2/hands-075.png 300 140 720 400 $A/round2/crops/arms-075.png
  sheet $S/r2-hands.webp 480 "as Meshy made her=$A/round2/crops/arms-1.png" "hand bones at 0.75 (the game)=$A/round2/crops/arms-075.png" \
    "her right hand, as made=$A/round2/crops/hand-1.png" "at 0.75=$A/round2/crops/hand-075.png"
  # each figure cut to its own outline, so they stand at the same height on the sheet
  for f in mio:$K/renders/measure/mio.png kuro:$K/renders/measure/kuro-3.png emi:$R/art/parts/emi-meshy-1/renders/measure/emi-2.png \
    aoi:$A/round2/hands-075.png; do
    $PY -c "from PIL import Image; im=Image.open('${f#*:}'); im.crop(im.getbbox()).save('$A/round2/crops/fig-${f%%:*}.png')"
  done
  sheet $S/r2-hands-cast.webp 560 "Mio (in game)=$A/round2/crops/fig-mio.png" "Kuro=$A/round2/crops/fig-kuro.png" \
    "Emi round 2=$A/round2/crops/fig-emi.png" "Aoi round 2, hands 0.75=$A/round2/crops/fig-aoi.png"
else
  sheet $S/r2-jaw.webp 470 "before, her right=$A/renders/chin2/emi-right.png" "after=$A/renders/chin2-fixed/emi-right.png" \
    "before, front=$A/renders/chin2/emi-front.png" "after=$A/renders/chin2-fixed/emi-front.png" \
    "before, her left=$A/renders/chin2/emi-left.png" "after=$A/renders/chin2-fixed/emi-left.png"
  sheet $S/r2-jaw-marked.webp 470 "repainted texels in green: her right=$A/round2/green-right.png" "front=$A/round2/green-front.png" "her left=$A/round2/green-left.png"
fi
sheet $S/r2-compare.webp 640 "${C} round 2=$A/renders/tex2/front.png" "Eric (in game)=$O/eric/front.png" "Mio (in game)=$O/mio/front.png" "Kuro=$K/renders/tex/front.png" \
  "${C} round 2=$A/renders/tex2/r45.png" "Eric=$O/eric/r45.png" "Mio=$O/mio/r45.png" "Kuro=$K/renders/tex/r45.png"
V=$A/viewer/$C-2
sheet $S/r2-viewer.webp 430 rest=$V/rest-0.png idle=$V/idle-0.png walk=$V/walk-0.png "walk, side=$V/walk-157.png"
