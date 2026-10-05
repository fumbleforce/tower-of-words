#!/bin/sh
# After each install: the fast test, day 1 and DAY=2, at 390x844 and 1366x860, and the gait check, on this worktree's
# game through the 8771 server. One browser job at a time, each retried on its own while the GPU or the machine is
# busy (when-gpu.sh), so a busy slot doesn't send the whole set round again. Prints each verdict line and any errors;
# the full logs go to $OUT (default /tmp).
#   sh art/candidates/staff-meshy-1/qa.sh [out dir]
HERE=$(cd "$(dirname "$0")" && pwd)
WT=$(pwd)
export BASE="${WT#/home/jorgen/repo/japanese/}/game3d"
OUT=${1:-/tmp}
mkdir -p "$OUT"
W="sh $HERE/when-gpu.sh"
$W node game3d/tools/fast.mjs 390 844 > "$OUT/f1-390.txt" 2>&1
$W node game3d/tools/fast.mjs 1366 860 > "$OUT/f1-1366.txt" 2>&1
DAY=2 VOICE_WARN=1 $W node game3d/tools/fast.mjs 390 844 > "$OUT/f2-390.txt" 2>&1
DAY=2 VOICE_WARN=1 $W node game3d/tools/fast.mjs 1366 860 > "$OUT/f2-1366.txt" 2>&1
$W node game3d/tools/gait-check.mjs 390 844 > "$OUT/gait.txt" 2>&1
for f in f1-390 f1-1366 f2-390 f2-1366; do
  echo "== $f"; grep -E "^(PASS|FAIL)|gait:|errors?:|page error|artifacts" "$OUT/$f.txt" | head -8
done
echo "== gait-check"; tail -4 "$OUT/gait.txt"
