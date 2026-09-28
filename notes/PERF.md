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
