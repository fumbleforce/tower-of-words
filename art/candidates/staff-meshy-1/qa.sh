#!/bin/sh
# After each install: the fast test, day 1 and DAY=2, at 390x844 and 1366x860, and the gait check, on this worktree's
# game through the 8771 server. Prints each verdict line and any errors; the full logs go to $OUT (default /tmp).
#   sh art/candidates/staff-meshy-1/qa.sh [out dir]
WT=$(pwd)
export BASE="${WT#/home/jorgen/repo/japanese/}/game3d"
OUT=${1:-/tmp}
mkdir -p "$OUT"
node game3d/tools/fast.mjs 390 844 > "$OUT/f1-390.txt" 2>&1 &
node game3d/tools/fast.mjs 1366 860 > "$OUT/f1-1366.txt" 2>&1 &
DAY=2 VOICE_WARN=1 node game3d/tools/fast.mjs 390 844 > "$OUT/f2-390.txt" 2>&1 &
wait
DAY=2 VOICE_WARN=1 node game3d/tools/fast.mjs 1366 860 > "$OUT/f2-1366.txt" 2>&1 &
node game3d/tools/gait-check.mjs 390 844 > "$OUT/gait.txt" 2>&1 &
wait
for f in f1-390 f1-1366 f2-390 f2-1366; do
  echo "== $f"; grep -E "^(PASS|FAIL)|gait:|errors?:|page error|artifacts" "$OUT/$f.txt" | head -8
done
echo "== gait-check"; tail -4 "$OUT/gait.txt"
