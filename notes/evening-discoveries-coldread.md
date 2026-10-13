# Evening discoveries: Claude story-reader cold read

Read of notes/evening-discoveries-draft.md (work #87, C-0192/C-0193) as a first-time player walking home after day 1, against GUIDE, game3d/story/VOICE.md, docs/game/cast.md, docs/game/places.md, notes/dorm-floor-plan.md and Jørgen's recorded taste. No story or game files changed.

Overall: the set is the right size and weight. No narration of the visible, three of five are wordless, the only new English is one Eric line, and nothing starts a quest. Two need fixes (bicycle, bath) and one contradicts the built hall (mailbox).

## 1. The garden bench: keep

- Clear: a cat on a bench with room for him is an invitation anyone reads. One pick plus one advance.
- Charm: good. "I was only going to sit down for a second." is a whole, loose sentence in Eric's dry voice (VOICE.md: short but whole), not a quip-closer. It says what he meant, not what he feels.
- Setting: fine. Tama "gets off wherever she likes" (cast.md), and she was last asleep on his chair in B2, so her being ahead of him is a cat's joke, not a teleport.
- Only note: if the seated hold needs a new control, the draft's own fallback (she hops off as the line advances) is fine; don't add a line to cover it.

## 2. The fallen bicycle: fix

- Clear what to do, one pick, no text. But what happens is a chore with a bell ring, and "pauses with one hand on the handlebar, then checks the stand" won't read at the play camera's size. As written it's flat: the player does a good deed and nothing answers it.
- Suggested fix, still wordless: when he lets go, the bell rings, and the bike that was leaning on the fallen one's other side slowly tips over into the aisle in its place. Eric looks at it. Return control. The second bike can be stood up with no further gag (or leave it lying; either way the upright/fallen state persists). Drop the stand-checking beat.
- If the tipping bike costs too much, cut this one rather than ship it flat.

## 3. The canteen terrace: keep (one small optional change)

- Clear: the stacked chairs on the other tables and a worker carrying a chair make the situation readable before anyone speaks; the player picks "Sit" and gets something better, which is a fair twist. Pick plus two advances; the two lines are different speakers, so they can't merge.
- Words in context: good reuse. Mio taught すみません "for sorry too" on the train, and this is exactly that use.
- Optional: have the worker say "あ、お疲れさまです。" with the bow instead of ありがとうございます. Kuro says お疲れさまです to him on the way out, so hearing it a second time from a different person at closing time teaches it by pattern, and ありがとうございます has no clear entry (only ありがとう from Kuroda at the gate). Either works; the bow carries it.
- Staging must show the other tables' chairs upside down before step 2, or Eric's look has nothing to land on.

## 4. At the bath curtain: fix

- Label: "Look through the bath curtain" reads as peeping, and in a game with bath-themed reward scenes a first-time player will expect something else entirely. Lifting a sento noren to look in is also not something a polite, tired Eric would do.
- It's audio-only. On a muted phone the player sees Eric stop, lift a curtain, drop it and smile: nothing happened. The draft says cut if it can't be heard, but VOICE.md allows narration for a sound, which is the one thing a picture can't carry.
- Suggested fix: let the singing play ambiently near the sento, so the player finds it by ear. Label the thing "Bath" (or "Listen at the bath"). Eric stops by the noren without touching it. The singing stops; a second voice finishes the tune, worse. One sound caption on the second voice only: "> Someone else finishes the song for him. He's worse." Eric smiles; return control. One pick, one advance.
- Optional charm: if the tune is the monorail's door chime (sfx `chime`, heard on the train this morning), the player recognises it without lyrics, and the second singer getting it wrong lands harder.

## 5. Mailbox 203: fix (contradicts the built hall)

- notes/dorm-floor-plan.md, entrance hall (marked built): "203 has a strip of tape reading エリック". The draft's empty holder and printed ERIC strip contradict that. The empty name slot in the plan is on the 2F door, not the mailbox, and the dorms scene ends the day 1.2 s after he reaches the room, so moving the strip action upstairs means carrying state across a trip for one beat.
- Suggested fix, simplest: keep the tape. Check mailbox 203: frame the tape, エリック, with a clear entry (ja エリック, ro erikku, en Eric), his own name as the first katakana he can "read". He opens the flap: inside, one folded flyer from the bakery on the plaza (パン BAKERY). No line. His first post on the island is junk mail. Return control; later opens show the same flyer, no replay.
- Check the builder's final ids (`mailboxes`) before implementing; the plan lists it as optional "only if the story agent gives it a line", and this gives it a picture instead.

## Branches and order

- All five hang on `going_home`, none blocks the route, none changes the day's end. Order along the walk: bicycle (detour back toward the station), bench (lane garden), canteen (plaza), bath and mailbox (dorm court). No two share a punchline type: animal, physical gag, social help, sound, name. Fine as a set.
- No AI-sounding lines found. No contradictions with the no-commute island or no-cars rule.
