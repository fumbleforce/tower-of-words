#!/bin/sh
# Run a Blender job under the exclusive GPU lock (GUIDE: GPU lock): waits its turn in the GPU queue as a render for
# up to about 50 minutes, and releases the lock after (tools/gpu_priority.py run).
#   sh art/candidates/staff-meshy-1/with-lock.sh <command> [args...]
exec python3 "$(dirname "$0")/../../../tools/gpu_priority.py" run staff-meshy-agent --rank render --timeout 3000 -- "$@"
