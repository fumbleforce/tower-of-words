#!/bin/sh
# One face take for both models (Review crowd-pilot-3): eyes.py for A and B with the given settings, then a close crop of
# the eyes (both at 1:1 on the front view) and the heads beside the cast at one scale, into the main checkout's
# art/parts/crowd-pilot-3/takes/.  Every take is kept, with its settings.json.
#   sh art/candidates/crowd-pilot-3/take.sh <take> "<a settings>" "<b settings>"
set -e
T=$1; SA=$2; SB=$3
PY=~/ai/sd/venv/bin/python
HERE=art/candidates/crowd-pilot-3
P=/home/jorgen/repo/japanese/art/parts/crowd-pilot-3/takes
$PY $HERE/eyes.py a $T $SA
$PY $HERE/eyes.py b $T $SB
$PY - $P $T <<'EOF'
import sys
from PIL import Image
P, T = sys.argv[1:3]
a = Image.open(f'{P}/a-{T}/front.png').crop((540, 1100, 1380, 1560))
b = Image.open(f'{P}/b-{T}/front.png').crop((520, 980, 1400, 1460))
W = Image.new('RGB', (880, 940), 'white'); W.paste(a, (0, 0)); W.paste(b, (0, 460)); W.save(f'{P}/eyes-{T}.png')
EOF
$PY $HERE/compare.py $P/heads-$T.png "A $T=$P/a-$T/front.png" "B $T=$P/b-$T/front.png"
echo "$P/eyes-$T.png"
