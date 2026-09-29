# The game, as it is

These files say what the game is today, plus what Jørgen has decided that isn't built yet. Read the files for your area instead of reading the code. How we work, the quality bar and his feedback on process stay in [GUIDE.md](../../GUIDE.md).

| File | What it holds |
|---|---|
| [setting.md](setting.md) | The island and the company, Eric's job, kotodama, what kind of game this is, and what the story never does. |
| [cast.md](cast.md) | Every person: who they are, job, home, routine, who they know, what they like, how they speak, their approved look. |
| [places.md](places.md) | Every place: what's there, who is there at each time of day, the small things you can poke, and how you get from one place to the next. |
| [stories/](stories/) | One file per storyline: premise, cast, beats, choices and flags, words taught, and what is built. |
| [words.md](words.md) | Every Japanese word the game knows: reading, meaning, kind, and how a word becomes known. |
| [systems.md](systems.md) | The clock, schedules, bonds, memory, gifts, word practice, overheard Japanese, kotodama effects, saving. |
| [controls-and-ui.md](controls-and-ui.md) | Controls, the HUD, the action prompt, the dialogue box, menus, phone and desktop, and when each control is taught. |
| [art-and-sound.md](art-and-sound.md) | The look of the world and the people, which portraits, models and voices are approved, music and sound. Pointers to the decisions. |

## Storylines

The game is not one walkthrough. After day 1 it won't be linear at all, so the story is kept as separate storylines: a sub-plot, a person's thread, or one situation in one place. Each storyline has its own file in `stories/`. Day 1's scenes are storylines too; the day plays in about 15 to 20 minutes.

| Id | Storyline | Status |
|---|---|---|
| [`mio-train`](stories/mio-train.md) | Mio on the monorail: a seat, her bag, 外人, and the greetings lesson. | built |
| [`sleeping-man`](stories/sleeping-man.md) | Mr. Hamada: asleep on the train, stuck in the gate, grateful by the afternoon. | built |
| [`gate-morning`](stories/gate-morning.md) | The guard, a proper good morning, and a card that won't work until nine. | built |
| [`emi-budget`](stories/emi-budget.md) | Emi upstairs all day fighting for B2's parts budget, and what she promised. | built |
| [`b2-welcome`](stories/b2-welcome.md) | Arriving on B2: Mori's welcome, Kenji and the borrowed chair, the machine room. | built |
| [`copier`](stories/copier.md) | Repair request #1: the B2 copier, open since 1996, and Mori's 動いて. | built |
| [`lunch`](stories/lunch.md) | The day's one real choice: lunch with Mio or with Mori, and a word from each. | built |
| [`vending-gift`](stories/vending-gift.md) | The stuck vending machine and one drink for someone. | built |
| [`mio-notices`](stories/mio-notices.md) | Mio sees the doors, then more, and asks how. Repair request #2 lands on Eric. | built (day 1 part) |
| [`tama`](stories/tama.md) | Tama the calico cat, who goes where she likes and isn't there, says the guard. | built |

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
- Every commit that changes what the game is updates its file here in the same commit, and says so in its message: `Facts: docs/game/<file>` or `Facts: none` (GUIDE, Process).

## The check

`node tools/facts/check.mjs` compares these files with the game wherever the game can confirm a fact: people, names on screen, likes, portraits, schedules, things, spots and zones in each place, words, and each storyline's nodes, speakers and taught words. It prints every difference and exits 1. Rows marked "(to build)" or "(to remove)" are listed as pending and don't fail it. `--game` prints what the game has, to help write a doc.

When it fails, decide which side is right. If the game is wrong, fix the game; if the doc is stale, fix the doc and find out why the commit that changed the game didn't.
