#!/bin/sh
# QA capture runner: waits for the shared browser lock first, then takes the GPU lock if it's free (the GPU renders
# about 20x faster than SwiftShader) or falls back to SwiftShader. Releases both when the run ends.
#   sh game3d/qa/run.sh <script.mjs> <args...>
cd "$(dirname "$0")/../.."
if [ -z "$QA_IN_LOCK" ]; then QA_IN_LOCK=1 exec sh game3d/tools/with-browser-lock.sh qa sh game3d/qa/run.sh "$@"; fi
GL_LOCK=/tmp/claude-1000/gpu.lock
if mkdir "$GL_LOCK" 2>/dev/null; then
  echo qa-capture > "$GL_LOCK/owner"
  trap 'grep -q qa-capture "$GL_LOCK/owner" 2>/dev/null && rm -r "$GL_LOCK"' EXIT INT TERM
  export GL=gpu
fi
echo "GL=${GL:-swiftshader}"
node "game3d/qa/$@"
