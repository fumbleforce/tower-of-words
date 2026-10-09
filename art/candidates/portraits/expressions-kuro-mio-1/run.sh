#!/bin/sh
# Run inside the GPU lock: python3 tools/gpu_priority.py run expressions-kuro-mio-1 -- sh run.sh <gen.py specs...>
# Starts ComfyUI if it is down, renders, then frees ComfyUI's VRAM and stops the server if this script started it.
HERE=$(dirname "$(readlink -f "$0")")
started=
if ! curl -s -m3 http://127.0.0.1:8188/system_stats >/dev/null; then
  (cd ~/ai/ComfyUI && nohup ~/ai/sd/venv/bin/python main.py --listen 127.0.0.1 --port 8188 --disable-auto-launch >> ~/ai/comfy.log 2>&1 &)
  started=1
  for i in $(seq 1 90); do curl -s -m2 http://127.0.0.1:8188/system_stats >/dev/null && break; sleep 2; done
fi
~/ai/sd/venv/bin/python "$HERE/gen.py" "$@"; rc=$?
curl -s -X POST -H 'Content-Type: application/json' -d '{"unload_models": true, "free_memory": true}' http://127.0.0.1:8188/free
[ -n "$started" ] && pkill -f 'main.py --listen 127.0.0.1 --port 8188'
exit $rc
