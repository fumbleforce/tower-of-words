#!/bin/sh
# The sheets for Review crowd-pilot-1, into the main checkout's art/parts/crowd-pilot-1/sheets/, after gen.py (pictures),
# meshy_part.py (shapes, textures, rigs), cpu_render.py (texture renders), install.sh, idles.sh and shots.mjs (viewer
# stills in art/parts/crowd-pilot-1/viewer/). steps-a, steps-b, step0-input and shape-previews are made by hand with
# the same sheet.py (see the review's captions).
#   sh art/candidates/crowd-pilot-1/sheets.sh
HERE=$(cd "$(dirname "$0")" && pwd)
A=/home/jorgen/repo/japanese/art/parts/crowd-pilot-1
S=$A/sheets
V=$A/viewer
C=$A/close
sheet() { python3 "$HERE/../kuro-meshy-orig-2/sheet.py" "$@"; }
sheet $S/tex-a.webp 300 "a-1-tex: texture 1, styled from a-d1 (kept)=$A/renders/a-1-tex.png" \
  "a-1-tex2: texture 2, the same settings again=$A/renders/a-1-tex2.png" \
  "a-1-tex3: texture 3, styled from a-c1 (face to the camera)=$A/renders/a-1-tex3.png"
sheet $S/tex-b.webp 300 "b-1-tex: the texture, styled from b-d1=$A/renders/b-1-tex.png"
sheet $S/eyes-a.webp 520 "A from the side: the eyes are loose shells in front of the face=$C/idle-upper-side-a-own.png" \
  "A close: the eye paint smeared over those shells=$C/idle-upper-front-a-own.png"
for m in idle walk run sit; do
  sheet $S/rigs-$m.webp 430 "$m, front=$V/rigs-$m-whole_row.png" "$m, three-quarter=$V/rigs-$m-three-quarter.png" \
    "$m, side=$V/rigs-$m-from_the_side.png" "$m, back=$V/rigs-$m-from_behind.png"
  for part in upper lower; do
    w=$([ $part = upper ] && echo "shoulders, elbows" || echo "hips, knees")
    sheet $S/close-$m-$part.webp 360 \
      "A rig (a) $m, $w=$C/$m-$part-front-a-own.png" "A rig (b)=$C/$m-$part-front-a-meshy.png" \
      "B rig (a)=$C/$m-$part-front-b-own.png" "B rig (b)=$C/$m-$part-front-b-meshy.png" \
      "A rig (a), side=$C/$m-$part-side-a-own.png" "A rig (b), side=$C/$m-$part-side-a-meshy.png" \
      "B rig (a), side=$C/$m-$part-side-b-own.png" "B rig (b), side=$C/$m-$part-side-b-meshy.png"
  done
done
sheet $S/cast.webp 520 "idle, beside Mori, Hamada, Emi and Kuro=$V/cast-idle-whole_row.png" "walk=$V/cast-walk-whole_row.png" \
  "side=$V/cast-idle-from_the_side.png"
for r in own meshy; do
  sheet $S/variety-$r.webp 520 "idle=$V/variety-$r-idle-whole_row.png" "walk=$V/variety-$r-walk-whole_row.png" \
    "three-quarter=$V/variety-$r-idle-three-quarter.png" "A close=$V/variety-$r-idle-A_shoulders_and_elbows.png" \
    "B close=$V/variety-$r-idle-B_shoulders_and_elbows.png"
done
sheet $S/masks.webp 520 "A: texture and its mask (red hair, green suit; the rest stays)=$A/variety/a/check.png" \
  "B: texture and its mask (red hair, green blazer, blue skirt)=$A/variety/b/check.png"
sheet $S/joints.webp 420 "A on rig (a), walk, offline check=$A/diag/a-own-walk.png" "A on rig (b)=$A/diag/a-meshy-walk.png" \
  "B on rig (a)=$A/diag/b-own-walk.png" "B on rig (b)=$A/diag/b-meshy-walk.png"
ls -la $S
