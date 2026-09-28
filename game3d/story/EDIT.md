# Editor's pass on day one (2026-09-28)

Read in order from a fast-mode playthrough (train, gate, lift, office), before this pass's rewrite. Per scene: what Eric wants, what's in the way, how it turns, what was flat, and the lines that read as written rather than spoken. The last column of each section says what changed.

The train is the reference. Jørgen: "I love the dialogue now, Mio's lines are good... story makes a lot more sense, and talking to the cat is funny." It works because Mio talks in loose, imperfect English about her own day (the pickles, the server), the lesson happens as things come up, and the small jokes come from things in the world (the cat that won't judge you).

## Train

- Want: get to his first day without embarrassing B2. Obstacle: no Japanese, and Mio would rather not talk to a stranger. Turn: the doors hold for his word and not hers.
- Flat: the doors beat. The sleeping man was still inside while everyone else was too, the camera went to the door so the man was easy to miss, the doors crept shut in real time against slow readers, and nothing said why it mattered. Mio's server call came out of nowhere, with no phone on screen.
- Written-sounding lines: none flagged; Mio's voice stays.
- Changed (Jørgen's notes, approved beat): everyone gets off first; from the platform they see him alone in the car; the announcement says the train goes back to the mainland (Mio set that up on the ride: "once a month he misses our stop"); the doors close in two steps and wait while Eric types; he stumbles out, the doors shut and the train leaves. Mio's phone buzzes and she looks at it before she reacts. Her first line now fits the support contract ("Amakawa never replaces anything, so, um... some of them are older than me").

## Gate

- Want: get through to B2 before anyone notices he's lost. Obstacle: his card isn't live until nine and the guard has no English. Turn: the man from the train jams the gate, and Eric gets him out, either with the man's own word or by getting the guard to see the fix.
- Flat, before:
  - Nobody directs him. After the guard's nine-o'clock line he stood there; the guard didn't point at the reader or anywhere else (Jørgen: "Why doesn't he point to the card reader after I talk to him").
  - Almost all narration. "Mio told you to say good morning to him first", "He hasn't noticed you. You'll have to say something", "The guard is watching you now, and he doesn't look pleased", "He follows your finger to the briefcase", "He frowns. Yes, he knows the gate thinks they're two people". Several narrate things the player can see, or actions the engine doesn't stage.
  - The advice after the jam was a hint panel in Mio's name ("Mio said if you're stuck, say すみません and point..."), which is exposition in a panel.
  - 開けて was learned with `learn`, without typing, so the word route never taught the word.
  - The guard's life was missing: the old version had him on hold to the gate company, cut because nothing on screen showed it. The phone hook exists now.
  - The man was "Man with a briefcase", although the player met him on the train.
- Written-sounding lines: the hint panel above; "The guard is watching you now, and he doesn't look pleased" (a narrator's summary); "He looks at you like, where would I go?" (narrator doing a character's voice).
- Changed:
  - Every step now has someone pointing at the next one. As he walks in, the guard says おはようございます to commuters (so the word is heard before it's needed). Greeting him gets a bow back and "カードを、どうぞ" with a point at the reader. The red card brings a commuter's impatient すみません behind him, the guard beckons him over, points at the clock for nine, then at the bench: "あちらで、お待ちください". Eric walks over and sits. After the fix, the guard points him to the lift. Goal lines for each step.
  - The man from the train bursts in at 8:52 and jams the gate. The gate's screen shows two stick figures, one of them square. He begs the gate, 開けて (glossed), お願い... いい子だから, like talking to a horse. The guard calls the gate company and gets hold music.
  - Mio texts from B2 in place of the hint: "the chat says the lobby gate is broken again. is that you?" / "if the guard ignores you say すみません and point at stuff. loud".
  - Word route: talk to the man, "Say his word with him", type akete; the gate bursts open. The gate company picks up that second; the guard, staring at Eric: "いえ…開きました" (no... it opened). Eric: "That's twice now."
  - Social route: すみません gets the guard's attention; Eric points and mimes; lifting an invisible case over his head gets a laugh, the guard shouts it to Hamada, the gate opens, and the gate company picks up just then ("いえ、もう大丈夫です"). Hamada thanks him; the guard waves him through before nine; Eric: "Arigatō."
  - Words get honest answers: the gate says good morning back and still wants a card; Tama blinks, freezes with her head in the bowl, and the guard says 猫はいません (there is no cat) every time.

## Lift

- Want: none; it's a breath between scenes that plants Sales talking about "the consultant" for B2. Fine as it is. Two narration lines merged into one: "One of them glances at the card on your lanyard. IT SUPPORT, B2. They stop talking."

## Office, morning

- Want: settle in (a desk, a chair, a first repair request). Obstacle: nobody but Mio has English and she's busy; his chair is gone. Turn: the copier, broken since 1996, works for him in front of Mori.
- Flat, before:
  - Kenji's first meeting never played when you tapped him, because tapping sets `met_kenji` in the engine before the trigger checks it. Players only ever saw his second line.
  - Kenji's first meeting, when it did play, was Japanese plus narration ("He points at your empty desk, then at the machine room door"), so the funniest person in the room had no voice.
  - Mori's greeting: "He looks very pleased" (the face shows it). After greeting, nobody led Eric anywhere; the goal said "Find your desk".
  - The copier: "> Nothing." and "> Your turn." narrate what the screen and the prompt already show. Mori's finger to his lips had nothing to pay off.
  - Mio's reply to "I asked it nicely" was a shrug; she has seen the train doors and should connect them.
- Changed: Mori says "どうぞ、こちらへ" and leads him in. Kenji meets him in his own broken English ("Your chair... I borrow. My chair is... broken. Pshh." / "Now it is in machine room. And cat is sleeping on it. Sorry!"). Mio on the chair that rolls back with the cat on it: "Sorry. She comes with it, I think." The repair request was opened by Mori when he came down to B2; at the copier he murmurs 三十年 (thirty years) before the finger to his lips, and it pays off at the end ("Mori-san won't tell me why, he just smiles"). Mio: "...Asked it nicely. Like the doors, this morning?" Mori's correction 外国の方 is now readable, since Mio explains it in the next line. The copier, and every command beat, plays the kotodama effect.

## Lunch

- Want: company, or quiet. Obstacle: Mio keeps people out; Mori has no English. Turn: Mio asks him to stop the rack alarm ("I want to see something"); Mori's thermos fills all seven cups.
- Flat: Mio's answer about the doors ("I'll check the logs tonight") pointed at detective work, which is banned, and went nowhere.
- Changed: "The station asked me already, so I said it's the sensor." / "It's probably the sensor." She's covering for him, which sets up the evening. "Why B2?" now ends on the support contract: "And the company won't buy new ones, ever. So now they pay you to babysit them with me."

## Afternoon

- Want: a small kindness (the one gift). Flat: a long hint panel told him what to do and why. Now Mio tells him in passing that Mori drinks corn soup from a can, the panel only teaches the Give button, and the vending machine sticks on the first coin so 動いて comes back. After lunch the words echo once: Mori tries 入れて on his own cup and nothing happens; Mio tries 止まって on her phone alarm and gives up ("Mm. Only for you, I guess").
- New: Emi, the team lead, comes down from head office at 17:40 for three lines. She won her parts budget by promising B2 can keep every machine on the island running for ten years, "with the right contractor". It's a second pull toward tomorrow.
- Bug fixed: talking to the desk after 18:05 replayed "18:05." each time.

## Evening

- Want: go home. Obstacle: Mio's question. Turn, before: she listed what she'd seen and asked "How are you doing that?", then the day ended. The list read as a recap and there was no reason to come back tomorrow.
- Changed: her list names the words ("On the train you said 待って and the doors just stopped"; Mori has said 動いて to the copier every morning for thirty years), with her own asides. Eric answers ("I don't know" / "I asked nicely" / nothing). Then her phone goes: the station has made a repair request about the 8:40's doors, and it lands on Eric: "It's an IT repair request, and you're the IT guy, so." If they had lunch together: "Take the 8:40 tomorrow. I'm in the front car. I want to see you fix that sensor." Otherwise: "It's the 8:40. Don't sleep through it, 外人." That pays off her train line ("If somebody reports it broken, it goes on my list") and gives day 2 a specific first scene without writing it.
