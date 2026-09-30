#!/bin/sh
# Side-by-side sheet of two render sets with the same view names: sh pairs.sh <out.webp> <dirA> <tagA> <dirB> <tagB> [views]
# One row per view: A then B. views default: front three-quarter side back face face-3q neck neck-back hand feet top
here=$(dirname "$0")
out=$1; da=$2; ta=$3; db=$4; tb=$5; shift 5
views=${*:-front three-quarter side back face face-3q neck neck-back hand feet top}
args=""
first=1
row=""
for v in $views; do
  row="$row $da/$ta-$v.png $db/$tb-$v.png"
done
# rows of four views (eight pictures)
set -- $row
n=0
line=""
for p in "$@"; do
  line="$line $p"
  n=$((n + 1))
  if [ $n -eq 8 ]; then args="$args -- row $line"; line=""; n=0; fi
done
[ -n "$line" ] && args="$args -- row $line"
args=${args# -- }
SHEET_H=${SHEET_H:-300} "$HOME/ai/flat-venv/bin/python" "$here/sheet.py" "$out" $args
