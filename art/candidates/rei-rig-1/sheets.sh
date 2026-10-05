#!/bin/sh
# The sheets for Rei's new rig in reviews/rei-meshy-1 (Jørgen on rei-1: "model good, rig terrible"), into the main
# checkout's art/parts/rei-meshy-1/sheets/rig2-*.webp, after rerig.py (install.sh), joint_pic.py, kenji-meshy-3/weightmap.py,
# close-shots.mjs (rei-1 and rei-1-rig2) and train-shots.mjs.
#   sh art/candidates/rei-rig-1/sheets.sh
HERE=$(cd "$(dirname "$0")" && pwd)
A=/home/jorgen/repo/japanese/art/parts/rei-meshy-1
S=$A/sheets
sheet() { python3 "$HERE/../kuro-meshy-orig-2/sheet.py" "$@"; }
sheet $S/rig2-joints.webp 560 "Meshy's skeleton (rei-1)=$A/diag/joints-meshy.png" "the new skeleton (rei-1-rig2)=$A/diag/joints-rig2.png"
sheet $S/rig2-weights.webp 560 "Meshy's weights (rei-1)=$A/diag/weights-meshy.png" "the new weights (rei-1-rig2)=$A/diag/weights-rig2.png"
O=$A/viewer/close-rei-1; N=$A/viewer/close-rig2
sheet $S/rig2-before-after.webp 470 "rei-1 idle=$O/idle-0.png" "rei-1 walk=$O/walk-0.png" "rei-1 walk, side=$O/walk-157.png" \
  "rei-1-rig2 idle=$N/idle-0.png" "rei-1-rig2 walk=$N/walk-0.png" "rei-1-rig2 walk, side=$N/walk-157.png"
sheet $S/rig2-viewer.webp 430 "rest=$N/rest-0.png" "idle=$N/idle-0.png" "idle, 3/4=$N/idle-80.png" "idle, side=$N/idle-157.png" \
  "idle, back=$N/idle-314.png" "walk=$N/walk-0.png" "walk, 3/4=$N/walk-80.png" "walk, side=$N/walk-157.png" "walk, back=$N/walk-314.png"
sheet $S/rig2-ingame.webp 520 "on the train, seated (Meshy sit), laptop on her lap=$A/game/train-rei.png" "the whole car=$A/game/train-overview.jpg"
