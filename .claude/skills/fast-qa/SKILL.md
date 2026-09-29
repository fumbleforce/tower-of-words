---
name: fast-qa
description: Runs the project's quick checks: the CPU checks (npm run check: syntax, unit tests, story, choices, language, facts, story map) and the whole-day fast test in a headless browser at phone and desktop size - and says how to read a FAIL. Use it after any change to game3d/, the story, or the facts docs, and before committing or announcing a build.
---

# Fast QA

Why and how long: GUIDE.md, Process (Fast tests; game3d QA is programmatic). Browser and GPU rules: GUIDE, Process (Headless browser runs, GPU lock). The review server must be up at http://127.0.0.1:8771/ (./start).

## 1. CPU checks (under a minute, no browser)

```
npm run check
```

It prints PASS/FAIL per check: syntax, unit tests, choices, story, language, bonds, facts, story map. Any FAIL fails the run. For a failing `facts`, docs/game/README.md ("The check") says how to decide which side is wrong.

## 2. The day test (about a minute each)

```
node game3d/tools/fast.mjs 390 844
node game3d/tools/fast.mjs 1366 860
```

Run both at once as background Bash commands (the harness tells you when each exits). Don't write sleep or until loops to wait for them. The optional third argument is a time limit in seconds; keep it at or under 300.

- tools/lib/browser-job.mjs handles the browser: it waits while load is above 24, uses the GPU when the GPU lock is free and software GL otherwise (`GL=soft` forces software).
- Before the browser starts, fast.mjs checks that every spoken line has a clip and no text has escape leftovers. `VOICE_WARN=1` turns missing clips into a warning when voicing is still queued (say so in your report).
- Output: the verdict (PASS, PASS WITH OVERRIDES, or FAIL), size, time, route, movement (overlaps, spins), voices, the last steps and any page errors, then `artifacts:` with the folder of shots (game3d/shots/fast/<time>-<pid>/, git-ignored).

## Reading a FAIL

- `FAIL build checks`: a missing clip (NO CLIP; the voice-clips skill) or escape leftovers in story text (ESCAPE), found before the browser starts.
- Page errors: the stack names the file. Check it on the committed snapshot before blaming your change, since other agents' unsaved edits are in the working tree.
- The route stalls (the last steps repeat, or the day doesn't reach its end): a softlock or an unreachable goal, which is a bug even if a human could get past it (GUIDE, Visual design: No text on timers).
- Overlaps or spins in movement: people walking through each other or turning in place; look at the shots.
- "Render deferred" (LOAD_DEFERRED): the machine was busy, not a test failure. Run it again later and say so.
- PASS WITH OVERRIDES: a check was switched off by an env variable; report which.

## Also

- `npm run check:browser` runs the browser routes (registration, transitions, checkpoints, continue) when your change touches saving, loading or place changes.
- A green fast test says nothing about looks. Look at close-ups of what you changed (GUIDE, Process: Validate each fix in isolation); the critic agent scores visuals.
