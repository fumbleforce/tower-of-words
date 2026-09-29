# Game facts docs

2026-09-29. Adopted with a change (reviews/game-facts-docs). Jørgen: "'takes part in' is not scalable, these are people with schedules, most of them at least, they dont by definition stay in one scene, they have lives in a way. dont overoptimize on a linear playthrough (wont be linear after day 1), just describe facts. Though it is good to have individual sub-plots etc codified well."

## The problem

Facts about the game sat in GUIDE, STORY.md, FORMAT.md, VOICE.md, VOICE-DIRECTION.md, bible/facts.yaml, the notes and the code, and they disagreed. FORMAT.md put the office on the third floor. VOICE-DIRECTION.md gave Eric a Norwegian accent you had dropped. The walkthrough has Emi come back on Monday while the game brings her down at 17:40. An agent that wanted to know what the game is ended up reading the source code.

## Where the facts live

One folder, [docs/game/](game/README.md), one file per area, describing the game as it is plus what you've decided and isn't built yet. The index and the rules are in docs/game/README.md.

- setting.md: the island, the company, Eric's job, kotodama, what kind of game this is, what the story never does.
- cast.md: people as people. Who they are, job, home, routine, who they know, likes, how they speak, their approved look. Not which scene they're in.
- places.md: places as places. What's there, who is there at each time of day, the small things you can poke, how you get between places.
- stories/: one file per storyline (a sub-plot, a person's thread, or one situation), each with its premise, cast, beats, choices and flags, words taught, and status. Day 1's scenes are storylines too, so there is no single walkthrough. Codex can add storylines in the same format (docs/game/README.md, "Writing a storyline file").
- words.md, systems.md, controls-and-ui.md, art-and-sound.md.

Each fact has one home; everything else links to it. GUIDE keeps how we work and your feedback on it, and points to docs/game at the top.

## What moved

- GUIDE: the Setting section, the game facts in Current focus, and The game section went to setting.md, cast.md, places.md, systems.md, controls-and-ui.md and art-and-sound.md, with your words.
- STORY.md: the premise, the day and the people went to setting.md, stories/ and cast.md. STORY.md is now a pointer, because the story files' comments and the bible still name it.
- FORMAT.md: the place inventories, the portrait list, the speaker list, the bond tables and the music per place moved out. It keeps only how to write a story file.
- VOICE.md: ages and jobs moved to cast.md. VOICE-DIRECTION.md: Eric's base line lost the dropped accent.

Not moved yet: bible/facts.yaml's cast and place facts, the built parts of ONBOARDING.md, VOICE-INPUT.md, LANGUAGE-LIBRARY.md and RELATIONSHIPS.md (the docs now describe what's built, but the notes still repeat it), and the ideas and history files (notes/ideas/ and legacy/notes/, as proposed).

## Keeping the docs and the game in step

The docs lead and the code follows. A decision goes into its doc first, marked "(to build)"; something decided gone, "(to remove)". The commit that builds or removes it deletes the mark.

Every commit that changes what the game is updates its docs/game file in the same commit and ends its message with `Facts: docs/game/<file>` or `Facts: none` (GUIDE, Process). Each agent's brief names the facts files for its area. Reviewers check that a game change came with its doc change.

`node tools/facts/check.mjs` compares the docs with the game wherever the game can confirm a fact: people, names on screen, likes, portraits, schedules, the things, spots, seats and zones in each place, words, the drinks, and for each storyline its nodes, speakers, taught words and flags. Every story node has to belong to a storyline or a place's small moments. Rows marked "(to build)" or "(to remove)" are listed as pending and don't fail it. Prose (ages, motives, routines) is checked by people.

It passes on the game as of 2026-09-29, with five pending items: the unused `yui`, `sota`, `nao` and `hiro` (to remove), and Mio's phone portrait (to build).

## Where the check will be wired

Not yet, because of the edit freeze on game code and tools during the architecture review. After it:

1. game3d/tools/fast.mjs runs it before the play-through and prints its result with PASS/FAIL.
2. push.sh refuses a push when it fails.
3. ./start prints its result.
4. The bible reads docs/game/ as its main pages. Until then its Places page, its story and people blurbs and its portrait statuses, which it took from STORY.md and FORMAT.md, come up empty, and so do the portrait statuses in tools/assets/scan.py. Both need switching to docs/game/cast.md and art-and-sound.md.
