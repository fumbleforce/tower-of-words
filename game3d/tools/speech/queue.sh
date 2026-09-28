#!/usr/bin/env bash
# the bench runs behind notes/VOICE-INPUT.md, one browser at a time (bench.mjs takes the shared browser lock)
cd "$(dirname "$0")/../../.."
B=game3d/tools/speech/bench.mjs
node $B moon wasm 1
node $B tiny wasm 1
node $B base wasm 1
ONLY=clean node $B tiny wasm 4 tiny-wasm-cpu4
ONLY=clean node $B base wasm 4 base-wasm-cpu4
ONLY=clean node $B moon wasm 4 moon-wasm-cpu4
node $B base webgpu 1 base-webgpu
