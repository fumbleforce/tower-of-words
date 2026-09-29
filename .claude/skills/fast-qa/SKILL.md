---
name: fast-qa
description: Runs the project's quick checks: the CPU checks (npm run check: syntax, unit tests, story, choices, language, facts, story map) and the whole-day fast test in a headless browser at phone and desktop size - and says how to read a FAIL. Use it after any change to game3d/, the story, or the facts docs, and before committing or announcing a build.
---

# Fast QA

Why and how long: GUIDE.md, Process (Fast tests; game3d QA is programmatic). Browser and GPU rules: GUIDE (Headless browser runs, GPU lock). The review server must be up at http://127.0.0.1:8771/ (./start).

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

- tools/lib/browser-job.mjs handles the browser: it waits while load is above 24 and acquires a shared GPU slot, waiting while the slots or exclusive GPU lock are occupied. Software rendering requires explicit `GL=soft`.
- Before the browser starts, fast.mjs checks that every spoken line has a clip and no text has escape leftovers. `VOICE_WARN=1` turns missing clips into a warning when voicing is still queued (say so in your report).
- Output: the verdict (PASS, PASS WITH OVERRIDES, or FAIL), size, time, route, movement (overlaps, spins), voices, the last steps and any page errors, then `artifacts:` with the folder of shots (game3d/shots/fast/<time>-<pid>/, git-ignored).

## Before landing a story change

```
npm run check:routes
```

This runs the named day-1 branch set at phone size, from short saved fixtures through the real Continue UI. Three workers share the existing GPU slots; each has its own browser lifecycle. It prints one row per route and fails if a route fails or any authored choice option is uncovered. It includes both gate solutions, all train and lunch replies, the two office-door paths, gifts, vending recovery, endings and a real mid-day save/reload. It complements the full-day tests above.

Use `node game3d/tools/fast-routes.mjs --list` to list routes or append route IDs to rerun a failing subset. A subset prints partial coverage and does not claim the whole set passed. `BASE=.claude/worktrees/<name>/game3d npm run check:routes` tests a worktree. `WIDTH=1366 HEIGHT=860` selects desktop. The result JSON includes chosen options, visited nodes and failure state; its path is printed after the table. Details and fixture limits: game3d/test/routes/README.md.

## Reading a FAIL

- `FAIL build checks`: a missing clip (NO CLIP; the voice-clips skill) or escape leftovers in story text (ESCAPE), found before the browser starts.
- Page errors: the stack names the file. Check it on the committed snapshot before blaming your change, since other agents' unsaved edits are in the working tree.
- The route stalls (the last steps repeat, or the day doesn't reach its end): a softlock or an unreachable goal, which is a bug even if a human could get past it (GUIDE: No text on timers).
- Overlaps or spins in movement: people walking through each other or turning in place; look at the shots.
- "Render deferred" (LOAD_DEFERRED): the machine was busy, not a test failure. Run it again later and say so.
- PASS WITH OVERRIDES: a check was switched off by an env variable; report which.

## Also

- `npm run check:browser` runs the browser routes (registration, transitions, checkpoints, continue) when your change touches saving, loading or place changes.
- A green fast test says nothing about looks. Look at close-ups of what you changed (GUIDE: Validate each fix in isolation); the critic agent scores visuals.
