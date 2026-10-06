# Exterior detail validation, 2026-10-06

Task: #278. Base: `07a2a747`. Finished comparisons: `showcase/exterior-detail-1/entry.json`.

The pass extends the approved procedural surfaces and batched outdoor kit. Lawns and roads previously inherited generic concrete or bypassed the look entirely; explicit material roles now reach both ground builders. Nearby facades use cladding joints, drainage stacks and canteen window sills. Existing paving, plant layouts, doors, lights and navigation stay in place. No new generated assets.

The recovered grounds, dorm and lobby changes are already on main (`dc91f912`, `1afc6ef6`, `59b739c2`); the retained environment branches contained no additional unique improvement to recover.

## Checks

- Full CPU gate: 321 tests, syntax, lint, formatting, budgets, dependencies, facts and story checks passed.
- Three new regressions exercise real ground builders, mixed polygon/polyline material attributes, and facade clearance/batching.
- Actual renderer: surface-detail setting toggles the mixed ground shader off and back on; all 1,167 ground vertices keep a material role. No shader/page errors in eight desktop/phone views.
- Day-one fast route passed at 390×844 and 1366×860 (73 seconds each). Existing performance warnings include train/dorm model counts and forecourt/dorm frame tails.
- Public bible check reached 253 routes/4,541 resources; no exterior entry failures. It still reports 195 unrelated missing historical links/quotes.
- Asset gallery has no applicable outdoor room thumbnails; scoped renderer reports all current. Twelve Showcase PNGs are backed up through assets.lock, without binary git commits.

## Bounded renderer samples

Same stationary cameras, quality 0, 120 frames each, sequential runs on an RTX 3080. Phone refers to viewport size, not physical phone hardware. Wildlife is not fixed, so draw/triangle differences include its movement. Median cadence is refresh-limited; these are regression observations rather than a GPU-time benchmark.

| Viewport | Place | Calls before → after | Triangles before → after | Median ms before → after | p99 ms before → after |
|---|---|---:|---:|---:|---:|
| phone | plaza | 55 → 60 | 215618 → 217906 | 16.7 → 16.7 | 16.8 → 16.8 |
| phone | east_lane | 45 → 46 | 137850 → 140282 | 16.7 → 16.7 | 16.8 → 16.8 |
| phone | forecourt | 161 → 164 | 303604 → 304696 | 16.7 → 16.7 | 50 → 33.4 |
| desktop | plaza | 79 → 83 | 230414 → 232702 | 16.7 → 16.7 | 16.8 → 16.8 |
| desktop | east_lane | 56 → 59 | 161072 → 164420 | 16.7 → 16.7 | 16.8 → 16.8 |
| desktop | forecourt | 188 → 190 | 312354 → 312810 | 16.7 → 16.7 | 33.3 → 33.4 |

Raw captures/probes remain in `game3d/shots/exterior-detail/`. Normal-play park views use `east-lane:east_lane:0:0`; canteen/training-centre images are labelled inspection cameras in Showcase. The last grass adjustment changed only two contrast constants; shader structure and geometry match these probes.

Reproduce: `BASE=.claude/worktrees/codex-exterior-detail/game3d node game3d/tools/place-shots.mjs <out> east-lane:east_lane:0:0` and `BASE=<checkout>/game3d OUT=<out> node game3d/tools/perf/scene-probe.mjs 390 844 plaza east_lane forecourt`.
