#!/usr/bin/env bash
# the bench runs behind notes/VOICE-INPUT.md (Chrome's CPU throttling doesn't reach the worker, so there are no throttled runs), one browser at a time (bench.mjs takes the shared browser lock)
cd "$(dirname "$0")/../../.."
B=game3d/tools/speech/bench.mjs
SCORE=1 node $B base wasm 1 base-wasm-cpu1
SCORE=1 node $B tiny wasm 1 tiny-wasm-cpu1
node $B moon wasm 1 moon-wasm-cpu1
# WebGPU uses the 3080: under the GPU lock too
python3 tools/gpu_priority.py run voice-input --rank render -- env SCORE=1 node $B base webgpu 1 base-webgpu
echo QUEUE-DONE
