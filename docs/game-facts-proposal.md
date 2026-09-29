# Game facts docs: proposal

2026-09-29. For review in the bible (reviews/game-facts-docs). Nothing has been moved or deleted yet.

## The problem

Facts about the game sit in GUIDE, STORY.md, FORMAT.md, VOICE.md, VOICE-DIRECTION.md, bible/facts.yaml, the notes and the code, and they disagree. FORMAT.md still puts the office on the third floor. VOICE-DIRECTION.md gives Eric a Norwegian accent that you dropped. The walkthrough has Emi come back on Monday while the game brings her down at 17:40. So an agent that wants to know what the game is today ends up reading the source code, and so do I.

## Where the facts live

One folder, `docs/game/`, with one file per area. Each file describes the game as it is, plus anything you've decided that hasn't been built yet.

| File | What it holds |
|---|---|
| `README.md` | The list of files and the rules on this page. |
| `setting.md` | The island and the company, the premise, what kotodama is and how it works, and what the story never does. |
| `places.md` | Every place: its rooms, the things you can use, who is there at each time of day, and how you get from one place to the next. |
| `cast.md` | Every person: who they are, where they appear, the names the player sees, likes, portraits. The sample, written in full. |
| `day1.md` | The day in order: each beat, each choice and where it leads, how the day ends. `day2.md` comes once day 2 is decided. |
| `words.md` | Every Japanese word in the game: reading, meaning, who teaches it, where, and where it gets used again. |
| `systems.md` | Clock and periods, schedules, bonds, gifts, saying a word three times before it becomes a click, saving. |
| `controls-and-ui.md` | Controls, the goal box, the action prompt, the dialogue box, menus, the phone and desktop layouts, and when each control is taught. |
| `art-and-sound.md` | The look of the world, which portraits, models and voices are approved (with a link to the decision), and the music. Pointers only; prompts stay in art/PROMPTS.md. |

Each file opens with a short paragraph saying what it holds and where the neighbouring facts live. Lists of things go in tables whose first column is the id the game uses, so a person and a script can read the same table. Prose below the tables covers what a table can't, such as a person's age or why the gate jams. A fact you've decided but that isn't in the game yet is marked "(to build)". When a fact came from you, it carries the date: "(Jørgen, 2026-09-28)".

Ideas for later days don't go in these files. They stay in notes/ until you decide on them.

## One home per fact

Every fact lives in exactly one file, and other files link to it. Mio's age is in cast.md. VOICE.md says how she talks and doesn't repeat her age.

## GUIDE and the facts docs

GUIDE is how we work: process, quality bar, taste rules, and your feedback in your words. The facts docs are what the game is. When your feedback decides something about the game, the result goes into the facts docs with your date. It stays in GUIDE only if it's also a rule for how we work. "No exposition in panels" is a GUIDE rule. "The B2 team is Eric, Mio, Mori and Kenji" is a fact for cast.md. GUIDE's Setting section moves to setting.md, and GUIDE links to it.

## What happens to the existing docs

These move into docs/game, and the old copies are then deleted:

- GUIDE: the Setting section, and the game facts inside Current focus (premise, B2 team, Emi at head office, company name, Mio's colours).
- STORY.md: the premise goes to setting.md, the day to day1.md, the people to cast.md. STORY.md is then deleted.
- FORMAT.md: the place inventories and the portrait list move out. FORMAT keeps only how to write a story file.
- VOICE.md: ages and jobs move to cast.md. It stays the writers' voice sheet.
- bible/facts.yaml: the cast, place and story facts move out. It keeps the image history, rejections and old review pages.
- ONBOARDING.md, VOICE-INPUT.md, LANGUAGE-LIBRARY.md, RELATIONSHIPS.md: whatever is built goes into controls-and-ui.md, systems.md or words.md.

These stay where they are, because they're about how we work: GUIDE, PRODUCTION.md, FORMAT.md (trimmed), VOICE.md, VOICE-DIRECTION.md, REQUESTS.md, VISUAL_QA.md, PERF.md, art/PROMPTS.md.

These are ideas and go to `notes/ideas/`, labelled as not decided: the walkthroughs, ISLAND.md, the design parts of RELATIONSHIPS.md, mini-stories.md.

These are history and go to `legacy/notes/` unchanged: EDIT.md, REVIEW.md, HANDOFF.md, MORNING-REPORT.md, OVERNIGHT.md, QA-ROUND-1.md, critique.md, the day1-* files, train-opening-script.md, the opening-* and pacing-* files, gameplay.md, directions.md, island-slice-plan.md, map-design.md, story-diagnosis.md, day2-replace.md, research-loops.md, LANGUAGE-AUDIT.md, and Codex's source-of-truth-audit.md.

The bible shows the docs/game pages as its main pages and stops pulling facts out of STORY.md, FORMAT.md and the code.

## Keeping the docs and the game in step

The docs lead and the code follows. A decision goes into the facts doc first, marked "(to build)". The commit that builds it removes the mark.

Any commit that changes what the game is updates the facts doc in the same commit: a person, place, object, word, beat, choice, control or UI piece added, removed, renamed or changed. Bug fixes, refactors and speed work that don't change anything the docs describe need no doc change. Every commit message ends with a line naming the facts file it touched, or "Facts: none".

Each agent's brief names the facts files for its area, and the agent reads those to learn the state of the game instead of the code. Reviewers and critics check that a change to the game came with its doc change, and that the two agree.

A script, `node tools/facts/check.mjs`, compares the docs with the game wherever the game can confirm a fact: every person, place, object, word and story beat the docs name must exist in the game, and everything the game has must be in the docs. It prints each difference in plain words and fails. It can't check prose such as ages or motives; people check those. It would run in the fast test and in the push script, so a push with drift is refused, and `./start` would print the result. When it fails, decide which side is right. If the game is wrong, fix the game. If the doc is stale, fix the doc and find out why the commit didn't include it.

## The sample: the cast

[docs/game/cast.md](docs/game/cast.md) is written in full from the game as built today, and `tools/facts/check.mjs` checks it. The check compares who takes part in each place, the names on screen, likes and dislikes, the Japanese each person expects, and the portrait faces, in both directions.

On its first run it fails with 7 differences:

- Six speaker ids that nothing uses are still defined in game3d/js/runner.js: yui, sota, nao, hiro, kanae, reitext.
- Mio's `phone` face is in the game's list, but the file doesn't exist, so the game shows her neutral face.

I found two questions for you while writing it; they're at the end of cast.md. Nobody says the guard's or Mr. Hamada's name out loud, yet the labels over them show it. And the cat is called Tama at the gate and "Cat" everywhere else.

A few things I noticed that the check can't see yet go to the builder: game3d/js/story.js has an unused name table with the old "Mr. Kuroda"; the runner's default role for Mori is "section chief"; and VOICE-DIRECTION.md still gives Eric a Norwegian accent.

## Order of work if you adopt it

1. Write the other files one area at a time (places, day 1, words, setting, systems, UI, art and sound). Each gets its part of the check, and the copies it replaces are removed in the same commit.
2. The builder adds the check to the fast test and the push script.
3. The bible switches to docs/game.
4. The ideas and history files move.
