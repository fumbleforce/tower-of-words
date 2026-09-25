#!/usr/bin/env bash
# Start the local conversation model for Amakawa: Orion 26B-A4B on llama-server, port 8190 (OpenAI-compatible).
# Runs from the amakawa:// link in the game (see install-launcher.sh) or by hand. Safe to run twice.
# If ComfyUI is running and idle, its VRAM is freed first; if it's busy, llama-server fits into what's left (--fit on).
# LLM_CPU=1 runs on the CPU only (slow; for testing without touching the GPU).
set -u
PORT=8190
BIN="$HOME/ai/llama/bin"
MODEL="$HOME/ai/llm-models/TheDrummer_Orion-26B-A4B-v1.1-Q4_K_M.gguf"
LOG="${XDG_CACHE_HOME:-$HOME/.cache}/amakawa-llm.log"
mkdir -p "$(dirname "$LOG")"
if curl -sf "http://127.0.0.1:$PORT/health" >/dev/null; then echo "already running on :$PORT"; exit 0; fi
if pgrep -f "llama-server.*--port $PORT" >/dev/null; then echo "starting already (see $LOG)"; exit 0; fi
if [ -z "${LLM_CPU:-}" ] && curl -sf http://127.0.0.1:8188/queue -o /tmp/amakawa-comfy-queue.json 2>/dev/null; then
  if python3 -c "import json,sys; q=json.load(open('/tmp/amakawa-comfy-queue.json')); sys.exit(0 if not q.get('queue_running') and not q.get('queue_pending') else 1)"; then
    curl -sf -X POST http://127.0.0.1:8188/free -H 'Content-Type: application/json' -d '{"unload_models":true,"free_memory":true}' >/dev/null && echo "freed ComfyUI VRAM"
  else
    echo "ComfyUI is busy; not freeing its VRAM (llama-server will fit around it)"
  fi
fi
EXTRA=(--fit on)
[ -n "${LLM_CPU:-}" ] && EXTRA=(-ngl 0)
cd "$BIN"
LD_LIBRARY_PATH="$BIN" nohup ./llama-server -m "$MODEL" --port "$PORT" --host 127.0.0.1 -c 8192 -fa on --jinja -t 16 "${EXTRA[@]}" >"$LOG" 2>&1 &
echo "llama-server starting (pid $!), log: $LOG"
[ -z "${LLM_CPU:-}" ] && command -v notify-send >/dev/null && notify-send "Amakawa" "Starting the local AI (Orion). About a minute." || true
