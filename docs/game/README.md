# Where every fact lives

The game's facts are in this folder, one home per fact: setting, cast, places, storylines, words, systems, controls and UI, art and sound. How we work is in GUIDE.md, who leads and who owns the code right now in collab/PROTOCOL.md, open decisions in reviews/ (`python3 tools/review.py list`), and queued work in TODO.md. The map below says which file holds each kind of fact; look there first, or search those files with `rg -n -i`.

The inboxes (collab/to-codex.md, collab/to-claude.md) and dated notes record messages and work. When one of them settles a fact, move the fact to its home below and link to it from there.

## Map

### The game (this folder)

| Kind of fact | Home |
|---|---|
| The island, the company, Eric's job, kotodama, the commute (there is none), what kind of game this is, what the story never does | [setting.md](setting.md) |
| A person: age, job, home, routine, who they know, how they talk, approved look (hair, eyes, outfit), names on screen | [cast.md](cast.md) |
| A place: things, spots, seats, zones, who is there when, small moments; getting from one place to the next | [places.md](places.md) |
| The island's south half planned for day 2: every place, who is there, doors, connections, Japanese hooks; the planned streets | [island.md](island.md) |
| A storyline: premise, cast, beats, choices and flags, words taught, nodes, what is built | [stories/](stories/), one file each, listed under [Storylines](#storylines) |
| Every Japanese word (reading, meaning, kind), the words day 1 teaches, when a word counts as known | [words.md](words.md) |
| The clock, schedules, bonds, memory, gifts and prices, typing and word practice, overheard Japanese, kotodama effects, saving | [systems.md](systems.md) |
| How the game opens up after day 1: which system comes when, tickets as the story's lever, story and relationship events, free days | [progression.md](progression.md) |
| Controls, when each control is taught, the HUD, the dialogue box, menus and panels, camera, phone and desktop layouts, the build id | [controls-and-ui.md](controls-and-ui.md) |
| The world's look, approved portraits and models, approved voices, music and sound | [art-and-sound.md](art-and-sound.md) |

### How we work

| Kind of fact | Home |
|---|---|
| Jørgen's rules: scope (day 1 only), reviews and approvals, relaying his feedback, left and right on a character, privacy, the Replicate and Meshy budgets | [GUIDE.md](../../GUIDE.md), Working with Jørgen |
| Writing, dialogue, story craft, learning rules | GUIDE.md, Writing |
| UI rules (timers, first screen, layouts), the world style, review page layout | GUIDE.md, Visual design |
| Image prompt rules, reference images, 3D characters, reward scenes | GUIDE.md, Art |
| Voices: local models, Mio's pitch guard | GUIDE.md, Voices and audio |
| Process: one task per agent, QA gates, the commit message `Facts:` line, the definition of done | GUIDE.md, Process |
| Review server port, GPU lock, browser lock, the fast test, where screenshots go, the world bible, the asset library, repo layout | GUIDE.md, Engineering |
| Where code goes, module responsibilities, what `npm run check` enforces (lint, formatting, file sizes, dependencies) | ARCHITECTURE.md |
| Who leads what (story writing, engine, UI, 3D, language), who owns the code right now (the code freeze), how to message Codex, claiming files | [collab/PROTOCOL.md](../../collab/PROTOCOL.md) |
| Production pass: which agent owns which files, the production bar | [notes/PRODUCTION.md](../../notes/PRODUCTION.md) |
| The visual critic's scoring bar | [notes/VISUAL_QA.md](../../notes/VISUAL_QA.md) |
| Jørgen's own words, every message, verbatim | [notes/feedback-log/](../../notes/feedback-log/) |
| Where work stands today: what's done, what's broken, what waits on Jørgen | [notes/HANDOFF.md](../../notes/HANDOFF.md) |
| What is being worked on, waiting or stuck: tasks, requests, decision follow-ups, bugs | [GitHub issues labelled work](https://github.com/fumbleforce/tower-of-words/issues?q=label%3Awork) (`python3 tools/work.py`, the bible's Work section) |
| Parked ideas | [TODO.md](../../TODO.md) |

### Decisions and approvals

| Kind of fact | Home |
|---|---|
| Which review items are open, and what Jørgen picked or said on any of them | `python3 tools/review.py list` (open first), then `python3 tools/review.py show <id>` |
| How to post a review item | [reviews/README.md](../../reviews/README.md) (or the post-review-item skill) |
| Approved art files, per bible id | [art/approved/README.md](../../art/approved/README.md) |
| History, rejected options and open questions | bible/facts.yaml, shown in the world bible at http://127.0.0.1:8771/bible/ |

### Art, sound and story files

| Kind of fact | Home |
|---|---|
| Image and video prompts: models, settings, cast prompt lines, reward prompts, composition control, the Meshy 3D workflow | [art/PROMPTS.md](../../art/PROMPTS.md) |
| Portrait style blocks | [art/STYLE.md](../../art/STYLE.md) |
| Voice, TTS and music methods and tests | [art/SOUND.md](../../art/SOUND.md) |
| How a story file is written: nodes, hooks, sim data, `{word}` marks | [game3d/story/FORMAT.md](../../game3d/story/FORMAT.md) |
| How each character talks on the page, and their voice settings | [game3d/story/VOICE.md](../../game3d/story/VOICE.md), [VOICE-DIRECTION.md](../../game3d/story/VOICE-DIRECTION.md) |
| What is private and where it goes | [island/PRIVATE.md](../../island/PRIVATE.md) |

## Storylines

The game is not one walkthrough. After day 1 it won't be linear at all, so the story is kept as separate storylines: a sub-plot, a person's thread, or one situation in one place. Each storyline has its own file in `stories/`. Day 1's scenes are storylines too; the day plays in about 15 to 20 minutes.

| Id | Storyline | Status |
|---|---|---|
| [`mio-train`](stories/mio-train.md) | Mio on the monorail: a seat, her bag, 外人, and the greetings lesson. | built |
| [`train-discoveries`](stories/train-discoveries.md) | Optional encounters with the train passengers. | built |
| [`sleeping-man`](stories/sleeping-man.md) | Mr. Hamada: asleep on the train, stuck in the gate, grateful by the afternoon. | built |
| [`gate-morning`](stories/gate-morning.md) | The guard, a proper good morning, and a card that won't work until nine. | built |
| [`emi-budget`](stories/emi-budget.md) | Emi upstairs all day fighting for B2's parts budget, and what she promised. | built |
| [`b2-welcome`](stories/b2-welcome.md) | Arriving on B2: Mori's welcome, Kenji and the borrowed chair, the machine room. | built |
| [`copier`](stories/copier.md) | Repair request #1: the B2 copier, open since 1996, and Mori's 動いて. | built |
| [`lunch`](stories/lunch.md) | The day's one real choice: lunch with Mio or with Mori, and a word from each. | built |
| [`vending-gift`](stories/vending-gift.md) | The stuck vending machine and one drink for someone. | built |
| [`mio-notices`](stories/mio-notices.md) | Mio sees the doors, then more, and asks how. Repair request #2 lands on Eric. | built (day 1 part) |
| [`evening-walk`](stories/evening-walk.md) | Optional encounters on the walk home. | built |
| [`tama`](stories/tama.md) | Tama the calico cat, who goes where she likes and isn't there, says the guard. | built |

The authored [day-2 storylines](stories/day2/README.md) have their own index and node tables. They await the loader, scene hooks and voices listed in the handoff.

### Writing a storyline file

Name it `stories/<id>.md` with a short lower-case id. Use these sections, in this order, so people and the check can read it:

- `# <Title>` and a first paragraph: the premise in a few sentences, and the status (`built`, `to build`, or both with what is which).
- `## Cast`: one line, the ids from [cast.md](cast.md) of everyone who speaks or acts in it, comma-separated, in backticks.
- `## Beats`: what happens, in order where there is an order, with what triggers each beat (a place, a period, a flag, another storyline).
- `## Choices and flags`: each choice the player makes and where it leads; a table of the flags it sets and who reads them.
- `## Words taught`: a table, `Word | By | Node`, one row per word taught in it (words.md has the words themselves). Write "None." if there are none.
- `## Nodes`: a table, `File | Nodes`, listing the story nodes that belong to it (`ambient:<id>` for an ambient moment, `<slot>.<part>` for a transition slot such as `gate_to_office.ride`). A node can belong to more than one storyline.
- `## To build` (optional): what is decided but not in the game.

Ideas for later days don't go here. They stay in notes/ until Jørgen decides on them.

## Rules for these files

- One home per fact. Mio's age is in cast.md; the lunch choice is in stories/lunch.md. Everywhere else links to it or says nothing.
- Describe facts. A person is described as a person (job, home, routine), not by which scene they're in; a place as a place.
- Lists go in tables whose first column is the id the game uses, so people and `tools/facts/check.mjs` read the same table.
- A decision that isn't in the game yet is marked "(to build)"; something decided gone but still in the code, "(to remove)". The commit that builds or removes it deletes the mark.
- When a fact came from Jørgen, it carries his words or the date: "(Jørgen, 2026-09-28)".
- Every commit that changes what the game is updates its file here in the same commit, with the `Facts:` line in its message (GUIDE, Process, "Facts in the same commit").

## The check

`node tools/facts/check.mjs` compares these files with the game wherever the game can confirm a fact: people, names on screen, likes, portraits, schedules, things, spots and zones in each place, words, and each storyline's nodes, speakers and taught words. It prints every difference and exits 1. Rows marked "(to build)" or "(to remove)" are listed as pending and don't fail it. `--game` prints what the game has, to help write a doc.

When it fails, decide which side is right. If the game is wrong, fix the game; if the doc is stale, fix the doc and find out why the commit that changed the game didn't.
