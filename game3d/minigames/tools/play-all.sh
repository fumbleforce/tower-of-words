#!/bin/sh
# Plays every minigame to the end at phone and desktop size, once right and once with every third
# task wrong first. Usage: sh game3d/minigames/tools/play-all.sh [port]   (GL=soft: the pages draw no WebGL)
port=${1:-8771}
dir=$(dirname "$0")
status=0
for game in kotodama give give-v1 compare want; do
  for size in "390 844" "1366 860"; do
    # shellcheck disable=SC2086
    GL=soft node "$dir/play.mjs" $game $size --port "$port" | grep -E "PASS|FAIL|page error" || status=1
    GL=soft node "$dir/play.mjs" $game $size --port "$port" --wrong 3 | grep -E "PASS|FAIL|page error" || status=1
  done
done
exit $status
