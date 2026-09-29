# Performance, release QA and deploy (day 1, game3d)

Owner: the shell agent. Tools live in `game3d/tools/`. Numbers below are from build 0928-1808-1ef7506 (2026-09-28).

## Budgets: mid-range Android phone

Profile (`game3d/tools/perf.mjs`): a 393 x 851 screen at DPR 2.75 (the game caps it at 2), touch, CPU throttled 4x in Chrome (DevTools' mid-tier mobile), 4G at 12 Mbit/s and 70 ms for the loads, cache off.

| What | Budget | Why |
|---|---|---|
| Title on screen, cold | 8 s | a train with patchy signal; the boot loader covers it |
| One place, opened on its own | 6 s | places after the first build in the background during the day |
| Download to the title | 12 MB | mobile data |
| Download for the whole day | 40 MB | |
| Frame rate in play | 30 fps sustained, p95 frame under 50 ms | steady, no hitches when walking |
| Draw calls per frame (all passes) | 250 | what mid-range mobile GPUs and drivers take at 30 fps |
| Triangles per frame | 300k | |
| Long tasks (over 50 ms) | under 5 per 10 s of play | input stays responsive |

Headless limits, read the numbers with them: with SwiftShader the frame rate is software rendering (a floor, far below a phone); with `GL=gpu` it is this machine's RTX 3080 (a ceiling). Draw calls, triangles, load time, download size and the CPU-throttled main thread are the numbers that carry over to a phone.

## Results, 2026-09-28 (GL=gpu, q=1)

```
title: 5958 ms, 5.72 MB, 72 requests
place   load ms  MB     fps   p50   p95   worst  long  calls  meshes  tris     heap
train      6487  6.18   43.7  16.7  33.4   50.1     1   2970     845   502962  68.9
gate       6195  6.33   46.9  16.7  33.4   66.7     1   2354     679   277236  73.1
office     7561  6.32   32.4  33.3  50.1   66.7    14   3372    1729   628086  64.8
whole day download: 5.89 MB
```

Over budget (reported to the world agent and the builder):

- **Draw calls, every place: 2,350 to 3,370 a frame, about 10x the budget.** 680 to 1,730 visible meshes, each drawn again for the shadow map and the AO normal pass. Even with the 3080 doing the drawing, the 4x-throttled CPU can't submit them fast enough: the office runs at 32 fps with a 50 ms p95 and 14 long tasks in 8 s. On a real phone this is the first thing that breaks. Fix: merge static props per material (BufferGeometryUtils.mergeGeometries), InstancedMesh for repeats (chairs, desks, straps, plants, seats), leave small props out of the shadow pass (`castShadow = false`), and drop GTAO on the phone tier.
- **Triangles: train 503k, office 628k** (budget 300k). The Meshy characters and the car shell are the likely bulk; check with `renderer.info` per object.
- **Load of one place: 6.2 to 7.6 s** (budget 6 s). Download is small (6 MB), so this is CPU time: parsing three.js and building the place under a 4x-throttled CPU. Only the first place is on the critical path (the others build during the previous place), and the title shows at 6.0 s, inside its budget.
- Within budget: download (5.7 MB to the title, 5.9 MB for the day), title load, gate triangles.

SwiftShader run, same build: 2 fps everywhere (software rendering), same draw calls and loads. JSON for every run: `game3d/shots/perf/<build>-<gl>.json`.

Run: `node game3d/tools/perf.mjs` (SwiftShader) or `GL=gpu node game3d/tools/perf.mjs` under the GPU lock. Options: `--cpu 6`, `--q 0`, `--secs 12`.

## Beat screenshots (visual changes between builds)

`node game3d/tools/beat-shots.mjs 1366 860` plays the day in test mode and shoots the first line of every story trigger (talk, say, event, zone, near, a place's start), named by the trigger, so new beats don't shift the others. It compares each shot with `game3d/shots/beats/approved-1366x860/` and writes `changes.png` (approved | this build | difference) and `report.html` in `game3d/shots/beats/<build>-1366x860/`. The threshold is a mean difference of 7/255 (`BEAT_T`); the sea and walking commuters stay under it. `--approve` makes the current set the approved one; do that after Jørgen has seen a build. Run the phone size too: `node game3d/tools/beat-shots.mjs 390 844`.

The first approved set (0928-1808-1ef7506, 30 beats) was taken before Jørgen saw it, as a baseline to diff against; the day didn't finish in the 7-minute window under load, so it stops in the office.

## Accessibility basics

`node game3d/tools/a11y.mjs` checks the shell screens and the HUD on desktop and phone: text contrast against what is actually behind each line (shot with and without the text), phone text sizes, phone touch targets (44 px) and a keyboard-only pass (title, settings, pause, play). Results in `game3d/shots/a11y/report.json`. See the latest run in the shell agent's report.

## Shell screens in isolation

`node game3d/tools/shell-shots.mjs` shoots title, settings, continue, pause, save, loading, the HUD (goal, hint, notice, and the goal off screen) and the end of the day on desktop and phone, with a contact sheet at `game3d/shots/shell/sheet.png`. Each screen opens on its own with `?shell=<screen>` (js/shell-qa.js).

## Deploy

`sh game3d/tools/deploy-pages.sh` builds the site from the committed tree (HEAD) in a temp folder: game3d's index.html, build.json, css, js, story, fonts, vendor, audio, and only the asset folders the code loads from. Tools, design, ref, shots, notes and portrait candidates stay out (57 MB of game3d becomes 19 MB). It makes one commit with no parent and, with `--push`, force-pushes it as the only commit on `gh-pages`. Main is never touched. `EXTRA="legacy/game legacy/proto2"` carries the older pages at their current paths. `KEEP=1` keeps the folder to serve and check locally (checked 2026-09-28: title, gate and office load with no 404s).

**Not switched on.** It needs the main agent's OK. The one GitHub setting to change: **Settings > Pages > Build and deployment > Source: "Deploy from a branch", Branch: `gh-pages`, folder `/ (root)`** (today it is `main`). After that switch, the old links (legacy/game, legacy/proto2) only keep working if they are published with `EXTRA`. Pushing gh-pages before the switch changes nothing on the live site.

Why: Pages from main means every build's binaries stay in main's history forever. With gh-pages as a single orphan commit, a new deploy replaces the old one and main can stop carrying build output. Main still keeps the source assets; moving large binaries out of main is a separate decision.

## Draw-call pass (perf agent, 2026-09-29): js/perf/batch.js

One generic pass per place, no place files touched: `optimizePlace(place, { game })` right after a place is built.
**Not wired yet**: it needs the one-line hook in main.js (notes/production-requests.md, 2026-09-29, perf). Until then it
only runs in the perf tools, which serve main.js with the hook added. `?nobatch` turns it off.

What it does:
- Merges static meshes into one mesh per look: materials that differ only in colour share one material with the
  colour baked into vertex colours (same shading maths); everything else groups by identical settings. Groups are
  split by median cuts (at most 3 m or 6,000 triangles each; light groups under 1,500 triangles stay whole) so parts
  off screen still get culled.
- Shadow casters go into separate shadow-only batches (culled by every camera except the sun's shadow camera), so
  the shadow pass is a handful of draws instead of hundreds.
- People and story things (their `obj`) only merge within themselves, under their own root. Eric, Mio, skinned
  meshes, named meshes, see-through materials, clipped materials (the lift cut-away), custom shaders and exactly
  coplanar surfaces stay on their own.
- A merged mesh stays where it was, on layer 31 only (cameras skip it; a raycaster with layer 31 still hits it).
  Every frame, before the first pass, every merged mesh and every node above it is checked (transform, visibility,
  parent, material, geometry, and the material's colour, opacity and so on). On any change that mesh draws itself
  again at once (its triangles in the batch are collapsed; no rebuild). A group that moves (the swaying car, a door)
  gets its meshes re-merged under it once they are still for 2 s. Meshes main.js outlines (game.near, game.hover via
  game.objsOf) are lifted out of their batch while outlined and put back after.
- The merging runs in 6 ms slices between frames, so place load time is unchanged.
- InstancedMesh: not used. Almost every prop has its own geometry (1,964 geometries for 1,978 meshes in the office),
  so merging per material is what cuts draws. Triangles were not reduced (no simplification of any prop or character).

### Before / after (build 0929-0419-8a1cf62, 393x851 at DPR 2.75, CPU 4x, q=1, GL=gpu with vsync off)

Draw calls and triangles are for exactly one frame (all passes). Note: perf.mjs counts two frames (it reads
`renderer.info` after two animation frames), so its "calls a frame" are about twice these; the tables above are
two-frame numbers. Frame times are paired in one page (pass off, then on), after 10 s of walking about.

| place  | calls before | calls after | tris before | tris after | p50 ms before | p50 after | p95 before | p95 after | fps before | fps after |
|--------|-------------:|------------:|------------:|-----------:|--------------:|----------:|-----------:|----------:|-----------:|----------:|
| train  | 1,643 | 692 | 314k | 343k | 13.8 | 9.3 | 18.8 | 11.1 | 70 | 105 |
| gate   | 1,296 | 496 | 151k | 188k | 9.2 | 5.5 | 11.1 | 6.8 | 105 | 176 |
| office | 1,720 | 392 | 327k | 396k | 13.9 | 6.8 | 29.9 | 9.2 | 69 | 142 |

Low tier (q=0, no AO or outline): train 759 → 487 calls, gate 880 → 450, office 1,305 → 589; p50 office 9.5 → 6.1 ms.
Load time of one place (budget.mjs, 4G, CPU 4x): train 6.08 → 6.23 s, gate 5.74 → 5.81 s, office 6.46 → 6.53 s
(within run-to-run noise; the pass defers its work). JS heap is 30 to 50 MB higher (the merged copies).

Still over budget: 250 calls a frame at q=1 (people, single meshes and the extra full-scene pass OutlinePass makes
while anything is outlined); triangles 300k (they rose 10 to 25% because merged groups cull less finely; the GPU
cost of that is small next to the CPU saved, see the frame times).

### Look unchanged

- `node game3d/tools/perf/ab.mjs` (pass off vs on in the same paused frame, per place): mean difference 0.000 to
  0.002/255, under 0.003% of pixels off by more than 8/255 (z-fighting speckle), frame-to-frame noise 0.
- `node game3d/tools/perf/day.mjs 393 851` plays the whole day (test mode) and compares off/on every 4 s: day ends,
  no page errors. Phone q=1 and desktop q=2 passed all 16 pairs before outline lifting was added; the last run
  flags one spot in the office kitchen (a tray near the kettle, 7 meshes, mean up to 0.1/255, 0.17% of pixels):
  the batch draws the tray top differently from the meshes on their own. Not fixed yet (coplanar check did not
  catch it). The tool names the batch responsible when a pair is over tolerance.
- Lift ride (clipping), train doors, car sway, NPC walks and outlines checked in those runs.

Tools (take /tmp/claude-1000/browser.lock; `sh game3d/tools/perf/locked.sh <name> <cmd>`; GL=gpu under the GPU lock):
`tools/perf/ab.mjs` (paired numbers and pixel diffs), `tools/perf/day.mjs` (whole-day check), `tools/perf/budget.mjs`
(perf.mjs with the hook), `tools/perf/calls.mjs` (draw calls by pass and kind), `tools/perf/probe.mjs` (what a place
is made of).
