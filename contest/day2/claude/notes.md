# Notes

## The three sub-plots

| | 1. There Is No Cat | 2. Nobody Goes First | 3. Seven Seats |
|---|---|---|---|
| When | Morning | Lunch | 17:30 to the evening |
| Where | The lobby, a lift | The canteen (new) | B2, then Jun's bar (new) |
| Who | The guard, Hamada, Tama, Kuro | Kenji, Kaori (new) | Mori, Mio, Jun (new), with Kenji and Emi |
| Tone | Deadpan farce | Comedy of manners with a sting | Warm, a little sad, funny at the edges |
| What the player does | Carries a bowl, leads a cat, holds the gate, calls a lift, ends it with a word or a walk | Buys a ticket, picks a table, then decides with his feet who goes up for seconds | Reads a circular, talks Mio round (or doesn't), picks a seat, pours, toasts, makes a speech, claps once |
| New words | 猫, 来て (command) | おかわり, ごちそうさまでした | お疲れさまです, 乾杯 |

Each one fits a period of the day, so they can sit beside whatever day 2's main plot does with the station doors in the morning and the afternoon tickets. None depends on the main plot. Each ends differently depending on what the player did, and the ending from 1 decides who fills the empty chairs in 3.

## Skills

Read first and applied (already installed): story-sense, story-analysis, dialogue, scene-sequencing, key-moments, character-arc, cliche-transcendence, positional-revelation, novel-revision, story-coach, shot-staging, humanizer.

Found and installed with `npx skills add` (global), from jwynia/agent-skills, after reading each SKILL.md:
- **interactive-fiction**: choice design. Every main choice is a dilemma between two goods, not right versus wrong, and all endings are worth seeing. It's why the canteen's "nobody goes" ending gets the warmest scene instead of feeling like a fail state, and why the choices are made by walking and saying words rather than from menus.
- **joke-engineering**: tested the running jokes for how far apart the two ideas are and for over-explaining. It's why the guard never varies 猫はいません, why Mio's translation joke in the speech is never explained to Eric, and why the one clap is funny only if the player chooses to clap early.
- **endings**: each sub-plot ends on an image or an action instead of a summary: the bowl outside the door, 11 kg crossed out and "Two", Mori counting to seven, or pouring the glasses for empty chairs himself.

Considered and skipped: rhavekost/author-toolkit (fiction-workshop, avoid-ai-writing), which overlaps with humanizer and story-analysis; jwynia's game-facilitator (tabletop GMing); mattpocock's writing-* skills (non-fiction). The search tool had nothing for quest design or game narrative.

How the rest were used:
- **cliche-transcendence**: listed the defaults before writing each one. A strict guard secretly loving a cat is itself a stock type, so his softness only ever shows through procedure: he signs the cat into the visitor book every morning, and he gets a red sticker. The canteen cook defaults to a motherly feeder or a gruff heart of gold; Kaori is instead fighting a number in a notebook. The drinking party defaults to drunk antics, karaoke or a confession; this one is about who pours for whom and a man who books for people who left.
- **positional-revelation**: Eric's position is the engine of all three. He's the one person who can't read the rules, which makes him the guard's ideal accomplice, the only one who doesn't know you wait for seconds, and the only guest who can break the pouring order without it being rude.
- **character-arc** and **key-moments**: each has one person who moves an inch. The guard goes from denial to saying her name, Kenji goes from staring at the pot to being known by name, and Mori either counts to seven or fills the empty glasses.
- **scene-sequencing**: each scene ends "yes, but" (the cat is hidden, but the lift goes back up to Hamada; Eric gets seconds, but the Sales chief says 外人).
- **dialogue**, **humanizer** and VOICE.md: read aloud per speaker, with the lines cut or loosened that came out as fragment rows or closers.
- **story-analysis** and **novel-revision**: three fresh critic agents each played one sub-plot cold as a first-time player (scores 6.5, 7, 7), then a fourth read all three for continuity. The main fixes from that pass:
  - 1: the thread could be missed, so it now starts on entering the lobby. The player now watches the guard write TAMA in the visitor book. The lift's return is caused by Hamada testing the lift on his route, and 来て now matters by bringing Hamada to the book.
  - 2: Kenji explained too much and the hall froze too theatrically, so both are toned down. Typing おかわり now happens at the counter, as the act itself. Eric going first gets its own quiet beat with Kaori.
  - 3: "seven" was explained five times and is now explained once, by Mio or Kenji. Mio's monologue was rewritten out of fragment rows. The clock and the branches were made consistent, and Mori's Japanese was made properly formal.

## Things to flag

- **New canon.** It's written in, but nothing here is approved.
  - The guard writes TAMA in the visitor book each morning.
  - Mio started upstairs in Planning and stopped going to parties because of the pouring.
  - Mori books seven because B2 had seven people when he came.
  - Kaori keeps a waste notebook.
  - Jun runs the bar. He's in the bible, but day 1 hasn't used him.
  - Friday is curry day in the canteen.
  - Accounts has the safety patrol rota this month.
- **Words that may not be known.** 開けて is only known if the player took the word route at the gate on day 1, and 止まって and 入れて depend on the day-1 lunch. The scripts use only 待って and 動いて as certain and treat the others as extras.
- **Engine asks.**
  - New word ids: neko, okawari, gochiso and kanpai. otsukare and kite exist already.
  - Say menu: 猫 is a noun said to a person, and the speech in 3 needs short built phrases (エリックです…).
  - Two new places (canteen, bar) and two new bodies (Kaori, Jun).
  - Hamada walking a patrol route that advances on the player's actions.
  - Tama following a carried bowl.
  - A lift ride out and back inside the lobby scene.
- **Main-plot collisions.** Lunch and the evening are the natural slots for these. If day 2's main plot needs lunch with Mio or an evening scene, 2 or 3 would move, or Mio's lunch offer becomes the alternative (2 already handles that).
- **Length.** 3 runs a little over 3,000 words, mostly because the italic translations for the reader count too. The spoken script is about 3,000.

## What I'd do next

Run the Japanese past a native reader, especially Kaori's casual lines and Mori's keigo. Get Jørgen's call on the guard signing in the cat and on Mio's upstairs history before anything builds on them. Then storyboard the lobby patrol screen by screen, because it's the one with the most staging and the most to go wrong in play.
