#!/bin/bash
# waits for the GPU lock, renders the 9 variants, releases
for i in $(seq 1 180); do mkdir /tmp/claude-1000/gpu.lock 2>/dev/null && break; sleep 20; done
echo carina-art-round7 > /tmp/claude-1000/gpu.lock/owner || exit 1
cd /home/jorgen/repo/japanese/art/candidates/portraits/carina-7
~/ai/consist/.venv/bin/python gen.py > run1.log 2>&1
curl -s -X POST 127.0.0.1:8188/free -H 'Content-Type: application/json' -d '{"unload_models": true, "free_memory": true}' >/dev/null
echo done > hold1.done
