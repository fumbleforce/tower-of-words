#!/bin/sh
# Voice every game line that has no clip: game3d/audio/<key>.mp3 for each manifest line whose current text has no clip.
#   1. rewrite game3d/audio/manifest.json from the story (skip with --no-manifest)
#   2. check the setup (venvs, clone references and transcripts, Qwen model: cfg.py setup), then take the GPU lock
#      (waits while someone else holds it or Jørgen's image gen dashboard has priority; GUIDE: GPU lock). When the
#      dashboard asks for the GPU mid-batch, the batch stops with exit 75 and a rerun picks up from the takes on disk
#   3. three takes per line (gen_takes.py), checked (check_takes.py); up to two retry rounds with new seeds for lines
#      with no passing take
#   4. export the best passing take (export.py); edge-tts for lines still failing only with EDGE_FALLBACK=1 (edge.py), else exit 1
#   5. re-time known words in new overheard clips (spans.py), release the lock, run voice-manifest --check --voiced (the protagonists
#      with a voice reference; one without has no lines in the manifest yet, docs/game/systems.md, Protagonists)
# A step that exits non-zero (the manifest rewrite, a crash, a setup error, a lost lock) stops the batch with exit 1 and the end of its output;
# only takes that were made and checked can count as "no passing take".
# Usage: sh tools/voice/run.sh [--no-manifest] [--dry]   (--dry: list the lines that need a clip, check the setup, stop)
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
die() { say "FAIL: $*"; say "log: $LOG"; exit 1; }
# step <name> <filter> <command...>: runs one pipeline step, shows its output through the filter (gen, check, spans,
# none, or anything else: all but warnings), keeps the whole output in $WORK/logs/<name>.out and stops the batch if the
# step exits non-zero
step() {
  name=$1 filt=$2; shift 2
  out="$WORK/logs/$name.out"
  { "$@" 2>&1; echo $? > "$out.rc"; } | tee "$out" | case $filt in
    gen) grep -v -i -E "$QUIET" ;;
    check) grep -E "^(PASS|FAIL|to check|checked)|Error|Traceback" ;;
    spans) grep -E "^(found|MISSING)|Error|Traceback" ;;
    none) cat > /dev/null ;;
    *) grep -v -i warn ;;
  esac | tee -a "$LOG"
  rc=$(cat "$out.rc" 2>/dev/null || echo 1); rm -f "$out.rc"
  [ "$rc" = 0 ] && return 0
  [ "$rc" = 75 ] && yielded
  say "--- last lines of $name, unfiltered:"; tail -n 15 "$out" | tee -a "$LOG"
  die "$name exited with $rc: a crash or setup error, not a failed take; stopping the batch (whole output: $out)"
}

# Jørgen's image gen dashboard has priority on the GPU (tools/gpu_priority.py): stop with exit 75, lock released by
# the EXIT trap; a rerun picks up from the takes on disk
PRIO="$REPO/tools/gpu_priority.py"
yielded() { say "stopped for Jørgen's image gen dashboard (gpu.priority); takes so far are kept, rerun later"; exit 75; }

for py in "$BENCH_PY" "$QWEN_PY"; do command -v "$py" > /dev/null || die "no Python at $py (QWEN_PY, BENCH_PY: see the voice-clips skill)"; done
case " $* " in *" --no-manifest "*) ;; *) step voice_manifest all node "$REPO/game3d/tools/voice-manifest.mjs" ;; esac
MISSING=$($BENCH_PY "$HERE/cfg.py" missing) || die "tools/voice/cfg.py could not list the lines with no clip (error above)"
if [ -z "$MISSING" ]; then say "every line has a clip"; node "$REPO/game3d/tools/voice-manifest.mjs" --check --voiced; exit $?; fi
say "lines with no clip: $MISSING"
# before the GPU lock: a missing reference or transcript would otherwise fail every take and look like "no passing take"
SETUP=$($BENCH_PY "$HERE/cfg.py" setup "$MISSING" 2>&1) || { say "$SETUP"; die "the voice setup is incomplete (above); fix it before the batch waits for the GPU"; }
case " $* " in *" --dry "*) exit 0 ;; esac
if [ "${EDGE_FALLBACK:-0}" = 1 ]; then command -v "$EDGE_PY" > /dev/null || die "EDGE_FALLBACK=1 but no Python at $EDGE_PY"; fi
OVERHEARD=$($BENCH_PY -c "
import sys; sys.path.insert(0, '$HERE'); from cfg import manifest
need = set('$MISSING'.split(','))
print(any(e['overheard'] for e in manifest() if e['key'] in need))") || die "could not read the manifest's overheard lines"

# the GPU lock: mkdir is the test-and-set; never remove a lock with someone else's name in it
[ -d "$(dirname "$LOCKDIR")" ] || mkdir -p "$(dirname "$LOCKDIR")"
# never while the dashboard has priority; a lock left by dead browser jobs is freed first
until ! "$BENCH_PY" "$PRIO" live > /dev/null && { "$BENCH_PY" "$PRIO" reclaim > /dev/null; mkdir "$LOCKDIR" 2>/dev/null; }; do
  WHO=$("$BENCH_PY" "$PRIO" live) || WHO="GPU lock held by $(cat "$LOCKDIR/owner" 2>/dev/null)"
  say "$WHO, waiting ($(date +%T))"; sleep 120
done
echo "$LOCK_ME" > "$LOCKDIR/owner"
release() { grep -qx "$LOCK_ME" "$LOCKDIR/owner" 2>/dev/null && rm -r "$LOCKDIR" && echo "GPU lock released"; }
trap release EXIT
trap 'exit 130' INT TERM
say "GPU lock taken as $LOCK_ME; VRAM in use: $(nvidia-smi --query-gpu=memory.used --format=csv,noheader 2>/dev/null)"

KEYS=$MISSING
for seeds in 404,505,606 707,808,909 1010,1111,1212; do
  say "takes $seeds for: $KEYS"
  step gen_takes gen "$QWEN_PY" "$HERE/gen_takes.py" "$seeds" "$KEYS"
  grep -qx "$LOCK_ME" "$LOCKDIR/owner" 2>/dev/null || die "GPU lock lost, stopping"
  "$BENCH_PY" "$PRIO" stop "$LOCK_ME" && yielded
  step check_takes check env DEV=cuda "$BENCH_PY" "$HERE/check_takes.py" takes
  step export_dry none "$BENCH_PY" "$HERE/export.py" --dry
  KEYS=$(sed -n 's/^NOPASS {"key": "\([^"]*\)".*/\1/p' "$WORK/logs/export_dry.out" | paste -sd, -)
  [ -z "$KEYS" ] && break
done
step export all "$BENCH_PY" "$HERE/export.py"
if grep -q '"fallback": \[\]' "$WORK/report.json"; then :; else
  # edge-tts sounds nothing like the cast: only fall back when asked (EDGE_FALLBACK=1), otherwise stop loudly
  if [ "${EDGE_FALLBACK:-0}" = 1 ]; then
    say "no local take passed for some lines; edge-tts fallback (EDGE_FALLBACK=1):"
    step edge all "$EDGE_PY" "$HERE/edge.py"
  else
    die "no local take passed for some lines (see $WORK/report.json); not using edge-tts. Fix the refs or rerun; EDGE_FALLBACK=1 to allow it."
  fi
fi
if [ "$OVERHEARD" = True ]; then
  step spans spans env DEV=cuda "$BENCH_PY" "$HERE/spans.py"
fi
release; trap - EXIT
CHECK=$(node "$REPO/game3d/tools/voice-manifest.mjs" --check --voiced); RC=$?
say "$CHECK"
say "log: $LOG"
exit $RC
