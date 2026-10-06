#!/bin/sh
# The sheets for Review crowd-pilot-2, into the main checkout's art/parts/crowd-pilot-2/sheets/, after gen.py (pictures),
# meshy_part.py and sit.py (shape, texture, rig, sit), install.sh, idles.sh, game-walk.mjs + strips.py (in-game strips in
# strips/ and strips-r1/), shots.mjs (viewer stills in viewer/), r1-viewer-shots.mjs and the weight maps in diag/.
#   sh art/candidates/crowd-pilot-2/sheets.sh
HERE=$(cd "$(dirname "$0")" && pwd)
A=/home/jorgen/repo/japanese/art/parts/crowd-pilot-2
P1=/home/jorgen/repo/japanese/art/parts/crowd-pilot-1
S=$A/sheets
V=$A/viewer
mkdir -p $S $A/half
sheet() { python3 "$HERE/../kuro-meshy-orig-2/sheet.py" "$@"; }
# each 16-frame strip as two 8-frame halves, so a sheet stays readable
python3 - $A <<'EOF'
import os, sys
from PIL import Image
A = sys.argv[1]
for d in ('strips', 'strips-r1'):
    for f in sorted(os.listdir(f'{A}/{d}')):
        im = Image.open(f'{A}/{d}/{f}'); w = im.width // 2
        for i in range(2):
            im.crop((i * w, 0, (i + 1) * w, im.height)).save(f'{A}/half/{d}-{f[:-4]}-{i}.png')
EOF
H=$A/half
sheet $S/diag-viewer.webp 280 "Round 1's viewer, walk pressed: 0.1 s=$A/diag/r1-walk-100ms.png" "0.4 s: one leg lifts (the walk's first frame, held)=$A/diag/r1-walk-400ms.png" \
  "0.8 s: still held=$A/diag/r1-walk-800ms.png" "1.6 s: back to standing (the game's gait stops a walk that goes nowhere)=$A/diag/r1-walk-1600ms.png"
rows() {  # rows <out> <label> <strip name> [<label> <strip name> ...]: one row per strip, its two halves side by side
  out=$1; shift; parts=""; k=0
  while [ $# -gt 0 ]; do
    sheet $S/row-$k.webp 220 "$1=$H/$2-0.png" "(continued)=$H/$2-1.png" >/dev/null; parts="$parts $S/row-$k.webp"; k=$((k+1)); shift 2
  done
  python3 "$HERE/stack.py" $out $parts; rm -f $parts
}
rows $S/diag-ingame-r1.webp "Round 1 A on rig (a), walking in the game, 0.1 s apart" strips-r1-a-own-walk "Round 1 B on rig (b), walking in the game" strips-r1-b-meshy-walk
sheet $S/diag-weights.webp 420 "B, Meshy weights (round 1)=$A/diag/b-meshy-weights.png" \
  "B, mended (this round)=$A/diag/b-new-weights.png" "A, Meshy weights=$A/diag/a-meshy-weights.png" "A, mended=$A/diag/a-new-weights.png"
sheet $S/eyes-history.webp 420 "Round 1, a-d1 (history)=$P1/pics/a-d1.png" "Round 1 A (history)=$P1/sheets/eyes-a.webp" \
  "Round 2 picture a-e1 (sent to Meshy)=$A/pics/a-e1.png" "a-e2 (not used)=$A/pics/a-e2.png"
sheet $S/shape-a.webp 360 "a-2 front (Meshy preview)=$A/meshy/a-2-front.png" "left=$A/meshy/a-2-left.png" "back=$A/meshy/a-2-back.png" "right=$A/meshy/a-2-right.png"
sheet $S/tex-a.webp 330 "a-2-tex: front, three-quarter, side, back, face (CPU render of the textured model)=$A/renders/a-2-tex.png"
sheet $S/faces.webp 520 "A face, live viewer=$V/face-a.png" "B face=$V/face-b.png"
rows $S/ingame-walk.webp "A walking in the game (plaza, lunch), 0.1 s apart" strips-a-walk "B walking" strips-b-walk "Kenji walking, same route" strips-kenji-walk "Mio walking, same route" strips-mio-walk
rows $S/ingame-run.webp "A running in the game, 0.1 s apart" strips-a-run "B running" strips-b-run "Kenji running" strips-kenji-run "Mio running" strips-mio-run
sheet $S/ingame-wide.webp 520 "A mid-walk, the whole view=/home/jorgen/repo/japanese/.claude/worktrees/agent-a65d0e4170275dcf7/game3d/shots/crowd-pilot-2/r2/a-walk/wide.png" "B mid-walk=/home/jorgen/repo/japanese/.claude/worktrees/agent-a65d0e4170275dcf7/game3d/shots/crowd-pilot-2/r2/b-walk/wide.png"
for m in walk run; do
  sheet $S/viewer-$m-side.webp 300 $(for i in 0 1 2 3 4 5 6 7; do echo "${m}_$i=$V/pair-$m-side-$i.png"; done)
  sheet $S/viewer-$m-legs.webp 300 $(for i in 0 2 4 6; do echo "A_legs_$i=$V/pair-$m-legs-a-$i.png"; done) $(for i in 0 2 4 6; do echo "B_legs_$i=$V/pair-$m-legs-b-$i.png"; done)
done
sheet $S/viewer-idle.webp 420 "idle, front=$V/pair-idle-whole_row.png" "three-quarter=$V/pair-idle-three-quarter.png" "side=$V/pair-idle-from_the_side.png" "back=$V/pair-idle-from_behind.png"
sheet $S/viewer-sit.webp 420 "sit=$V/pair-sit-whole_row.png" "sit, side=$V/pair-sit-from_the_side.png"
sheet $S/cast.webp 420 "Beside Hamada, Kenji and Emi, idle=$V/cast-idle-whole_row.png" "three-quarter=$V/cast-idle-three-quarter.png" \
  "side=$V/cast-idle-from_the_side.png" "walk, side=$V/cast-walk-side-3.png" "run, side=$V/cast-run-side-3.png" "walking round the loop=$V/cast-walk-loop.png"
ls -la $S
