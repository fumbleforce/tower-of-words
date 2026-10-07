# Selected crowd integration — 2026-10-07

Jørgen selected `a-image` and `b-image` in crowd-pilot-5. His exact B comment is **“though she has a bald spot at the front of her face”**. A remains byte-identical. B keeps the selected eyes, face, body and clothing; a single local masked RDBT/LLLite render supplies only the fringe correction. The first projection and its tiny residual pale sampling dots remain visible in correction history. A six-pixel edge resampling pass addresses those dots without another generation. The final UV support, prompt, workflow, seed and exact source/output hashes are saved with the take.

Root inspected actual textured front/angled B views and accepted the bounded correction. All native walk/run/sit GLBs and approved idle JSONs match the selected originals byte for byte; the CPU provenance regression asserts the exact hashes, native skin and leg-bone presence. Texture projection asserts exact equality outside its separately projected support. No geometry, weights, eyes or non-hair texture changes.

## Runtime scope

Only ambient `office` bodies use the selected A/B pair. Other clothing categories, named workers, population counts, path planning, collision clearance and gait thresholds are unchanged. Files load once and each walker gets a separate skeleton; the existing body remains available if a model download fails. Native movement uses the existing measured-root-motion gait and sitting API. Bags remain attached to the real hand bone.

## Evidence

- Live viewer: desktop and phone, treadmill and loop, idle→walk→run→idle→sit→walk. **24 ten-second state runs**, plus eight seconds of actual wall-clock walking per viewport. No freezing. Sampled knee forward offsets: walk **0.010–0.103**, run **0.0075–0.145**; no reverse-knee sample. Actual side seating captures retained.
- Actual plaza crowd: both viewport sizes, selected A/B present, camera-visible walking skeletons keep changing over twelve seconds. The initial fixture incorrectly treated every `root.visible` walker as on-camera, counting intentionally unrendered offscreen skeletons as frozen; the failure log is retained. The corrected fixture projects each sampled body through the actual camera before requiring sustained visible motion.
- Hardware renderer counters at the same plaza overview, q1, before→after: desktop **195→186 calls, 479596→461374 triangles**; phone **76→78 calls, 245423→244825 triangles**. Ambient positions evolve during these samples; this is a bounded counter comparison, not a frame-time benchmark.
- Full day 1: desktop **72s, 12474 movement steps**; phone **72s, 12512 steps**. Both PASS with **0 overlaps, 0 spins, 0 sustained gait warnings**. Two desktop/three phone short 1.2s advisories and existing performance-baseline warnings remain recorded; no thresholds changed.
- CPU initial pass: **620 tests pass**; the new history HTML initially lacked crawler metadata. Added `noindex, nofollow`; robots check now passes. Final source gate: all checks and **620 tests PASS**. Deliberate missing-B download also passes: A loads, existing worker fallback remains visible.

All full-route traces, original failures, first projection and final captures are retained under `art/parts/crowd-selected-1/` and the preserved fast evidence. Review5 keeps every previous option and exact user feedback; the new correction is an execution of that selection, not a replacement face design.
