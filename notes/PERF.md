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
| Draw calls per frame (all passes) | under 200 | current phone limit (2026-09-30); report peaks as well as medians |
| Triangles per frame | 300k | |
| Long tasks (over 50 ms) | under 5 per 10 s of play | input stays responsive |

Headless limits, read the numbers with them: with SwiftShader the frame rate is software rendering (a floor, far below a phone); with `GL=gpu` it is this machine's RTX 3080 (a ceiling). Draw calls, triangles, load time, download size and the CPU-throttled main thread are the numbers that carry over to a phone.

## Evening delivery: coverage and draw calls (2026-09-30)

Build `0930-1816-165fbd6`, runtime `17ee1a1`. The fast day route skips the optional evening discoveries.
When their stories, hooks or saved state change, run `node game3d/tools/evening-check.mjs 390 844` and
`node game3d/tools/evening-check.mjs 1366 860` before landing, alongside the full-day runs. Use the normal
browser-job GPU admission. `BASE` selects a worktree; `PLACES` permits a focused rerun of a failed case.
The tool checks actual interactions, repeat use and Continue. Voices are muted; its screenshots still need
visual inspection. This is a release check, not an automatic step in `tools/land.sh`.

This delivery ran those checks before landing. Passing cases are retained under `game3d/shots/evening/`:
phone forecourt in `integration-phone/result.json`, plaza in `final-phone/result.json`, dorm courtyard in
`dorm-phone/result.json`; desktop forecourt/plaza in `final-desktop/result.json`, dorm courtyard in
`dorm-desktop/result.json`. The earlier combined reports also retain failed cases subsequently rerun;
they are not all-pass reports. Claude C0201 separately passed the full day at both sizes with all voices.

Final phone q0 GPU run (`.claude/worktrees/codex-evening-discoveries/game3d/shots/fast/2026-09-30T18-10-04-130Z-2226296/perf.json`):

| Place | Earlier baseline median | Current median | Sampled maximum |
|---|---:|---:|---:|
| forecourt | 131 | 175 | 241 |
| plaza | 43 | 58 | 72 |
| dorm_court | 40 | 50 | 78 |

The new interactions add movable props and characters that cannot all join the static batches; the dorm route
also adds hall geometry. These explain additional rendering work, but no paired measurement yet attributes
each added call. Median frame time was 16.7 ms in these areas on the desktop GPU, not measured phone hardware.
Keep the old baselines and their warnings. The medians are under 200; the forecourt maximum is not. The recorder
does not timestamp peak samples, so a transition or preparation explanation remains unproven. Claude owns
attributing and reducing that peak; changing the baseline cannot establish compliance with the phone limit.

### Where the evening's draws went, and the fixes (issues #93, #94)

Measured with `day-calls.mjs --every 100 --trips --who <id>` against the build before the dorm floor and the
discoveries (496e82d), phone q0. What the new staging added: the two movable bikes by the forecourt rack were
about 20 meshes each and cast shadows (35 shadow draws wherever the rack is in the shadow map); 203's mailbox flap
was a box with six materials (6 draws); the plaza's canteen worker and the dorm hall's new geometry add a few more.
The forecourt's 241 peak was not new staging: it is the lift ride's first seconds (the two Sales riders, 43 draws
and 44 shadow draws, unmerged because they idle), and a second peak (about 207) on entering from the gate is Kuroda:
his torso starts breathing on entry (cast.js `idle()`), the draw-call pass lets his 27 parts go, and merges them
again under the torso about a second later.

- Each movable bike is merged per material when it's built (places/fallen-bikes.js; its front wheel stays apart to
  turn): 35 → 11 shadow draws. The flap is one box with two groups (scenes/dorm-court/hall.js): 6 → 2.
- The draw-call pass batches every person's parts under their torso from the start (perf/batch.js), so nobody
  comes apart on entry: Kuroda 54 → 6 draws in the forecourt's first second.
- The forecourt's lift riders cast no sun shadow (places/lift.js): the car there is under the head office's upper
  floors. Paired shots with it on and off at arrival and during the ride (phone q0 and q1, desktop): no pixel of the
  3D view changed. Their blob shadows stay; the office's riders are untouched.
- Look: `ab.mjs` pass off/on for forecourt, dorm_court and office is the same as on main (forecourt 0.06% of pixels
  over 8/255, the same planter pool as before); close-ups of the bikes and the flap (open and shut) at 390x844 and
  1366x860 match main.
- The fast test prints `perf peaks` per place: the busiest sampled frame's calls, which visit, seconds after entry,
  Eric's position and whether a trip was on screen (js/perf/metrics.js, in perf.json as `callsMaxAt`).

Fast test after (GL=gpu), median / sampled peak calls; the baselines in budgets.json were rewritten from these runs
(`PERF_BASELINE=1`; reason: the evening staging, less what the fixes above took back; the desktop office and forecourt
1% lows stay at 16.8 ms, as that run's 50 ms were one-off frames):

| place | phone q0 before | phone q0 after | phone q1 (default) after | desktop q0 after |
|---|--:|--:|--:|--:|
| forecourt  | 175 / 241 | 147 / 167 | 158 / 181 | 167 / 226 |
| plaza      |  58 / 72  |  49 / 60  |  56 / 67  |  60 / 62  |
| dorm_court |  50 / 78  |  46 / 47  |  54 / 94  |  59 / 96  |
| dorms      |  74 / 76  |  74 / 76  |  81 / 126 |  83 / 107 |

Every outdoor place and the dorms are under 200 at the phone default, median and peak. Other places in the same
runs, phone q1 median: train 244 (the first place, see Phone default quality), gate 181, office 196 (240 before).
Preparation (`hitch.mjs`, 390x844, CPU 4x, q0): plaza → dorm_court longest task 73 ms, dorm_court → dorms 98 ms,
the same as before the dorm floor (69 and 89 ms on 496e82d); at 1366x860 none over 50. The one long step is the dorm
courtyard's `buildCourt` (about 60 ms at CPU 4x in one step of `dormCourtSteps`) and the dorms' builder, which isn't
sliced; both older than this delivery.

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
Every place but Eric's room runs this pass after the look in places/lifecycle.js (`BATCHED`; train and gate since 2026-09-30, see Phone draw calls below). `?nobatch` disables the pass. Model picking includes the original geometry on layer31. The cup tray, counter and sink plate keep their original draw order because their top surfaces overlap.

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
  game.objsOf) are lifted out of their batch while outlined and put back after (since 2026-10-01 they draw from
  twins of their batches meanwhile, see "Outline draws").
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

## World look (js/look/, 2026-09-29)

The look runs in places/lifecycle.js prepare() after attachLift and before the draw-call pass's first scan, in slices
(`lookSteps`, see Preparation hitches below; `applyLook` is the same work at once, for tools and the showcase). It patches materials in
place and adds a per-vertex `aBake` attribute; batch.js folds `aBake` into its vertex colours and copies the shader
patch onto its batch materials (clone() drops onBeforeCompile). Numbers: game3d/shots/style-in-game/ and review
style-in-game.

## Performance metrics (2026-09-29): overlay, fast-test numbers, budgets

Jørgen asked for performance metrics in place of player-stuck telemetry (review productivity-review). Code:
js/perf/metrics.js (overlay and recorder), game3d/test/support/perf-report.mjs (perf.json, summary, warnings),
game3d/tools/perf/budgets.json (the baseline). The overlay itself is described in docs/game/controls-and-ui.md.

- **Overlay** (F3 or Settings > Performance numbers): fps and average frame time over the last 600 frames, the
  1% low (the frame time only 1% of those frames exceed, shown as fps; red under 30), draw calls and triangles of
  one whole frame (every pass: shadow, AO, outline, main), geometries and textures in GPU memory, the JS heap
  (Chrome only), the place and the tier. Numbers refresh twice a second.
- **Recorder**: on with `?test=` or `?perf`. Every frame's time goes into a preallocated array per place; draw calls
  and triangles are sampled every 10th frame (`renderer.info` reset and held for exactly one frame). No per-frame
  allocations. `window.__perfReport()` returns per place: frames, median, 1% low (p99) and worst frame time,
  median and max draw calls and triangles.
- **Fast test**: `node game3d/tools/fast.mjs` writes `perf.json` in its artifact folder and prints one line:
  `perf (desktop, gpu, q0; median/worst frame, median calls and tris): train 16.7/483.3 ms, 779 calls, 146k tris | ...`
  Then `PERF WARN <place> <number> is N% over the baseline` for every number more than 20% over budgets.json. A
  warning never fails the run.
- **Reading the warnings**: draw calls and triangles are compared on any GL (they don't depend on it). Frame times
  (median and 1% low) are compared only with a baseline taken on the same GL: `gpu` when the fast test got the GPU
  lock, `software` (SwiftShader, about 10x slower) otherwise. The worst frame is in perf.json and the summary but not
  budgeted: it is one frame (usually the next place building in the background) and swings from run to run. Under
  vsync the GPU median sits at 16.7 ms, so the 1% low is the frame-time number that moves. The fast test runs at
  q0 (low tier); `QUALITY=1 node game3d/tools/fast.mjs 390 844` runs it at medium, compared with its own baseline
  (`phone-q1`). A tier without a baseline is not compared.
- **Which warnings to trust**: draw calls and triangles repeat to within 1% between runs, so a warning on them is a
  real change. Frame times depend on what else is using the machine: tests now share the GPU in slots
  (tools/lib/browser-job.mjs), and with another test on the GPU the office's median went 16.7 to 33.2 ms and 1% lows
  doubled on an unchanged build. Treat a frame-time warning as real only when it repeats on a quiet machine
  (`cat /proc/loadavg`, nvidia-smi) or in `tools/perf/ab.mjs`.
- **Tools that read renderer.info themselves** set `window.__perfHold = true` while they sample and restore
  `autoReset = true` after (tools/perf/ab.mjs does), so the recorder doesn't reset their counters.
- **New baseline**: after a change that is meant to move the numbers, `PERF_BASELINE=1 node game3d/tools/fast.mjs
  1366 860` and `... 390 844` rewrite that layout's entry for the GL the run got. Only a passing run writes it.
  Commit budgets.json with the change and say why in the message.

Baseline (issue #78 on 969067b, the dorm courtyard on the outdoor kit, plus the phone medium tier below; fast test,
GL=gpu; draw-call pass on every place but Eric's room). Median frame 16.7 ms everywhere (vsync). Desktop and phone at
q0, and phone at q1 (medium, what phones run by default; `QUALITY=1`, stored as `phone-q1` in budgets.json).

| place | desktop q0 calls | desktop q0 tris | phone q0 calls | phone q0 tris | phone q1 calls | phone q1 tris |
|---|--:|--:|--:|--:|--:|--:|
| train      | 232 | 158k | 183 | 133k | 253 | 196k |
| gate       | 250 | 136k | 168 | 111k | 193 | 124k |
| forecourt  | 142 | 158k | 122 | 147k | 128 | 147k |
| office     | 450 | 530k | 217 | 265k | 240 | 291k |
| plaza      |  49 | 135k |  43 | 131k |  50 | 133k |
| dorm_court |  50 |  55k |  38 |  54k |  45 |  56k |
| dorms      |  69 |  30k |  63 |  30k |  70 |  30k |

Phone q0 and q1 are inside the phone budget (250 calls, 300k triangles) but for the train at q1, which reads 231 to
253 between runs: the train is the first place, and the fast test spends its few seconds there while the draw-call pass
is still merging (see "Phone default quality" below for its settled numbers); since issue #137 the merging is done before its first frame, median 157 in the fast test ("The train's first seconds"). The previous baselines: fa26043 had
train 230/230, gate 245/187, office 450/216 (desktop/phone q0); 0930-0748 (d2c8515) had train 851/680, gate
1,157/731, office 918/590; 0929-1848-b196ef5 (office unbatched) had train 779/648, gate 1,246/833, office 4,130/2,714.

## Phone draw calls (2026-09-30, review office-perf)

Jørgen: "Fix now, lighter look on phone allowed; low priority but should be done". Phone q0 in the fast test, before
(d2c8515) → after: train 680 → 230 calls, gate 731 → 187, office 590 → 216; triangles 133k → 144k, 92k → 123k,
436k → 264k. Desktop keeps its look and got the same batching: train 851 → 230, gate 1,157 → 245, office 918 → 450.
Stills before/after at both sizes (phone: train and gate unchanged, the office's furniture without sun shadows; desktop
unchanged; close-ups of the straps and the rack lights): game3d/shots/phone-perf/.

Why train and gate were unbatched: nothing on record. The pass came with a hook for every place (e1ef56a) and the
office was switched on alone (6c15d84), then the outdoor chunks. Switched on, the train showed why it would have looked
poor: the car sways, so every mesh in it was let go and merged again a level of moving groups at a time, a scan a
second, while the fast test spends only about 6 s in the train. What changed:

- js/perf/batch.js, all layouts, no change on screen (`ab.mjs`: under 0.04/255 mean, max 0.1% of pixels over 8/255):
  - train and gate in `BATCHED` (places/lifecycle.js).
  - Meshes let go because a group above them moved merge again after 0.3 s, with scans every 0.3 s until they have
    (`REGROUP_MS`; it was 1.5 s and a scan a second).
  - Materials the look patched (`userData.look`) have their colour baked into vertex colours like plain ones: the
    patch works on `diffuseColor` after the vertex colours, so it's the same maths. They had been grouped per colour.
  - A mesh with nothing to merge with still casts through a shadow-only batch (it draws itself from a batch of one).
  - See-through meshes marked `userData.stackable` merge with each other: contact footprints and blob shadows (one
    colour, normal blending) and the light pools (additive), which stack to the same pixels in any order. Against
    other see-through things the order can change where a pool lies over a footprint: the gate's pair check
    (`day.mjs`) shows 0.1% of pixels over 8/255 at the planter by the wall lamp, max 87/255; per-object sorting there
    was camera-dependent before too.
  - A merged mesh whose material changes (the lift ride dims the pools) merges again once the material holds still;
    the third change leaves it drawing itself. It used to draw itself for good, and the pools did after every ride.
  - The stillness check reads transforms from the local matrices (world matrices can be a frame apart).
  - Helpers moved out: batch-snap.js (material keys and snapshots), batch-split.js (median cuts).
- Instancing where things move every frame, all layouts: the train's hand straps (js/train/straps.js, two instanced
  meshes placed from the swinging pivots, about 100 draws with shadows → 4) and the office's rack lights
  (js/scenes/office-leds.js, blinking by scale, 45 → 2). The straps no longer get the look's baked light (instanced
  meshes are skipped by look/index.js); they hang in the air, so it doesn't show.
- Phone only (js/perf/phone.js, `isPhone()` from settings.js; `?fullphone` turns it off): batches up to 6 m and 12,000
  triangles instead of 3 m and 6,000 (office 267 → 242 calls, 242k → 269k triangles), and in the office only people
  cast sun shadows (the shadow pass had about 80 batches and 170k triangles; props keep their contact footprints and
  baked light).
- `node game3d/tools/perf/day-calls.mjs [w h] [--places ...]` plays the day and prints per place where the draws go
  (pass, kind, and the objects outside a batch), the tool used for all of the above.

### Phone default quality (2026-09-30, issue #78)

Real phones run q1 (medium: Settings > Graphics "auto" picks it on a phone-sized screen), but the budget was measured
at q0. At q1 the phone drew about twice as much: GTAO drew the whole scene again for its normals, and while anything is
outlined (Eric near a target, about half the time) the outline drew it again for its depth. Phone medium now fits
instead of phones dropping to low, which would lose the outline, bloom and tilt-shift. Desktop keeps its tiers.

- Phone medium has no ambient occlusion (js/perf/phone.js `phoneTier`, read by post.js). Bloom, the tilt-shift, the
  outline, the 1.5 pixel ratio and the 2048 shadow map stay. High on a phone keeps AO.
- The outline's depth pass was cropped to the outlined thing here (60 to 80 → 16 to 35 draws); since 2026-10-01 it
  is gone, see "Outline draws" below.
- In the train on a phone the passengers and the cat cast no sun shadow (about 60 draws a frame); their blob shadows
  stay, Eric and Mio still cast theirs.

Phone 390x844, fast test median calls a frame (GL=gpu), before (065d595) → after:

| place | q0 before | q0 after | q1 before | q1 after |
|---|--:|--:|--:|--:|
| train      | 222 | 183 | 480 | 231 to 253 |
| gate       | 182 | 168 | 286 | 193 |
| forecourt  | 118 | 122 | 200 | 128 |
| office     | 216 | 217 | 451 | 240 |
| plaza      |  43 |  43 |  89 |  50 |
| dorm_court |  44 |  38 |  91 |  45 |
| dorms      |  63 |  63 | 167 |  70 |

(The dorm courtyard was rebuilt in between, 969067b.) Settled, at each place's start spot 8 s after loading
(q1): train 431 → 213 with a passenger outlined, office 467 → 252 with the lift outlined (80 meshes; its outline alone
is about 100 draws with the cropped depth pass), gate 190 → 108, forecourt 227 → 132. Stills before/after per place
at 390x844 medium, desktop at high, and close-ups of the train seats and the outline: game3d/shots/phone-quality/.
The look: slightly flatter corners and seat backs without AO, no passenger shadows on the train seats.

Entry hitches (`hitch.mjs` entry mode, q0, GL=gpu, before → after): train → gate worst frame 33 → 33 ms at both sizes,
gate → forecourt 17 → 17 (phone), 33 → 17 (desktop); no long task. The crossfade snapshot is now a canvas copy
(places/crossfade.js) instead of a JPEG: 31 → 22 ms phone, 36 → 21 ms desktop for train → gate. The fast test's worst
train frame (67 to 83 ms) is the first place's start, not an entry; the gate's (33 ms) came down from 100.

### Outline draws (2026-10-01, issue #82)

The office by the lift drew about 250 to 300 calls a frame on phone medium in the fast test, about 90 of them the
outline. Three changes, all layouts, the outline looking the same (close-ups of the lift, Kenji behind his desk and a
train passenger at 390x844 medium, and the lift on desktop high):

- Things with no model of their own (main.js `objsOf` → gameplay/highlight.js `meshesNear`, cached at first use) no
  longer take in people standing near them: the lift's set was 78 meshes, 58 of them its two riders and Eric. Now 20,
  and the lift outline no longer wraps whoever was by it.
- A merged mesh lifted out of its batch for the outline draws from a twin of that batch (js/perf/batch-twin.js: the
  batch's vertex buffers with an index of just the lifted parts), one draw per batch instead of one per mesh, in the
  main pass and in the outline's mask (the pass selects the twins: `perf.forOutline`, through `outline.resolve`).
  The desk (about 70 meshes) went from about 120 outline and lifted draws to 12.
- The outline no longer draws the scene's depth: post.js gives the composer's targets a depth texture and the mask
  compares the target with the main render's depth (js/perf/outline.js; hidden only when something lies more than
  1 cm plus 4 mm per metre in front). three's depth pass, cropped, stays as the fallback without a depth texture.

Phone 390x844 q1, fast test (`day-calls.mjs --every 60`; calls a frame / of them the outline's), before (18b0d47) →
after: lift 287 to 289 / 90 → 161 to 233 / 14 to 18; desk 397 to 417 / 123 to 130 → 218 to 246 / 12; vending 296 to 320
/ 80 → 201 to 225 / 3; copier 355 to 380 / 85 → 279 to 293 / 10. Settled at the office start with the lift outlined:
202 → 138. Left over 250 in the office: moments of a scene with nothing outlined (up to about 320: Emi's and the
other people's parts and shadows while they move), and the train's first seconds (up to about 500 while the batches
settled; fixed, see the next section).

### The train's first seconds (2026-10-01, issue #137)

The train drew up to about 500 calls a frame on phone medium for its first 1.3 s: its batches were built in `prepare()`
under the scene, then the first played frame swayed the car, every mesh in it was let go and drew on its own until the
pass had found each moving group (car, neighbour cars, pillars, bags, heads) and merged again under it. On a portrait
screen the car's shell was also rebuilt for the end-on view at entry (`fit()`), after the pass, so its new meshes waited
2 s; and the station, hidden until the train brakes, was merged only 2 to 3 s after it showed (330 to 400 calls).
Now, all layouts, with no change on screen:

- A place lists what its update moves every frame in `place.perfMovers` (places/train.js: the car's pivot, the
  station, the neighbour cars and bellows, the pillars from train/world.js, the nodding bags and plant, the passengers'
  heads, the cat's head and tail); batch.js treats them as moving groups from its first scan. The track joints, which
  slide on their own, are `noBatch`.
- The scan also merges inside a hidden group that moves, hanging the batches under it, so they hide and show with it
  (the station).
- `prepare()` calls `place.layout(aspect)` before the pass (places/lifecycle.js; the train's `layout()` is the shell
  switch that was in `fit()`), still after the look, so the shell is the same as before.

Phone 390x844 q1, fast test (`day-calls.mjs --places train --every 60`, GL=gpu), before (31e1cba6) → after: the first
1.3 s 470 to 494 → 128 to 179 calls; train max 494 → 332, median 175 → 161; the station's arrival 330 to 400 → 172 to
237. Desktop 1366x860 q1: max 1,054 → 585, median 356 → 333. What is left over 250 in the train is the walk out at the
end (about 0.4 s at 310 to 340: the closed car fading in, see-through and changing materials). Time to the train's
first frames (phone, CPU 4x, 3 runs each): median 2.56 → 2.54 s; the pass's own work before the first frame 280 to 310
→ 370 to 410 ms, in slices. Stills of the train at the start, the aisle, the station stop and the platform, before and
after, both sizes: same within run-to-run noise.

Note for `day.mjs`: its off/on pairs used to read as over tolerance while something was outlined; fixed, see the next
section but one.

### People as skinned batches (2026-10-01, issue #136)

The office still reached about 320 calls a frame on phone medium while people moved: a person's parts merged under
their root and torso, so a walking or gesturing person (legs, knees, arms, head) let go of every part on a moving joint,
and each drew on its own with its shadow (Emi about 32 draws and 30 shadow draws, Tama 16). Now, all layouts, with no
change on screen:

- js/perf/batch-rig.js: a person's parts (place.people, not Eric and Mio) merge into one skinned mesh per look, each
  part weighted fully to the group it hangs from (that group is its bone). The batch bends exactly as the parts would
  move, so a moving person draws once and casts once. Only a part's own change (its transform, visibility, material,
  geometry) sends it back to drawing itself; its joints are only watched for staying visible and attached. People's
  batches are built at the first scan, hidden ones too (Aoi and Rei in the office), so nobody draws part by part for
  2 s when shown. Outlined people draw from skinned twins (batch-twin.js). `?norig` turns it off.
- Culling (issue #155): each skinned batch keeps a sphere per joint round that joint's parts, and every frame, before
  the cameras cull (check()), its culling sphere is refitted round those spheres where the joints are now; the twins
  share it. A fixed sphere round the bind pose let Kuroda's briefcase swing out of it, so the batch could vanish at
  the screen edge. test/unit/rig-bounds.test.mjs walks, sits and idles every person and checks each vertex.
- Phone office (js/perf/phone.js): props a scene adds later under `place.space` (the copier's sheets, the vending
  machine's can) cast no sun shadow, like the office's other props there; the 15 sheets in the copier tray drew 30
  times a frame while settling.

`day-calls.mjs --every 60`, GL=gpu, before (07d92fa3) → after. Phone 390x844 q1: office max 322 → 248, median
198 → 176, frames over 240 59 of 301 → 2 of 298; Emi's draws at most 64 → 4. Train median 162 → 144 (max is still
the walk out, 332 → 321); gate median 180 → 141, max 301 → 276 (its first frames). Desktop 1366x860 q1: office max
914 → 802, median 735 → 724; train median 334 → 286; gate 443 → 388. Look: people's batches off and on in the same
paused frame through the whole day (nothing outlined), worst mean 0.013/255, at most 0.0024% of pixels over 8/255, at
both sizes; close-ups of people in the train, gate and office looked the same. `day.mjs` reads as before (its pairs
fail only where a person is outlined, on main as well).

### The train's departure and the gate's first frames (2026-10-01, issue #145)

Two peaks over the phone budget were left: the train at about 320 calls for 0.4 s as it pulls out at the end, and the
gate at about 280 in its first second. Now, all layouts, with no change on screen:

- The train's departure moved each child of the car on its own (places/train.js `departureMovers`), so every mesh under
  the shell, the benches and the plant was let go and drew itself (about 160 draws) until merged again under the group
  that moved. The car's own build now hangs under one group, `car.cab` (js/train/car.js; the shadow proxy stays out,
  it stays behind), listed in `place.perfMovers`, so its batches hang under it from the first scan and pull out with it.
  A saved game from an older build restores the departed train through the flags instead of the car's part list.
- The gate's office workers and commuters (`place.extras`, `place.crowd`) are now skinned batches like `place.people`
  (js/perf/batch.js `excluded()`), built at the first scan, hidden ones too. Walking commuters had drawn part by part
  with their shadows (about 40 draws each) for their first seconds on screen.
- `day.mjs` compares correctly with an outline up: toggled off, the pass's `forOutline` gives the outline the lifted
  meshes themselves rather than the (then hidden) twins. What it still flags is on main too: the held doors during
  their kotodama (the "on" frame draws the pulsing doors darker; #152), and under 0.2% of pixels at the gate's planter
  footprints, the office and Eric's room.

`day-calls.mjs --every 60`, GL=gpu, before (577c2367) → after. Phone 390x844 q1: train max 321 → 194, median 142 → 143,
the departure 300 to 321 → 182 to 193; gate max 276 → 142, median 146 → 103. Desktop 1366x860 q1: train max 567 → 396,
median 261 → 282 (run-to-run); gate max 531 → 333, median 375 → 283. Fast test phone q1 peaks: train 197, gate 141.
budgets.json: calls and triangles of train, gate and office from these fast tests (desktop q0 142 / 145 / 390, phone
q0 125 / 95 / 167, phone q1 143 / 103 / 174); the frame-time baselines are kept, the machine was busy. Stills of the
departure and the gate's first frame, pass on and off, on main and after: the same.

## Office integration (C-0110, 2026-09-29)

The office now uses the existing batching pass on both layouts, preserving all modelled detail. Claude reviewed layer31 picking, outline lifting, story visibility changes, fan motion and kotodama effects (C-0121).

Paired paused q0 views, same page with the pass off/on: phone 2,295→560 draw calls; desktop 4,052→912. After excluding the overlapping cup tray, counter and sink plate, pixels differing by more than8/255 were0.00091% on phone and0.00494% on desktop. Remaining differences are small edge pixels.

Full-day GPU fast runs passed phone (70s) and desktop (69s). Office median calls were801 and1,268 respectively; geometry was421k and530k triangles. Phone triangles exceed the previous345k baseline by22%, because larger merged bounds cull less finely. The first desktop run recorded a train Eric/Mio overlap at use:tama; the retry passed. Evidence: game3d/shots/office-batching/.

This does not meet the250-call phone target. Lower phone detail and preparation hitches remain open: the observed worst frame was133ms in office on phone,200ms on desktop, with larger hitches in train/gate. No budget is loosened here.

## Preparation hitches (2026-09-30): js/perf/slice.js

The next place is built while the player walks in the current one (NEXT after arrival, the outdoor chunks as Eric
heads for them). Building the office (scenes/office.js, about 230 ms) and its look (look/index.js and bake.js, about 260 ms) ran
as one main-thread task, so the forecourt froze for about half a second. Now the builders and the look are
generators that `yield` between steps (a room, a desk, a person, a mesh, 2,048 vertices of the bake), and
`sliced()` runs them in 8 ms slices, one slice a frame. While the player is waiting (the loading chip, or nothing on
screen yet) the slices are 40 ms and run back to back. `buildOffice()`, `buildLobby()` and `applyLook()` still run
everything at once for tools. The draw-call pass's first scan is a job that yields every 64 meshes, and its
coplanar check looks up boxes by height instead of testing every pair (4 ms instead of 26 ms in the office).
`?slice=0` runs it all in one task, the old way.

Look unchanged: with uuids and Math.random made deterministic, every mesh's baked light, surface pattern, vertex
colour, visibility and layer hash the same with `?slice=0`, with slices, and on the build before
(office, gate, forecourt, plaza, both sizes).

Measured with `node game3d/tools/perf/hitch.mjs <w> <h> <from:to> ...` (opens `from` with its own preload off, then
prepares `to` while it records frames and long tasks; `CPU=4` slows the CPU like perf.mjs's phone; JSON in
game3d/shots/perf/before-hitch-*.json and after-hitch-*.json). GL=gpu, q=1, build 9397590 before:

| trip | size | longest task before | after | 1% low before | after |
|---|---|--:|--:|--:|--:|
| forecourt → office (preload for the lift ride down) | 1366x860 | 487 ms | none over 50 | 20 fps | 59.5 fps |
| forecourt → office | 390x844 | 494 ms | none | 15 fps | 59.5 fps |
| forecourt → office | 390x844, CPU 4x | 1,827 ms | 55 ms | 5 fps | 20 fps |
| gate → forecourt (outdoor) | 1366x860 | 51 ms | none | 59.5 fps | 59.5 fps |
| gate → forecourt | 390x844 | none | none | 59.5 fps | 59.5 fps |
| gate → forecourt | 390x844, CPU 4x | 172 ms | 53 ms | 30 fps | 20 fps |
| forecourt → plaza | both | none | none | 59.5 fps | 59.5 fps |
| train → gate | 1366x860 | 96 ms | none | 30 fps | 59.5 fps |

The office preload takes longer in wall time (about 0.5 s became 0.9 s; 3.4 s at CPU 4x) since it works 8 ms a
frame, which is well inside the forecourt walk. The 1% low over a few seconds is one or two frames, so it moves a lot
between runs; the longest task is the steady number. Left over at CPU 4x: attachLift (about 50 ms), one office step
with a canvas text texture (48 ms) and the forecourt's builder (plaza and dorm_court are split since
2026-09-30, see Walk-home chunks below). The worst frames the fast test printed on entering a place were shader compiles: see Entry
hitches below.

## Entry hitches: shader warm-up (2026-09-30): js/perf/warm.js

Cause, measured with `hitch.mjs` in entry mode (a trip written `from>to`: `to` is prepared and left to settle, then
`game.travel(to)`; it times every WebGL call, `GLDETAIL=1` by method and program, `PROGRAMS=1` lists the new ones):
on build c298db0 the office entry frame (250 ms, desktop q0) was 142 ms of shader compile and link (36 new
programs), 28 ms of texture upload, 25 ms of buffer upload and the rest JS; the gate entry (133 ms) was 109 ms of
shaders. Programs depend on the scene's light count, so every place needs its own even for materials seen before.

The fix: at the end of `prepare()` in places/lifecycle.js (after the draw-call pass is done), `warmPlace()` compiles
the next place's programs with `renderer.compileAsync` a few meshes at a time between frames (6 ms slices), uploads its
textures (`renderer.initTexture`), then makes the first use of each program (`getUniforms`), which in Chrome still
waited 10 to 20 ms a program after the driver said it was ready. What `compile()` doesn't cover is handled by
stand-ins: the shadow pass's depth material per kind of caster, and the materials the GTAO normal pass and the outline
draw the whole scene with (`game.overrideMaterials()` in main.js, only while they are on). Eric and Mio are compiled
for the next place too. The scene is compiled for a half-float render target, as the RenderPass draws into one.

Also fixed: the lift's landing lamp came and went with the landing, which changed the light count and recompiled the
whole forecourt mid-ride (67 ms). It now stays in the scene at intensity 0 (places/lift.js).

Worst frame of the entry (walk out, crossfade, 2 s in the new place), GL=gpu, before (c298db0) → after:

| trip | 1366x860 q1 | 390x844 q1 | 1366x860 q0 | 390x844 q0 |
|---|--:|--:|--:|--:|
| train → gate | 100 → 50 ms | 133 → 50 | 133 → 33 | 133 → 50 |
| gate → forecourt | 83 → 33 | 67 → 33 | 67 → 50 | 67 → 17 |
| forecourt → office (lift) | 217 → 50 | 183 → 50 | 233 → 50 | 200 → 50 |

No long task over 57 ms is left on any entry. Frames are vsync-quantised (16.7 ms steps). Left: the lift cut-away's
clipped materials (their shadow depth variant, about 19 ms at the office and forecourt): three's `compile()` can't
build clipping variants (it never sets the clipping state), so they compile on first use; buffer uploads (bufferData,
up to 16 ms; three has no public way to upload geometry ahead); and the crossfade snapshot (25 to 45 ms as a JPEG,
about 22 ms as a canvas copy since 2026-09-30, in the last frame of the old place).

## Walk-home chunks (map upgrade task G, 2026-09-30)

Preparing the outdoor chunks while the player walks the one before (`hitch.mjs` in preparation mode, 390x844, CPU 4x,
q0, GL=gpu; before is d2c8515):

| trip (the place being played → the one built) | longest task before | after | 1% low before | after |
|---|--:|--:|--:|--:|
| forecourt → plaza | 215 ms | none over 50 | 59.5 fps | 59.5 fps |
| plaza → dorm_court | 113 ms | none | 59.5 fps | 59.5 fps |
| office → forecourt (for the lift up) | 248 ms | 162 ms | 15 fps | 15 fps |
| gate → forecourt | 254 ms | 177 ms | 12 fps | 15 fps |

- Rounded boxes (`rbox` in props.js) are made once per size and copied (js/perf/rounded-box.js): three's
  RoundedBoxGeometry works out every vertex and uv again, and `clone()` on one rebuilds a default box first. This
  halved every chunk builder at CPU 4x (plaza 186 → 95 ms, dorm courtyard 101 → 50, forecourt 236 → 120). The copies
  hold the same numbers, each mesh its own arrays.
- The plaza and dorm courtyard builders are generators (`plazaSteps`, `dormCourtSteps`, with `skylineSteps` and
  `mergeStaticSteps`) run by `sliced()`; the longest step is 11 ms at CPU 4x.
- Left: the forecourt's builder is still one task (about 120 ms at CPU 4x, 47 of it the head office). Splitting it
  needs `forecourtSteps()` in scenes/forecourt.js and `await sliced(...)` in places/forecourt.js, which another task
  had open.
- The draw-call pass now runs on the plaza and dorm courtyard too. It changes little there: their builders already
  merge per material (mergeStatic), so paired q0 views at 393x851 went plaza 102 → 102 calls, dorm courtyard 140 → 139,
  with no pixel difference (`ab.mjs`, whose hook now runs the pass after the look, as the lifecycle does; it ran it
  before the look, which patched the batches' shaders twice).
- `node game3d/tools/perf/builder-profile.mjs <module> <export> [args] [--gen]` profiles one builder at CPU 4x: the
  functions with the most time and, for a generator, its longest step.

## The east lane past the plaza (2026-10-01, #139)

The plaza now builds the east lane as backdrop (game3d/js/scenes/plaza/east-lane.js). Its kerbs, planting, furniture
and block fronts go into their own Parts collector that casts no shadow, since all of it but block_e1 and m_e2 lies
outside the sun's shadow box (only those two blocks' walls cast); window panes are flat quads. Fast test, plaza median
calls and triangles: phone q0 49 → 50 calls, 121k → 160k tris; phone q1 (medium) 56 → 58 calls (peak 69, under 250),
123k → 164k; desktop q0 60 → 64 calls, 130k → 169k. The plaza's triangle baselines in budgets.json are raised to these
runs (the added content, under the 300k budget); the call baselines stand.

## North of the lane (2026-10-01, #142)

The plaza now also builds the back lane behind the canteen as backdrop (game3d/js/scenes/plaza/north-lane.js,
north-yard.js): the lane, the canteen's yard and apron, the clinic, office_e1, block_e2, m6 and a grove, in one
collector that casts no shadow (it lies outside the sun's shadow box). The shadows of its trees and blocks, and of the
east lane's, are laid flat on the ground instead (outdoor/shade.js: one mesh for the morning sun and one for after
work, one shown). Fast test, plaza median calls and triangles against the baselines: phone q0 54 calls (baseline 49),
160k → 197k tris; phone q1 62 calls (baseline 56, peak 74), 164k → 199k; desktop q0 68 calls (baseline 60), 169k →
206k. The plaza's triangle baselines in budgets.json are raised to these runs (under the 300k budget); the call
baselines stand, the calls being within the 20% tolerance.

## The dorm cluster past the dorm courtyard (2026-10-01, #141)

The dorm courtyard now builds the dorm cluster round the inner court as backdrop (game3d/js/scenes/dorm-court/
cluster.js), and the plaza builds it too, with a stand-in for the courtyard (dorm-court/cluster-standin.js). It goes
into its own group after the courtyard's merge, casts and takes no shadow, and is collected in cells about 8 across
(dorm-court/cells.js), so the cells the camera can't see are culled; the woods round its edges are most of what is
left drawn. The builder is a generator (`clusterSteps`), sliced with the rest.
Fast test, dorm courtyard median calls and triangles: phone q0 46 → 64 calls, 68k → 113k tris; desktop q0 59 → 81,
68k → 119k (peaks 86 and 83, under 200). The plaza is unchanged (phone 47 calls, 161k). budgets.json's dorm_court
phone and desktop baselines are raised to these runs; phone-q1 wasn't measured. `hitch.mjs 390 844 plaza:dorm_court`
at CPU 4x: preparing the courtyard while the plaza plays went 650 → 1400 ms, longest task 60 ms both, 1% low 30 → 20
fps.

### The cluster in finer slices (2026-10-01, #161)

The 1% low drop above came from a few long steps in the courtyard's builder, each one frame: at CPU 4x,
`endSquare`+`backYards` 60 ms, each of the woods (`belts`) 30 to 50 ms, the block fronts 44 ms, the cells' meshes
24 ms, and the courtyard's own `buildCourt` 51 ms (older). Now they are generators with a `yield` every few trees,
after every face and roof of a block (plaza/east-fronts.js `frontsSteps`; `buildFronts` drains it, so the east and
north lanes are unchanged), after every cell's meshes (dorm-court/cells.js), and between the courtyard's parts
(dorm-court/court.js `courtSteps`); the plaza's stand-in too. places/lifecycle.js waits a frame before and after the
finds' floor raycasts (about 18 ms at CPU 4x in the courtyard). Longest builder step 60 → 21 ms (Eric's block,
older). Every mesh's geometry, colour, matrix and shadow flags hash the same as on 287fe5d4 (dorm_court and plaza
builders), and place shots at both sizes differ only in edge noise.

`hitch.mjs 390 844 plaza:dorm_court`, CPU 4x, q0, GL=gpu (shots/perf/before-161-* and after-161-*):

| | prepare | long tasks | frames over 34 ms | worst frame | 1% low |
|---|--:|--:|--:|--:|--:|
| before (287fe5d4, 2 runs) | 1,450-1,510 ms | 3 (60 ms) | 6-7 | 67 ms | 15 fps |
| after (6 runs) | 1,690-2,050 ms | 0 in 5 runs, one of 67 ms | 0 in 4 runs, 1 in 2 | 33 ms (50 and 117 once each) | 30 fps (29.9 in 3: p99 33.4 ms) |

The 1% low is the 30 fps step: the slowest frames are now one vsync late, not two or three. The preparation takes
longer in wall time, still well inside the walk. Left over: `forecourt:plaza` at CPU 4x has 280-330 ms tasks on
main as well (the plaza's `buildGreen`, `buildEastLane` and `buildNorthLane` steps, older than the cluster).

Phone q1 (default tier) fast test, measured for the first time since the cluster: plaza 61 calls (peak 74), 198k
tris; dorm_court 71 (peak 79), 115k. Both written to budgets.json's `phone-q1` entries.

## The clinic built again (2026-10-01, #165)

The clinic (plaza/north-clinic.js) goes into the north lane's collectors like the rest: its signs are one mesh with one
texture (the canopy's name, the hours, the departments, the stair's name and the sign stone), and its bikes are laid
into the collector, so the only call it adds is that mesh. Fast test, plaza median calls and triangles: phone q0 53 → 54
calls, 201k → 204k tris; desktop q0 68 → 68 calls, 210k → 213k. Within the baselines; budgets.json unchanged.

## The plaza in finer slices (2026-10-01, #163)

Preparing the plaza while the forecourt plays had three long tasks of 280 to 330 ms at CPU 4x. Per step of
`plazaSteps` (each step profiled alone, CPU 4x): `buildGreen` 112 ms, `buildEastLane` and `buildNorthLane` together
243 ms (the clinic 39 of it), the shop street 35 to 54, the canteen 25, the seafront's steps about 20, the static
merge's biggest set 26, the cluster's `court` 28. Now generators with a `yield` every few trees and flowers, after
every face of a block and every building of the shop street, between the parts of the lanes, the yard, the clinic
(`officeBlockSteps`; `officeBlock` drains it, so the forecourt is unchanged), the canteen, the ground and the seafront,
and after each mesh the static merge copies (merge-static.js). Longest step 243 → about 20 ms; 433 → 880 steps.

What was left was one task of about 190 ms after the builder: the finds' spot (finds/index.js), which built the
plaza's whole walk grid (`Nav.build`, 125 ms at 4x) and raycast the floor through meshes with no bounding spheres yet
(43 ms). `findSpotSteps` now runs in slices: the bounds a mesh at a time, the grid in columns (`Nav.buildSteps`;
`build` drains it), then each find. Same grid, same spot.

No visible change: every mesh's geometry, colour, matrix, layers and shadow flags hash the same as on a044c7bb for the
plaza, the forecourt and the dorm courtyard builders; place shots at both sizes differ from main only in edge noise
(0.01 to 0.03% of pixels, on bench and bike edges, and the build stamp).

`hitch.mjs 390 844 forecourt:plaza`, CPU 4x, q0, GL=gpu (shots/perf/before-163-* and after-163-*):

| | prepare | long tasks | worst frame | frames over 1.5x median | 1% low |
|---|--:|--:|--:|--:|--:|
| before (a044c7bb, 2 runs) | 2,980-3,010 ms | 3 (296-335 ms) | 317-350 ms | 15-17 | 8.6-10 fps |
| after (3 runs) | 3,230-3,440 ms | 0 | 50 ms | 12-24 | 29.9-30 fps (p99 33.4 ms) |

Plaza budgets re-measured from the fast test (median calls, tris): desktop q0 60 → 64, 206k → 216k; phone q0 49 → 50,
197k → 206k; phone q1 61 → 58, 198k → 208k (the clinic and the seafront since the last entries). Written to
budgets.json.


## Fast travel memory

2026-10-06, issue #261, `game3d/tools/map-travel-check.mjs`, q0 on the desktop GPU with a 390 × 844 touch viewport. Six hops through the map from room 203: plaza, sports, shop street, east coast, gate, pool. The JS heap after garbage collection grew from 22 MB to 60 MB; nine places were prepared at the end, with 396 geometries and 134 textures. The 1366 × 860 run ended at 63 MB, 486 geometries and 137 textures. This is a browser memory sample, not a measurement on a physical phone.

The full map uses a 2D canvas and stops the covered game's rendering loop; the browser check verifies that the render frame counter stops. Closing the map clears its canvas allocation. Prepared places remain cached, as during walking; no eviction was added.

### Sports centre lobby and hall (2026-10-06)

The reception lobby, glass partition and changing block add geometry to the gym. Day 3 fast runs on
1366×860 and 390×844, q0 on the GPU, measured 59 calls / 34,561 triangles on desktop and
44 / 32,895 on phone (previous gym: 41 / 24,923 and 26 / 24,623). Median frame 16.7 ms and
p99 16.8 ms at both sizes; this desktop GPU timing is not a phone hardware measurement.
The gym baseline uses build 1006-0729-a6aa0d51 with the printout pickup correction applied.
Artifacts: game3d/shots/gym-recovery-logs/ (fast logs and per-place performance reports).


## Moving creature draws (#237, 2026-10-06)

Birds of each species now share one standard skinned mesh, with one bone per rigid body or wing.
This reduces three draws to one while preserving the original vertices, vertex colours, material and
pose matrices. Insects, ground discs and the older plaza flock recompute conservative bounds after
movement; hidden zero-scale slots no longer stretch those bounds back to the origin. Species counts,
behaviour, geometry and quality settings are unchanged. No performance baseline was raised.

The bounded `tools/perf/creature-parity.mjs` compares four species in four poses against main: all
1,126,400 rendered pixels were identical under explicit software GL. It also steps the older flock
through 120 simulated seconds and 15 complete departures/returns: state and instance matrices match
exactly, hidden parts stop drawing, and every visible vertex stays inside its bounds. Unit tests
check repeated wing/fold cycles and the exact skinned vertex positions under a transformed parent.
`tools/perf/scene-probe.mjs` samples actual renderer counters and 120 frame intervals at a fixed camera;
software timings are not hardware performance evidence.

Final measurements use the corrected place clock from `e67ccb26` on both sides. The GPU identifies as
ANGLE/Vulkan on an NVIDIA RTX 3080; these are desktop-GPU measurements at two viewport sizes, not
physical-phone hardware results. Quality is q0. The following stationary-camera samples ran alone on
the GPU, after warm-up, with 120 frame intervals per scene. Every before/after sample had a 16.7 ms
median and 16.8 ms p99.

| Viewport | Scene | Calls before → after | Triangles before → after |
|---|---|---:|---:|
| 1366×860 | plaza | 85 → 79 | 230,414 → 230,414 |
| 1366×860 | east_lane | 60 → 56 | 161,072 → 161,072 |
| 1366×860 | dorms | 89 → 89 | 81,609 → 81,609 |
| 390×844 | plaza | 67 → 55 | 216,338 → 215,618 |
| 390×844 | east_lane | 49 → 45 | 137,850 → 137,850 |
| 390×844 | dorms | 39 → 39 | 71,573 → 71,573 |

The full day-1 magic route passed before and after at both sizes, 73 seconds each, with no bypasses
or sustained movement/gait failures. Its median plaza calls fell **61 → 52 on phone** and **78 → 69
on desktop**, below the existing warning thresholds. Route triangles were 214,064 → 213,302 and
227,598 → 226,750 respectively. These functional runs overlapped other browser jobs, so their frame
time tails are not used as timing evidence; the quiet samples above are separate.

The original dorm frame-time regression did not reproduce in the quiet checks. The expanded dorm
still submits about 83k triangles during the full route and warns against the older 59.5k baseline.
That warning remains visible. Experimental dorm spatial/shadow grouping reduced too few triangles
and increased calls, so none of those changes were retained. Scene content and all budgets remain
unchanged. The east-lane samples retain the original triangle count while reducing calls.

Validation: full CPU gate and staged commit checks passed; an independent code and tool review found
no blocking findings; root reviewed the pose sheet and both live plaza views without an appearance
blocker. Reproducible checks are `node --test game3d/test/unit/instance-bounds.test.mjs`,
`AFTER=.claude/worktrees/<name>/game3d node game3d/tools/perf/creature-parity.mjs`, and the scene probe
command in that tool's header. Captured reports, route logs and comparison sheets from this run are
preserved outside the disposable worktree at `/tmp/perf-237-evidence/`.

## Place budgets (#372, 2026-10-09)

`node game3d/tools/perf/place-budget.mjs` opens every place on its own (all 26 in `PLACE_FILES`, indoor and outdoor), measures it, and fails when a number goes over its budget. tools/land.sh runs it before main moves on any branch that changes game3d/, and refuses the landing with the place, the tier, the number and the budget, unless the place is just as far over on main (then it lands with a warning; land skill). It takes about 3.5 minutes on a quiet machine. `--places forecourt,plaza` and `--tiers phone` narrow a run, and `--json <file>` keeps every camera's numbers. The rules are in place-budget-lib.mjs, with unit tests in test/unit/place-budget.test.mjs.

What it measures, per place and tier (game3d/tools/perf/place-budgets.json, `tiers`):

- phone: 390x844 with touch, medium tier (q1, what phones run), overview camera. Load is timed with the CPU throttled 4x, as the phone budget above assumes.
- desktop: 1366x860, high tier (q2), the overview camera and the third-person camera at its lowest pitch, turned eight ways from the start spot. The worst view counts. The mouse look goes through a pointer lock faked for that page only, because a headless browser can't take a real one.
- draw calls and triangles: whole frames (every pass), the median of four frames per view.
- geometry and texture MB: every geometry and texture the place's scene reaches, each counted once, textures as uncompressed RGBA with mipmaps. Shadow maps and post-processing targets depend on the screen and are left out.
- load: from navigation until the place has drawn its first frames, in the `?place=<name>&cap` start (no story, no next place being prepared).

The places are opened through a private server of the checkout the tool is in, so a worktree is measured exactly as it is. One place is open at a time, each in its own browser context that is closed before the next place opens, to keep memory down. A place over budget is measured once more and the lower numbers count, so a crowd walking into view doesn't fail a landing. A load time gets a 15% allowance for run-to-run noise (`allowance`), and when the machine's load average goes over 16 during the run a load over budget is only a warning. The check uses a browser GPU slot like the fast test. If the machine or the slots stay busy, it exits 75 and land.sh lands with a warning, as it does for the boot check.

The budgets:

| | draw calls | triangles | geometry MB | texture MB | load |
|---|--:|--:|--:|--:|--:|
| phone | 200 | 300k | 64 | 96 | 6 s at CPU 4x |
| desktop | 500 | 800k | 128 | 192 | 4 s |

The phone calls, triangles and load are the phone budgets at the top of this file. The rest had no target before this, so these are starting values. iOS Safari allows a page about 224 to 384 MB of canvas and WebGL memory (notes/research/world-chunking.md), and 64 + 96 MB per place lets the place on screen and the next one prepared fit together. The desktop numbers are for a laptop with integrated graphics, not this machine's 3080: about two and a half times the phone's calls and triangles, and double its memory.

Known exceptions: a place that is over today has its own higher ceiling for that number in `places`, with the issue that will bring it down. The ceiling is about 5% over what was measured (25% for load times), and the place may not go past it. When a place gets back under the budget, the check prints a note asking for its exception to be removed. Exceptions recorded on 2026-10-09: the forecourt's phone geometry (#372; its calls and triangles came under budget in stage 2, below); character skins at 2048x2048 that put most places over the texture budget (#373; the approved office-role models in 98609f13 took the gate to 187 MB and the office to 222 MB; the phone's came down in stage 4, below, the desktop's of shop street, east coast and office remain); and, for #374, the plaza's desktop triangles and the forecourt's phone calls and triangles and desktop calls and triangles (stage 3 says what is behind the forecourt's). The canteen, bakery and ferry terminal's calls, the office's calls, triangles, geometry and load, and the phone geometry of the forecourt, plaza (57 MB), east lane (40) and shop street (39) came under in stage 3, and those exceptions are gone.

To change a budget or add an exception, edit place-budgets.json in the same commit as the change that needs it, and say why in the commit message. An exception needs an issue (the unit test checks it).

Measured on 2026-10-09 on main e47b108e (with the new planting) plus this tool, on the RTX 3080. The load times are from a quiet run just before the planting landed; the run with the planting had a load average of 32, which stretched every load. The desktop calls and triangles are the worst of nine views; the last column is the overview camera alone. `*` marks a number over budget that has a known exception.

| place | phone calls | phone tris | phone geo MB | phone tex MB | phone load s | desktop calls | desktop tris | desktop overview calls |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| train | 149 | 147k | 64 | 147 * | 4.9 | 327 | 288k | 296 |
| gate | 101 | 127k | 27 | 142 * | 3.6 | 249 | 214k | 249 |
| forecourt | 213 * | 406k * | 95 * | 162 * | 6.1 | 524 * | 841k * | 504 |
| plaza | 73 | 266k | 101 * | 134 * | 6.2 | 369 | 930k * | 207 |
| canteen | 314 * | 43k | 5 | 48 | 2.1 | 807 * | 92k | 807 |
| campus | 57 | 132k | 23 | 49 | 2.8 | 144 | 311k | 112 |
| print_shop | 133 | 16k | 2 | 50 | 2.1 | 234 | 27k | 225 |
| office | 204 * | 256k | 123 * | 177 * | 7.0 * | 782 * | 970k * | 766 |
| dorm_court | 83 | 102k | 44 | 74 | 4.5 | 217 | 375k | 210 |
| dorms | 52 | 65k | 33 | 50 | 2.9 | 238 | 184k | 202 |
| shotengai | 91 | 223k | 67 * | 246 * | 6.0 | 413 | 550k | 173 |
| izakaya | 149 | 21k | 4 | 113 * | 2.2 | 247 | 34k | 236 |
| bakery | 274 * | 46k | 7 | 50 | 2.0 | 508 * | 94k | 508 |
| konbini | 139 | 181k | 31 | 54 | 3.0 | 306 | 274k | 249 |
| karaoke | 36 | 13k | 2 | 70 | 2.1 | 83 | 22k | 67 |
| karaoke_booth | 51 | 13k | 3 | 99 * | 2.2 | 97 | 22k | 87 |
| east_lane | 68 | 178k | 74 * | 113 * | 5.3 | 293 | 692k | 167 |
| east_coast | 68 | 86k | 64 | 211 * | 5.8 | 362 | 576k | 150 |
| dorm_commons | 50 | 20k | 6 | 130 * | 4.8 | 151 | 38k | 99 |
| sports | 68 | 124k | 48 | 136 * | 5.6 | 243 | 409k | 161 |
| pool | 49 | 88k | 43 | 118 * | 4.2 | 227 | 405k | 112 |
| gym | 60 | 32k | 7 | 118 * | 2.6 | 153 | 55k | 139 |
| office_quarter | 53 | 96k | 38 | 109 * | 4.2 | 223 | 407k | 135 |
| harbour | 57 | 118k | 51 | 102 * | 5.0 | 240 | 372k | 143 |
| ferry_terminal | 219 * | 38k | 7 | 62 | 2.2 | 519 * | 84k | 519 |
| works | 46 | 80k | 47 | 57 | 3.6 | 175 | 376k | 93 |

The desktop texture MB are the phone's, except sports (159). Shotengai and the east coast are also over the desktop texture budget (#373). Outdoors the desktop holds up to 19 MB more geometry than the phone (plaza 120 MB, forecourt 112 MB), and the office (130 MB) is over the desktop geometry budget (#374). Desktop loads were 0.8 to 2.1 s, all under 4 s.

### Stage 2: the forecourt under the phone's calls and triangles (#372, 2026-10-09)

Most of what the phone drew was out of view. A place's build merges everything of one material into one mesh (scenes/merge-static.js, outdoor/parts.js), so the forecourt's trees were one 40k-triangle mesh, drawn in full by the camera and again by the shadow map while about a tenth of it was on screen; its paving, beds and the shop street's seafront the same. On the phone's overview about 60k triangles were in view out of 240k drawn by the camera. What changed, all geometry, nothing in how a place is lit:

- Cut into pieces (js/perf/tile-geometry.js, called by mergeStatic): a merged mesh over its limit is cut by where its triangles lie. What casts a shadow goes in 8 m squares on the phone (sets over 2,000 triangles) and pieces of 8,000 triangles on the desktop; the draw-call pass merges those pieces back near each other into batches of 8,000 on the phone (`phoneBatch` cast), which costs no memory since a caster is copied into a batch for its shadow anyway. What casts none goes in pieces of 4,000 (phone) or 8,000 (desktop) that draw themselves: batched, they'd be held twice.
- Shadows from stand-ins (js/perf/shadow-proxy.js): the shadow-only batches draw a lighter geometry where a mesh has one. Everywhere: the trunks' and hedges' own lighter copies (the `_lo` nodes), icosahedra for the faceted shrub balls. On the phone also: icosahedra for the leaf masses, a block per hedge plant, slabs for the benches, and three-sided tubes and coarser wheels for the parked bikes. The shadow filter's soft edge hides the difference; the before/after pictures are in Showcase perf-forecourt-20261009.
- Consolidated shadow batches are cut by where their meshes are (they all counted as at the origin, so a shadow batch spread over the whole place and was never culled).
- Batches merge meshes of different surfaces once the look has run (what a mesh is made of rides in its vertices): for shadow casters and meshes under 1,500 triangles only, for the same memory reason.
- No zero texture coordinates on untextured merged meshes (Parts and mergeStatic held 8 bytes a vertex for nothing).
- The seafront and the shop street's west end in the forecourt are no longer named (named meshes are never merged or batched, so each drew whole from every camera); the bike frame tubes are open-ended; the leaning bike in the bike court batches while it stands still.

| | phone calls | phone tris | phone geo MB | desktop calls | desktop tris | desktop geo MB |
|---|--:|--:|--:|--:|--:|--:|
| forecourt before | 211 | 397k | 92.7 | 522 | 843k | 111.5 |
| forecourt after | 192 | 287k | 89.3 | 464 | 786k | 107.5 |
| plaza before | 73 | 265k | 101 | 371 | 955k | 122.6 |
| plaza after | 73 | 152k | 92 | 433 | 865k | 113.3 |
| east lane before | 68 | 178k | 73.9 | 299 | 731k | 89.2 |
| east lane after | 71 | 121k | 67.7 | 323 | 614k | 83.1 |

Before is main a3c0a22d (with the far view of c43e2815), measured on the same machine the same hour. The campus went from 57 to 103 phone draws and from 132k to 65k triangles. The forecourt's phone geometry is still over its budget (64 MB): about 30 MB of it is the hidden source meshes the draw-call pass keeps to fall back on, never drawn; that is the next step of #372.

### Stage 3: the interiors under the budgets (#374, 2026-10-09)

The canteen, bakery and ferry terminal never ran the draw-call pass: they were missing from `BATCHED` in places/lifecycle.js, so every colour of their kit-built rooms (scenes/dorms/kit.js makes one mesh per colour and surface) and every part of their props and people drew on its own, each again for the shadow map. They run it now, with the phone's batch sizes like every other place. Same paused frame, pass off (as before) and on: mean difference 0.001 to 0.005/255, under 0.01% of pixels off by more than 8/255 (z-fighting speckle). Geometry grows by the merged copies (canteen 5.3 to 9.6 MB, bakery 6.9 to 12.3, ferry terminal 6.4 to 9.8); their exceptions are gone.

| | phone calls | phone tris | desktop calls | desktop tris |
|---|--:|--:|--:|--:|
| canteen before | 314 | 43k | 807 | 92k |
| canteen after | 80 | 48k | 252 | 92k |
| bakery before | 274 | 46k | 508 | 94k |
| bakery after | 44 | 56k | 146 | 96k |
| ferry terminal before | 219 | 38k | 517 | 84k |
| ferry terminal after | 57 | 42k | 216 | 88k |

The office, and what it took that every place now has (measured on main e8261bec plus this work; the worst of the place budget check's views; the phone table above was the overview alone):

- The two sender monitors (investigations/sender/props.js) marked their whole group `noBatch` for a canvas screen, so both CRTs, 38 parts each, drew alone. Only the screens are `noBatch` now, and the cart only its button.
- A merged mesh's own GPU copy is let go once nothing drawn shares its geometry (js/perf/batch-free.js, called after each scan); the arrays stay for raycasts and re-merging, and three.js uploads them again if the mesh ever draws itself. The place budget check counts what is on the GPU: a merged mesh whose copy went (`geometry.userData.perfFreed`) is left out, its batch counted. This was about half of every batched place's geometry (the office 122 to 59 MB on the phone, the forecourt 89 to 49).
- Rounded boxes (perf/rounded-box.js) cast their shadows through a plain box of their size (shadow-proxy.js `shadowGeometry`): the office's shadow-only batches went from 181k to 43k triangles. A small rounded box (under 0.6 m) whose radius is under 1.5 mm, which the callers' clamping makes of every thin part, is a plain box (12 triangles instead of 108 to 588). Long ones keep their rounding, because the baked light lives on their vertices (a 13.6 m floor strip went 20/255 lighter as a plain box).
- Interiors (a place `in` another in travel/pins.js) batch on the desktop as on the phone, 6 m or 12,000 triangles: from the overview or the third-person camera most of a room is in view, so the finer cut only cost draws (office overview 582 to 478).
- The third-person camera's walls and ceiling (scenes/rooms/enclosure.js, hidden in the overview) were `noBatch`, 60 draws twice over (the desktop's AO pass draws everything again). Its group is a `perfAnchor` now: the pass treats it like a moving group and batches its meshes under it while hidden, so they show and hide with it (office third person 536 to 450).
- On the phone the shadow-only batches draw their casters snapped to a 2 cm grid (shadow-proxy.js `snappedShadow`, kept where it saves a fifth), below the shadow map's 1.2 cm texels and its blur; what collapses never showed in a shadow (the forecourt's shadow batches 78k to 60k triangles).

| | phone calls | phone tris | phone geo MB | desktop calls | desktop tris | desktop geo MB |
|---|--:|--:|--:|--:|--:|--:|
| office before | 203 | 256k | 122.4 | 780 | 970k | 129.2 |
| office after | 165 | 245k | 59.2 | 494 | 783k | 60.3 |
| forecourt before | 233 | 349k | 89 | 561 | 937k | |
| forecourt after | 226 | 320k | 48 | 539 | 931k | 58 |

The forecourt's before is the coordinator's run on main 9486b0ea. A carried bag's parts share one material, so they draw as one mesh now (crowd/looks.js; the parts stay in the bag, hidden, for the carry checks): a bag on a hand bone draws on its own with its pose callback, twice on the desktop. Before and after from the same views (office and canteen at phone and desktop, overview and two third-person facings, two page loads each): the differences are within what two loads of the same build differ by (repeated props get a random tint per load, look/bake.js, and the screens animate); close-ups of the walls, desks, CRTs, the third-person walls and ceiling and a carried briefcase show no change. The forecourt stays over two budgets, both with a raised ceiling: on the phone the approved crowd bodies (#353) draw one by one, with their bags, about ten draws more than the old code-built crowd (ceiling 237); on the desktop the full forecourt vegetation Jørgen asked for (2026-10-09) lays leaf cards round the forecourt's edge (ceiling 978k triangles).

### Stage 4: character skins by tier (#373, 2026-10-09)

Every character skin is 2048x2048, 21 MB as a mipmapped texture, and a place holds up to eleven of them. `tools/characters/skin_sizes.py` writes `base-1024.webp` and `base-512.webp` next to each 2048 skin (the originals stay; push the copies with tools/assets/sync.py). `js/perf/skin-tex.js` (`loadSkin`) picks the file: on the phone 1024 (5 MB), and 512 (1.3 MB) for the two background crowd models in js/crowd/approved-models.js, which are only ever seen small; desktop keeps 2048. A skin is loaded once per file and shared. `?fullphone` loads the 2048 skins on a phone too.

Phone texture MB, before (stage 1 table) and after: train 147 to 46, gate 142 to 44, forecourt 162 to 59, plaza 134 to 45, office 177 to 63, shop street 246 to 72, izakaya 113 to 29, karaoke booth 99 to 32, east lane 113 to 40, east coast 211 to 55, dorm commons 130 to 47, sports 136 to 51, pool 118 to 53, gym 118 to 34, office quarter 109 to 36, harbour 102 to 29. Every place is under the phone's 96 MB and the phone texture exceptions are gone. On the desktop (2048 kept) shop street is 248 MB, the east coast 214 and the office 222 against 192, so their exceptions stay.
