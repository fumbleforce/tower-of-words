#!/bin/sh
# Meshy image-to-3D for reviews/chibi-cast-meshy-2, round 1's settings (latest model, no remesh, textured in the same
# task, image enhancement off, no PBR, 4k texture, no pose): the background is cut off the input picture with BiRefNet
# (CPU), then one generation (30 credits). Credits go to reviews/chibi-cast-meshy-2/credits.json.
#   sh art/candidates/chibi-cast-meshy-2/meshy.sh <attempt>=<input> ...     e.g. mori-1=mori-a-101
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
IN=/home/jorgen/repo/japanese/art/parts/chibi-cast-meshy-2/inputs
for pair in "$@"; do
  a=${pair%%=*}; pic=${pair#*=}
  [ -f "$IN/cut/$pic.png" ] || python3 "$ROOT/tools/rmbg_local.py" --method birefnet-general "$IN/$pic.png" --out "$IN/cut" >/dev/null
  python3 "$ROOT/tools/characters/parts/meshy_part.py" "$a" "$IN/cut/$pic.png" tex=4k round=chibi-cast-meshy-2 \
    review=chibi-cast-meshy-2 2>&1 | tail -n 1
done
