#!/bin/sh
# Meshy round 2 for reviews/chibi-cast-meshy-1, one change each against round 1:
#   kuro-2, mio-2: the same input picture as kuro-1 / mio-1, Meshy Smart Topology (meshy-t2, 5,000 faces) instead of
#                  the latest model (low poly for the game; does Mio's bun come out as chunks instead of strands?)
#   eric-2:        latest model as eric-1, input eric-f-101 (the glasses asked for as painted on)
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
C=/home/jorgen/repo/japanese/art/parts/chibi-cast-meshy/inputs/cut
P="$ROOT/tools/characters/parts/meshy_part.py"
python3 "$P" kuro-2 "$C/kuro-d-101.png" tex=4k model=t2 faces=5000 round=chibi-cast-meshy 2>&1 | tail -n 1
python3 "$P" mio-2 "$C/mio-d-101.png" tex=4k model=t2 faces=5000 round=chibi-cast-meshy 2>&1 | tail -n 1
python3 "$P" eric-2 "$C/eric-f-101.png" tex=4k round=chibi-cast-meshy 2>&1 | tail -n 1
