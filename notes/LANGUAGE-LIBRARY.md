# Ways to teach a word inside play

A library of options for putting a Japanese word into the game so it gets learned by playing, not by a lesson. Each fits Amakawa as it is: Eric in the office on B2, kotodama commands that only work in his voice, overheard Japanese as gibberish with known words sharp, the typing prompt, the Say button, Mio as the one person with English, and Tama.

Ground rules they all follow (GUIDE.md, current focus): the game comes first, English is always shown for now, nothing tests recall or blocks progress on remembering a word, and only words taught in play count as known. Examples use real day-1 words.

Key for "teaches": recognition (knowing it when you see or hear it), production (saying it, here by typing or the Say menu), reading (the written word, kana or kanji), listening (catching it in speech), register (who you say it to).

Cost: low = story lines only, or lines plus a hook that already exists. Medium = a small engine, world or UI change. High = a new system.

## The options

### 1. Their word, your voice
How it plays: someone says a word to a machine out of habit, nothing happens, Eric says it and it works.
Example: Mio yells 待って at the closing train doors; Eric types matte and they freeze.
Teaches: listening, production, meaning through the effect.
Cost: low. Engine: none (exists).
Note: this is the backbone of day 1 (待って, 動いて, 入れて). Using it for every word turns it into a formula, so mix in the others.

### 2. Heard it first
How it plays: a word jumps out of a stream of gibberish because someone repeats it under stress. The player picks it up without anyone teaching it.
Example: Hamada, stuck in the gate, begging it: 開けて…お願い、開けて…
Teaches: listening, recognition.
Cost: low. Engine: none (`{id}` in an overheard line, then `learn`).

### 3. Heard it again
How it plays: after a word is taught, it turns up in other people's talk around Eric, sharp in the text and clear in the muffled voice. The world gets a little less opaque, and the player notices.
Example: the guard says おはようございます to each commuter tapping through, before Eric gets to him.
Teaches: listening, recognition, and a visible sense of progress.
Cost: low (lines, then tools/voices.py). Engine: none (`ambient` or overheard lines).

### 4. Everything answers
How it plays: every command has a few targets around the day, each taking it literally, with a small reaction and a line.
Example: 待って to the wall clock stops the second hand; Mori looks at the clock, then at his watch.
Teaches: meaning by consequence, production.
Cost: low per target when the hook exists (clock, fan, kettle, vending, coffee machine); medium for new hooks. Engine: existing hooks.

### 5. Wrong word, honest reaction
How it plays: a word said to the wrong person gets a reaction in character that shows what the word actually means.
Example: 開けて to the guard: he looks down at his own jacket, confused.
Teaches: meaning boundaries, register.
Cost: low. Engine: none.

### 6. Tama, the practice partner
How it plays: the cat is in all three places and has a reaction to every word. She never judges (Jørgen liked this). A safe place to try a word that just came up.
Example: 待って to Tama at the gate while she eats: she freezes with her head in the bowl, and the guard pretends there is no cat.
Teaches: production with no stakes.
Cost: low. Engine: none (`say:<word>:tama`).

### 7. Right word for the person
How it plays: the same greeting lands differently depending on who hears it. Stiff and polite pleases Mori; Kenji laughs and gives the casual form back; Mio says it's too polite for her.
Example: おはようございます to Kenji: 「かたっ！おはよう、でいいよ。」
Teaches: register.
Cost: low now (reactions). Medium later, if the casual forms become their own Say entries. Engine: none now.

### 8. Mio's texts
How it plays: Mio messages Eric while she's elsewhere, in English with a taught word dropped in as Japanese, the way bilingual people text.
Example: at the gate, after she's run off: "server room is chaos. if you get stuck just すみません and point at stuff, it works for everything"
Teaches: reading in context, reuse.
Cost: low. Engine: none (a speaker with `phone: true` in the story file's `speakers`, like `reitext`).

### 9. Signs that come into focus
How it plays: Japanese signs show in the same soft shifting glyphs as overheard speech until their word is taught; then they sharpen with a small shimmer.
Example: the station sign 本社 sharpens as the announcement says つぎは 本社.
Teaches: reading, and progress you can see in the world.
Cost: medium. Engine: two-state sign textures and a refresh when a word is learned (world and builder).

### 10. Sticky notes
How it plays: coworkers' handwritten notes on the machines they fight with. Unreadable at first; readable once the word is taught, and then they tell you a bit about the person.
Example: a yellow note on the B2 copier in Mori's handwriting, 動いて！ with a tiny bowing man drawn under it. After the copier works, Eric can read it and realises Mori has been asking nicely since 1996.
Teaches: reading (handwriting), recognition.
Cost: low to medium (a prop texture and two look lines). Engine: none beyond the prop.

### 11. Word in light
How it plays: when a kotodama takes hold, the word itself rises off the thing in faint characters and fades. It makes the magic look wrong in a good way and ties the kanji to what it did.
Example: 動いて lifts off the copier's lid as it starts printing.
Teaches: reading, recognition of the kanji.
Cost: medium. Engine: a `word` option on the `kotodama` hook (feel or world, with the builder).

### 12. The half-said word
How it plays: a near miss in the typing prompt still does something, just wrong: the copier shudders and prints one grey sheet, the doors twitch. Every attempt visibly does something (GUIDE, Difficulty rule 8).
Example: typing "ugoide": the copier coughs out a single smudged page.
Teaches: accurate production; typos become jokes.
Cost: medium. Engine: the `type` hook reports a near miss so the story can react.

### 13. Say it while it's happening
How it plays: the typing prompt runs while the world keeps moving. No fail state, but it feels urgent.
Example: the train doors creeping shut on Hamada while Eric types matte.
Teaches: production under a little pressure.
Cost: low. Engine: exists (`doorsClose` with `ms`).

### 14. Point and say
How it plays: a phrase plus a gesture: Eric says すみません, then picks what to point at. The phrase opens the door, the pointing carries the meaning.
Example: the gate's social route (すみません, then point at the briefcase, the man, the gate, the cat).
Teaches: how a phrase is used, not just what it means.
Cost: low. Engine: none (exists).

### 15. Board karaoke
How it plays: the LED board on the train or the lift display shows the announcement and lights each word as the voice says it (GUIDE: sound and text together).
Example: つぎは 本社 lighting up word by word with the announcement.
Teaches: reading and listening together.
Cost: medium. Engine: timed spans on the board (shell).

### 16. Name cards and the in/out board
How it plays: names in katakana on desks and magnets, with the romaji written under by hand where someone cared. Katakana practice on the words he most wants to read: people's names.
Example: Eric's desk card エリック, with ERIC written under it in Mio's pen.
Teaches: reading katakana (his weak spot).
Cost: low. Engine: none (world texture). Adds a word (his name): flagged.

### 17. The machine that sticks
How it plays: an everyday errand goes wrong and a taught command fixes it, usually too well.
Example: the vending machine eats Eric's ¥130. 動いて: two cans drop.
Teaches: reuse of a command in a new place.
Cost: low. Engine: none (`vendingDrop` exists).

### 18. The word travels
How it plays: a coworker picks up the word from what Eric did and tries it themselves later, half as a joke. It never works for them.
Example: after lunch, Mori says 入れて to his empty cup, very quietly, and glances at Eric.
Teaches: listening, recognition, and shows the word living in the office.
Cost: low. Engine: none.

### 19. The callback
How it plays: at the end of a scene or the day, someone goes over what happened and uses the words while doing it. No quiz; the words are just there.
Example: Mio at 18:05: "The train doors, when you said 待って. Then the copier…"
Teaches: recognition in context.
Cost: low. Engine: none.

### 20. Gossip about you
How it plays: coworkers talk about Eric in gibberish; the only clear bits are words tied to what he did. The player works out what they're saying from those.
Example: Kenji to Mori, looking at Eric: 「朝、ゲートが勝手に開いたって。」 with ゲート clear.
Teaches: listening, and the pleasure of catching a word.
Cost: low. Engine: none.

### 21. A choice made of words
How it plays: at a real decision, Eric's options are words he knows instead of English lines. What he picks changes how the other person treats him.
Example: the guard is busy typing; Eric can say おはようございます, すみません, or wait.
Teaches: choosing a word by meaning and register.
Cost: low. Engine: none (several `say:` triggers on the same target, marked as a goal).

### 22. Someone corrects the word
How it plays: one character corrects another's word choice in front of Eric, and the correction is the lesson.
Example: Mio calls Eric 外人 to Mori; Mori quietly says 外国の方, ですよ.
Teaches: register, politeness.
Cost: low. Engine: none. The corrected word can be a one-line `clear` entry; it doesn't have to become known.

### 23. Wrong time of day
How it plays: a greeting that was right in the morning is wrong in the evening, and someone answers with the right one.
Example: おはようございます at 18:05, and the reply is お疲れさまです.
Teaches: register, time.
Cost: low. Engine: none. Adds お疲れさまです to day 1: flagged, only if Jørgen wants it.

## Top 5 for day 1

Picked for cost, for fixing what the audit found (commands never come back), and for the fun of it. All but the last are story lines only.

1. **Everything answers (4), with honest wrong-word reactions (5).** The commands are the weak spot: each is taught once and never comes back. Give the silent reactions a line (clock, fan, coffee machine), and add the vending machine that sticks (17) for 動いて. Where: office afternoon, when the player has the vending errand and free time.
2. **Heard it again (3).** The guard greeting commuters with おはようございます as Eric walks into the lobby shows him how it's done and proves Mio right about the guard. Later, Hamada on the phone saying すみません over and over. Where: gate start (ambient), office afternoon.
3. **Tama, the practice partner (6).** She's in all three places; give her a reaction to each word Eric has by then. At the gate the joke writes itself (the guard insists there is no cat). Where: gate (by the guard desk), office (asleep on Eric's chair in the machine room).
4. **Mio's texts (8).** Replace the gate's UI hint ("Mio said if you're stuck, say すみません and point") with an actual text from her. That removes story advice from a panel (the no-exposition rule) and puts a taught word in her voice. Where: gate, right after the jam; maybe one more in the afternoon.
5. **Word in light (11).** Every kotodama moment (doors, gate, copier, pot, rack) shows the word rising off the thing. Makes the magic read as magic, which Jørgen said the doors didn't, and ties the kanji to what it did. Where: the `kotodama` hook, used by every command beat.

Close runners-up: the callback (19) in Mio's evening list, which is one line per word and goes in with pick 1; the sticky note on the copier (10); the word travels (18) for 入れて and 止まって after lunch.
