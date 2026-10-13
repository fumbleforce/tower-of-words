# Train discoveries: cold read of the integration

Claude, 2026-09-30. Read as a first-time player at the start of the game, against GUIDE (Writing), VOICE.md, cast.md, places.md (Monorail), reviews/train-discoveries-1 (feedback, draft-notes, cold-read) and the worktree `codex-train-discoveries` (`git diff main -- game3d/story/train.js`, docs/game/stories/train-discoveries.md). No story or game files changed.

## Across all five

- Jørgen's seat note is answered: every directed hint points at `seat_far_r` and the goal says "Sit by the lunchbox." The point comes after `cam back`, so it reads as the passenger sending you on, not as part of their moment.
- Start of game still flows: controls, then one click on any passenger gives a small moment and the lunchbox goal; Mio's Wi-Fi mutter, the teetering lunchbox and her B2 reveal are untouched. Greeting nodes unchanged. Reader and Hamada still give no seat hint, as before.
- Branching checked: `first_*` only runs while `!seat_goal && !sat`, and it sets the seen flag before `nod_seat`, so a second click always gets the quiet repeat. No path shows an encounter twice or skips the goal.
- Setting and day: no commute, no "yesterday", no invented department, nothing past day 1. The English subtitles don't teach anything.
- Text load: bun 1 line, youth 2, Hamada 2, reader 4, music 4. Jørgen asked for no more text early on, so the two four-line ones should lose a line each (below).

## bun: keep

One line plus a readable bag-and-zip action. Short and kind, and the thank-you reads naturally with her pointing at the seat right after. The heart on repeat fits her.

## youth: fix (small)

The photo, "We lost, but I scored my first goal.", Eric pointing, "That's you?" and his nod read well. It's the best of the five for how little text it needs.
- `youth` repeat: `{ do: "emote", who: "youth", kind: "heart" }`. A young man sending a stranger a heart bubble reads flirty or cutesy. Use `{ do: "gesture", who: "youth", kind: "nod", to: "eric" }` (or `♪`).

## music: fix

Charming, and "音、漏れてた？" / "Could you hear that?" is the most natural line in the set. But it's four lines on what may be the player's first click.
- Replace `{ say: "eric", emo: "gentle", text: "Only a little." }` with `{ do: "gesture", who: "eric", kind: "nod", to: "music" }`. The nod answers her, it's one less text box, and her second line follows just as well.
- The `♪` repeat is fine here: after the encounter it reads as "she's back in her music", not as no answer.

## reader: fix

The title narration is a detail too small to see, so it earns its line, and "Windows 95?" works off the visible label. But the last line repeats the one before it: "会社のは古くて…" / "The version at work is old", then "うん。会社の。" / "Yes, that's the one at work."
- Replace `{ say: "reader", emo: "dry", text: "うん。会社の。", ... }` with `{ do: "gesture", who: "reader", kind: "nod", to: "eric" }`. A weary nod is funnier, and it takes this down to three text beats.
- Windows 95 before Mio's "some of them are older than me": acceptable as setup. Mio's line still lands as the explanation.

## hamada: fix

The buzz, the blind tap and "すみません……あと五分。" / "Sorry... five more minutes." are funny, in character (he apologises constantly and talks to machines), and set up the platform. But the narration "A sticky note on his briefcase says "12F 9:00!!"" comes right before the held view shows his phone with 12F 9:00 !! in large type. That's narrating what the player is about to see, and it's extra early text.
- Cut the line `"> A sticky note on his briefcase says \"12F 9:00!!\""` from the `else` branch. The reminder on the phone carries it.
- zzz on repeat: keep.

## Doc

- docs/game/stories/train-discoveries.md beat 3, "she lifts a cup": a coffee cup is a thing in this car (`cup`). Write "lifts one side of her headphones".
