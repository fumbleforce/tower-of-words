#!/usr/bin/env bash
# the bench runs behind notes/VOICE-INPUT.md, one browser at a time (bench.mjs takes the shared browser lock)
cd "$(dirname "$0")/../../.."
B=game3d/tools/speech/bench.mjs
SCORE=1 node $B base wasm 1 base-wasm-cpu1
SCORE=1 node $B tiny wasm 1 tiny-wasm-cpu1
node $B moon wasm 1 moon-wasm-cpu1
SCORE=1 ONLY=clean node $B base wasm 4 base-wasm-cpu4
SCORE=1 ONLY=clean node $B tiny wasm 4 tiny-wasm-cpu4
ONLY=clean node $B moon wasm 4 moon-wasm-cpu4
# WebGPU uses the 3080: under the GPU lock too
until mkdir /tmp/claude-1000/gpu.lock 2>/dev/null; do sleep 30; done; echo "voice-input $(date -u +%FT%TZ)" > /tmp/claude-1000/gpu.lock/owner
SCORE=1 node $B base webgpu 1 base-webgpu
grep -q voice-input /tmp/claude-1000/gpu.lock/owner && rm -r /tmp/claude-1000/gpu.lock
echo QUEUE-DONE
