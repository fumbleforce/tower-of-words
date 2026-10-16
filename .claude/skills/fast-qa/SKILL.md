---
name: fast-qa
description: Runs the project's quick checks: the CPU checks (npm run check: syntax, unit tests, story, choices, language, facts, story map) and the whole-day fast test in a headless browser at phone and desktop size - and says how to read a FAIL. Use it after any change to game3d/, the story, or the facts docs, and before committing or announcing a build.
---

# Fast QA

Browser and GPU rules: notes/tools/gpu.md. The review server must be up at http://127.0.0.1:8771/ (./start).

## 1. CPU checks (under a minute)

`npm run check` prints PASS/FAIL per check. For a failing `facts`, docs/game/README.md ("The check") says which side is wrong.

## 2. The day test (about a minute each)

```
node game3d/tools/fast.mjs 390 844
node game3d/tools/fast.mjs 1366 860
```

Run both at once as background commands and let the harness tell you when each exits; no sleep or until loops. An optional third argument is a time limit, at most 300 s.

- browser-job.mjs waits for load and a GPU slot (`GPU_WAIT`, default 900 s, on top of the run).
- Other days: `DAY=2` or `DAY=3` in front (day 2 from a plain day 1, `HISTORY=mori` or `cold` for others; day 3 along game3d/js/testmode-day3.js; `--mc carina` for Carina).
- Before the browser starts it checks every spoken line has a clip and no text has escape leftovers. `VOICE_WARN=1` turns missing clips into a warning while voicing is queued; say so in your report.
- Output: the verdict (PASS, PASS WITH OVERRIDES, FAIL), route, movement, voices, last steps, page errors, and `artifacts:` with the shots folder.

## Before landing a story change

`npm run check:routes` (and `:day2`, `:day3`) plays every named branch from saved fixtures through the real Continue UI and fails on an uncovered choice option. `node game3d/tools/fast-routes.mjs --list` lists routes; append route ids to rerun a subset. `BASE=.claude/worktrees/<name>/game3d` tests a worktree; `WIDTH=1366 HEIGHT=860` for desktop. Details: game3d/test/routes/README.md.

Evening discoveries are skipped by the day test; when they change, also run `node game3d/tools/evening-check.mjs 390 844` and `1366 860` (notes/PERF.md, "Evening delivery").

## Reading a FAIL

- `FAIL build checks`: NO CLIP (voice-clips skill) or ESCAPE in story text.
- Page errors: check the file on the committed snapshot before blaming your change.
- The route stalls: a softlock or unreachable goal, which is a bug even if a human could get past it.
- Day 3 `station job not done` or `never took him into gate`: the route never got into the station, so the door sign-off and the monitor repair did not run. The `route: skipped` lines in the log show the steps it missed. Check the walk into the station door from the forecourt first.
- Day 5 `required beat not done`: the run never got to the Kuro label fix (`d5_label_done`) or to the B2 evening reveal (`d5_reveal_done`, reached through the head office door). The `route:` lines in the artifacts' result.json show the step that never started.
- Overlaps or spins: people walking through each other or turning in place; look at the shots.
- "Render deferred" (exit 75): the machine was busy. It is not a pass: rerun with `GPU_WAIT=1800` (`python3 tools/gpu_priority.py queue` shows the holder) until PASS or FAIL. Never land on it, and don't fall back to `GL=soft`.
- PASS WITH OVERRIDES: a check was switched off by an env variable; report which.

## Also

- `npm run check:browser` when you touch saving, loading or place changes; `npm run check:browser opening` when you touch the title, dialogue box, captions or the train's first minute.
- A green test says nothing about looks: check close-ups of what you changed (GUIDE: Validate each fix in isolation).
