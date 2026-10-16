# Production

Every agent works to the production bar below. Process rules are in GUIDE.md.

## Who owns what

Only edit files you own. If you need a change in someone else's files, open a request issue (`python3 tools/work.py add ... --kind request`) and tell the main agent.

| Agent | Owns | Must not touch |
|---|---|---|
| builder (integrator) | js/main.js, js/engine.js, js/runner.js, js/story.js, js/testmode.js, tools/fast.mjs, tools/stamp.py (build.json is generated, never committed) | story text |
| world | js/places/*, js/scenes/*, js/train/car.js, js/train/world.js, js/train/hull.js, js/train/kit.js, js/props.js, js/post.js | ui, story |
| characters | assets/characters/, js/cast.js, js/train/people.js, js/avatar.js, js/held-pose.js, tools/characters/ | places, ui |
| feel | js/cam.js, js/trips.js, js/train/audio.js, js/sfx.js, js/ambience.js, audio/ (except voices); animation blending in avatar code only by request to characters | ui.js, story |
| story | story/*.js, story/STORY.md, story/VOICE.md, story/VOICE-DIRECTION.md | js/ |
| shell | js/ui.js, css/, index.html, js/end.js, js/menu.js, js/settings.js | places, story |
| language | js/lang.js, tools/lang-audit.mjs, notes/LANGUAGE-LIBRARY.md; story changes go through the story agent | other js |
| relationships | notes/RELATIONSHIPS.md, notes/ISLAND.md (design only) | game3d/ |

Paths are under game3d/ unless they start with notes/.

## Production bar (critics score against this, pass mark 8/10)

1. Looks finished: every place full, purposeful and lit with care; nothing empty, floating, clipping or placeholder.
2. Feels good: movement, camera, UI and sound respond smoothly; every action gets feedback.
3. Reads clearly: a cold player always knows where they are, who is talking, what to do next and what just happened.
4. Characters: consistent style across the cast; natural poses; faces match the moment.
5. Language: no Japanese the player hasn't been taught appears as readable text; every new word is taught in an interesting way and used again.
6. Story: dialogue sounds spoken, every scene has a want and a turn, and the day ends with a pull to the next.
7. Runs well on a mid-range Android phone (steady frame rate, fast load).
