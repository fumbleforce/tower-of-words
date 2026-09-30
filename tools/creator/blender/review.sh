#!/bin/sh
# Review renders for one body: the original and the new model at the same cameras, in each outfit, standing and at
# two walk frames, plus close-ups. Writes the pictures to <out>/<body>/ and the sheets to <out>/<body>-*.webp.
#   sh tools/creator/blender/review.sh <body> <out>
# Renders with Cycles on the CPU (no GPU lock needed); ENGINE=BLENDER_EEVEE uses EEVEE under the GPU lock.
here=$(dirname "$0")
body=$1; out=$2; d="$out/$body"; E=${ENGINE:-CYCLES}
own="hair,stubble"
hood="$own,hoodie,zip,hood,trousers,sneakers"
shirt="$own,shirt,collar,skirt,sneakers"
V="front,three-quarter,side,back"
sh "$here/bl.sh" render_original.py "$body" "$d/orig" "$E"
sh "$here/bl.sh" render_original.py "$body" "$d/orig-w8" "$E" 8
sh "$here/bl.sh" render_original.py "$body" "$d/orig-w20" "$E" 20
sh "$here/bl.sh" render_new.py "$body" "$d" bare "$E" rest "$own" "$V,face,face-3q,neck,neck-back,hand,feet"
sh "$here/bl.sh" render_new.py "$body" "$d" nohair "$E" rest "nostubble" "front,face,neck-back"
sh "$here/bl.sh" render_new.py "$body" "$d" hoodie "$E" rest "$hood" "$V,neck,neck-back,cuff,feet"
sh "$here/bl.sh" render_new.py "$body" "$d" hoodinside "$E" rest "hoodie,zip,hood,trousers,sneakers" "hood"
sh "$here/bl.sh" render_new.py "$body" "$d" shirt "$E" rest "$shirt" "$V,neck,cuff,feet"
sh "$here/bl.sh" render_new.py "$body" "$d" hoodie-w8 "$E" 8 "$hood" "$V"
sh "$here/bl.sh" render_new.py "$body" "$d" hoodie-w20 "$E" 20 "$hood" "$V"
sh "$here/bl.sh" render_new.py "$body" "$d" shirt-w8 "$E" 8 "$shirt" "$V"
sh "$here/bl.sh" render_new.py "$body" "$d" shirt-w20 "$E" 20 "$shirt" "$V"
S="$HOME/ai/flat-venv/bin/python $here/sheet.py"
export SHEET_H=340
$S "$out/$body-1-standing.webp" "original" $d/orig/original-front.png $d/orig/original-three-quarter.png $d/orig/original-side.png $d/orig/original-back.png \
  -- "new body, own hair" $d/bare-front.png $d/bare-three-quarter.png $d/bare-side.png $d/bare-back.png \
  -- "hoodie and trousers" $d/hoodie-front.png $d/hoodie-three-quarter.png $d/hoodie-side.png $d/hoodie-back.png \
  -- "shirt and skirt" $d/shirt-front.png $d/shirt-three-quarter.png $d/shirt-side.png $d/shirt-back.png
$S "$out/$body-2-walking.webp" "original, walk frame 8" $d/orig-w8/original-front.png $d/orig-w8/original-three-quarter.png $d/orig-w8/original-side.png $d/orig-w8/original-back.png \
  -- "hoodie, walk frame 8" $d/hoodie-w8-front.png $d/hoodie-w8-three-quarter.png $d/hoodie-w8-side.png $d/hoodie-w8-back.png \
  -- "shirt and skirt, walk frame 8" $d/shirt-w8-front.png $d/shirt-w8-three-quarter.png $d/shirt-w8-side.png $d/shirt-w8-back.png \
  -- "original, walk frame 20" $d/orig-w20/original-front.png $d/orig-w20/original-three-quarter.png $d/orig-w20/original-side.png $d/orig-w20/original-back.png \
  -- "hoodie, walk frame 20" $d/hoodie-w20-front.png $d/hoodie-w20-three-quarter.png $d/hoodie-w20-side.png $d/hoodie-w20-back.png \
  -- "shirt and skirt, walk frame 20" $d/shirt-w20-front.png $d/shirt-w20-three-quarter.png $d/shirt-w20-side.png $d/shirt-w20-back.png
$S "$out/$body-3-closeups.webp" "face: original, new, new three-quarter, new without hair" $d/orig/original-face.png $d/bare-face.png $d/bare-face-3q.png $d/nohair-face.png \
  -- "neck: original, bare, bare from behind, in the hoodie, hoodie from behind" $d/orig/original-neck.png $d/bare-neck.png $d/bare-neck-back.png $d/hoodie-neck.png $d/hoodie-neck-back.png \
  -- "hood from above (hair hidden), cuffs, shirt collar, hand" $d/hoodinside-hood.png $d/hoodie-cuff.png $d/shirt-cuff.png $d/shirt-neck.png $d/bare-hand.png \
  -- "feet: original, bare, sneakers under trousers, sneakers with the skirt" $d/orig/original-feet.png $d/bare-feet.png $d/hoodie-feet.png $d/shirt-feet.png
