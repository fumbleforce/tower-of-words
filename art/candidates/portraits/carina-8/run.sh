#!/bin/bash
for i in $(seq 1 300); do mkdir /tmp/claude-1000/gpu.lock 2>/dev/null && break; sleep 20; done
echo carina-art-round8 > /tmp/claude-1000/gpu.lock/owner
cd /home/jorgen/repo/japanese/art/candidates/portraits/carina-8
~/ai/consist/.venv/bin/python gen.py singles > run1.log 2>&1
echo done > singles.done
