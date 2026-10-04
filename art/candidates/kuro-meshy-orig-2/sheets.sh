#!/bin/sh
# Every sheet for reviews/kuro-meshy-orig-2, in the review's order (main checkout's art/parts/kuro-meshy-orig-2/sheets/).
#   sh art/candidates/kuro-meshy-orig-2/sheets.sh pics|renders
HERE=$(cd "$(dirname "$0")" && pwd)
R=/home/jorgen/repo/japanese
O=$R/art/parts/kuro-meshy-orig-1/renders
sheet() { python3 "$HERE/sheet.py" "$@"; }
if [ "$1" = pics ]; then
  sheet sheets/step0-inputs.webp 520 "attached 1: her portrait=$R/game3d/assets/portraits/kuro-neutral.webp" "attached 2: your Mio chibi=$R/tools/characters/ref/mio-chibi-34.png"
  sheet sheets/step1.webp 520 a1=pics/a1.png a2=pics/a2.png a3=pics/a3.png
  sheet sheets/step2.webp 420 "b1 (a1 not seen)=pics/b1.png" "b2 (a1 not seen)=pics/b2.png" b3=pics/b3.png b4=pics/b4.png b5=pics/b5.png
  sheet sheets/step3.webp 520 c1=pics/c1.png c2=pics/c2.png c3=pics/c3.png
  sheet sheets/angle.webp 520 d1=pics/d1.png d2=pics/d2.png d3=pics/d3.png "your angled Mio=$R/tools/characters/ref/mio-chibi-angled.png"
  sheet sheets/shape-previews.webp 520 front=meshy/kuro-2-front.png left=meshy/kuro-2-left.png right=meshy/kuro-2-right.png back=meshy/kuro-2-back.png
fi
if [ "$1" = renders ]; then
  for m in shape tex; do
    sheet sheets/$m.webp 520 front=renders/$m/front.png "her left 3/4=renders/$m/l45.png" "her left side=renders/$m/l90.png" back=renders/$m/back.png "her right 3/4=renders/$m/r45.png" face=renders/$m/face.png
  done
  # Eric and Mio: the in-game models, rendered by round 1 with the same script and camera
  sheet sheets/compare.webp 640 "Kuro=renders/tex/front.png" "Eric (in game)=$O/eric/front.png" "Mio (in game)=$O/mio/front.png" "Kuro=renders/tex/r45.png" "Eric=$O/eric/r45.png" "Mio=$O/mio/r45.png"
fi
if [ "$1" = viewer ]; then
  V=$R/art/parts/kuro-meshy-orig-2/viewer
  sheet sheets/viewer.webp 430 rest=$V/rest-0.png idle=$V/idle-0.png walk=$V/walk-0.png "walk, side=$V/walk-157.png"
fi
