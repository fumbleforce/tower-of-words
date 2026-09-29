# Production pass on day 1 (started 2026-09-28)

Jørgen asked to take the day-1 build in game3d/ from "student project" to production grade. Several agents work in parallel. Scope is day 1 only, except the two design agents (language library, relationships and the wider island), which write design docs.

## Who owns what

Only edit files you own. If you need a change in someone else's files, write it in `notes/production-requests.md` (one line: date, from, to, what, why) and message the main agent.

| Agent | Owns | Must not touch |
|---|---|---|
| builder (integrator) | js/main.js, js/engine.js, js/runner.js, js/story.js, js/testmode.js, tools/push.sh, tools/fast.mjs, tools/stamp.py (build.json is generated, never committed). The only agent that pushes. | story text |
| world | js/places/*, js/scenes/*, js/train/car.js, js/train/world.js, js/train/hull.js, js/train/kit.js, js/props.js, new js/post.js (post-processing) | ui, story |
| characters | assets/characters/ (new), js/cast.js, js/train/people.js, js/avatar.js, js/mio.js, tools/characters/ (new) | places, ui |
| feel | js/cam.js, js/trips.js, js/train/audio.js, new js/sfx.js and js/ambience.js, audio/ (except voices), animation blending in avatar code only by request to characters | ui.js, story |
| story | story/*.js, story/STORY.md, story/VOICE.md, voice direction notes (story/VOICE-DIRECTION.md) | js/ |
| shell | js/ui.js, css/, index.html, js/end.js, new js/menu.js and js/settings.js | places, story |
| language | js/lang.js, new tools/lang-audit.mjs, notes/LANGUAGE-LIBRARY.md; story changes go through the story agent | other js |
| relationships | notes/RELATIONSHIPS.md, notes/ISLAND.md (design only) | game3d/ |

## Rules for everyone

- Read /home/jorgen/repo/japanese/GUIDE.md first, all of it. Its rules win.
- Commit only your own files with `git commit --only <paths>`; never `git add -A`. Don't push; the builder pushes through tools/push.sh after the fast test.
- Test with the fast mode (`node game3d/tools/fast.mjs 1366 860 300`, and `390 844`), max 5 minutes, in the foreground. No wait or poll tasks.
- Validate every change in isolation before calling it done: close-ups or frame sequences of the thing, desktop and phone, looked at yourself. Send the sheet path to the main agent.
- GPU work only under the GPU lock (GUIDE, Engineering).
- Nothing opened on Jørgen's screen. Plain writing everywhere (no AI-sounding copy). No brown, gold or serif defaults. Never paper or cut-out styles.
- Day 1 only for game content. No later-day content.

## Production bar (critics score against this, pass mark 8/10)

1. Looks finished: every place full, purposeful and lit with care; nothing empty, floating, clipping or placeholder.
2. Feels good: movement, camera, UI and sound respond smoothly; every action gets feedback.
3. Reads clearly: a cold player always knows where they are, who is talking, what to do next and what just happened.
4. Characters: consistent style across the cast; natural poses; faces match the moment.
5. Language: no Japanese the player hasn't been taught appears as readable text; every new word is taught in an interesting way and used again.
6. Story: dialogue sounds spoken, every scene has a want and a turn, and the day ends with a pull to day 2.
7. Runs well on a mid-range Android phone (steady frame rate, fast load).
