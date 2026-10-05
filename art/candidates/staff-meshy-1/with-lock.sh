#!/bin/sh
# Run a Blender job under the exclusive GPU lock (GUIDE: GPU lock), waiting for it up to about 50 minutes, and
# release it after (only if the owner file still has our name).
#   sh art/candidates/staff-meshy-1/with-lock.sh <command> [args...]
L=/tmp/claude-1000/gpu.lock
NAME=staff-meshy-agent
i=0
until mkdir $L 2>/dev/null; do
  i=$((i + 1)); [ $i -gt 200 ] && { echo "GPU lock never free"; exit 1; }
  sleep 15
done
echo $NAME > $L/owner
"$@"; code=$?
grep -q $NAME $L/owner && rm -r $L
exit $code
