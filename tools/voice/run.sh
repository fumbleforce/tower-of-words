#!/bin/sh
# Voice every game line that has no clip: game3d/audio/<key>.mp3 for each manifest line whose current text has no clip.
#   1. rewrite game3d/audio/manifest.json from the story (skip with --no-manifest)
#   2. take the GPU lock (waits while someone else holds it; GUIDE: GPU lock)
#   3. three takes per line (gen_takes.py), checked (check_takes.py); up to two retry rounds with new seeds for lines
#      with no passing take
#   4. export the best passing take (export.py); edge-tts for lines still failing only with EDGE_FALLBACK=1 (edge.py), else exit 1
#   5. re-time known words in new overheard clips (spans.py), release the lock, run voice-manifest --check
# Usage: sh tools/voice/run.sh [--no-manifest] [--dry]   (--dry: list the lines that need a clip and stop)
# Env: LOCK_ME (lock owner name, default game3d-voices), GAME3D_VOICE_WORK (takes and metrics, default ~/ai/game3d-voice),
#      QWEN_PY, BENCH_PY, EDGE_PY (the three Python venvs below).
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)
QWEN_PY=${QWEN_PY:-$HOME/ai/tts/qwen/venv/bin/python}
BENCH_PY=${BENCH_PY:-$HOME/ai/tts-bench/.venv/bin/python}
EDGE_PY=${EDGE_PY:-$HOME/ai/voice-pipeline/edge-venv/bin/python}
export LOCK_ME=${LOCK_ME:-game3d-voices}
LOCKDIR=${GPU_LOCK:-/tmp/claude-$(id -u)/gpu.lock}
WORK=${GAME3D_VOICE_WORK:-$HOME/ai/game3d-voice}
mkdir -p "$WORK/logs"
LOG="$WORK/logs/run-$(date +%Y%m%d-%H%M%S).log"
QUIET='warn|sox|flash-attn|flash_attn|\*\*\*\*|^ *$|http|path var|If you do|pad_token'
say() { echo "$*" | tee -a "$LOG"; }

case " $* " in *" --no-manifest "*) ;; *) node "$REPO/game3d/tools/voice-manifest.mjs" | tee -a "$LOG" ;; esac
MISSING=$($BENCH_PY "$HERE/cfg.py" missing)
if [ -z "$MISSING" ]; then say "every line has a clip"; node "$REPO/game3d/tools/voice-manifest.mjs" --check; exit $?; fi
say "lines with no clip: $MISSING"
case " $* " in *" --dry "*) exit 0 ;; esac
OVERHEARD=$($BENCH_PY -c "
import sys; sys.path.insert(0, '$HERE'); from cfg import manifest
need = set('$MISSING'.split(','))
print(any(e['overheard'] for e in manifest() if e['key'] in need))")

# the GPU lock: mkdir is the test-and-set; never remove a lock with someone else's name in it
[ -d "$(dirname "$LOCKDIR")" ] || mkdir -p "$(dirname "$LOCKDIR")"
until mkdir "$LOCKDIR" 2>/dev/null; do
  say "GPU lock held by $(cat "$LOCKDIR/owner" 2>/dev/null), waiting ($(date +%T))"; sleep 120
done
echo "$LOCK_ME" > "$LOCKDIR/owner"
release() { grep -qx "$LOCK_ME" "$LOCKDIR/owner" 2>/dev/null && rm -r "$LOCKDIR" && echo "GPU lock released"; }
trap release EXIT
trap 'exit 130' INT TERM
say "GPU lock taken as $LOCK_ME; VRAM in use: $(nvidia-smi --query-gpu=memory.used --format=csv,noheader 2>/dev/null)"

KEYS=$MISSING
for seeds in 404,505,606 707,808,909 1010,1111,1212; do
  say "takes $seeds for: $KEYS"
  $QWEN_PY "$HERE/gen_takes.py" "$seeds" "$KEYS" 2>&1 | grep -v -i -E "$QUIET" | tee -a "$LOG"
  grep -qx "$LOCK_ME" "$LOCKDIR/owner" 2>/dev/null || { say "GPU lock lost, stopping"; exit 1; }
  DEV=cuda $BENCH_PY "$HERE/check_takes.py" takes 2>&1 | grep -E "^(PASS|FAIL|to check|checked)|Error|Traceback" | tee -a "$LOG"
  KEYS=$($BENCH_PY "$HERE/export.py" --dry 2>/dev/null | sed -n 's/^NOPASS {"key": "\([^"]*\)".*/\1/p' | paste -sd, -)
  [ -z "$KEYS" ] && break
done
$BENCH_PY "$HERE/export.py" 2>&1 | grep -v -i warn | tee -a "$LOG"
if grep -q '"fallback": \[\]' "$WORK/report.json"; then :; else
  # edge-tts sounds nothing like the cast: only fall back when asked (EDGE_FALLBACK=1), otherwise stop loudly
  if [ "${EDGE_FALLBACK:-0}" = 1 ]; then
    say "no local take passed for some lines; edge-tts fallback (EDGE_FALLBACK=1):"
    $EDGE_PY "$HERE/edge.py" 2>&1 | tee -a "$LOG"
  else
    say "FAIL: no local take passed for some lines (see $WORK/report.json); not using edge-tts. Fix the refs or rerun; EDGE_FALLBACK=1 to allow it."
    exit 1
  fi
fi
if [ "$OVERHEARD" = True ]; then
  DEV=cuda $BENCH_PY "$HERE/spans.py" 2>&1 | grep -E "^(found|MISSING)|Error|Traceback" | tee -a "$LOG"
fi
release; trap - EXIT
CHECK=$(node "$REPO/game3d/tools/voice-manifest.mjs" --check); RC=$?
say "$CHECK"
say "log: $LOG"
exit $RC
