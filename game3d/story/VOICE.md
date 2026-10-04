# Voice sheet for day one

Read this before writing a line of dialogue in train.js, gate.js, office.js or transitions.js. Discoveries and private scenes: `.claude/skills/rpg-scenes/SKILL.md`.

## What the skills say, applied here

- dialogue: a line has to do two jobs at once (move things on and show who is talking), and the gap between what someone says and what they mean is where the character is. Mio never says she doesn't like strangers; she puts her headphones back on. Read every line aloud. If you couldn't say it on a train without sounding like a fortune cookie, rewrite it.
- dialogue, anti-patterns: no one explains things both people already know, no one states their feelings, and no one talks in perfectly alternating, perfectly sized lines.
- humanizer: the AI voice in dialogue is the row of fragments ("Server. I have to run."), the colon construction ("The guard: good morning first."), the one-line closer that sounds quotable ("They survive everything."), and lists of three. Real speech is looser and longer: people add "so", "like", "I think", trail off, correct themselves, and react to what was just said.
- story-sense and cliche-transcendence: every person has their own day going on. Mio has a server down and a bag of her mother's food; she teaches Eric because she'll be embarrassed if he isn't taught, not because she's his guide. No one in the carriage knows they're in Eric's story.
- Jørgen, on narration: the 3D scene shows the places and the people. Narration only says what can't be seen and matters (a sound, a time skip, a detail too small to see), in a few words.

## Rules for the Japanese

- Overheard Japanese shows clear only for words Eric has learned in play (the three greetings, the commands once taught, 外人 once Mio has said it) and loanwords he'd catch by ear (コンサルタント, ゲート, ノルウェー). Nothing else gets a `clear` entry.
- When someone answers a word Eric just said, they answer with that word (written as `{id}` so it matches), in English, or with their body.
- People across the carriage don't answer a greeting that wasn't meant for them.
- Learning a word ends with Eric trying it himself: an `offer` with `type: true` (he types the romaji; see REQUESTS.md).

## Speakers

Who each person is (age, job, what they speak) is in docs/game/cast.md. This sheet is how to write them.

**Mio**. Low energy in the morning, dry, doesn't want a conversation with a stranger but won't let a teammate walk in unprepared.
- Sentences: medium length and loose, joined with "so", "but", "like", "and then". She trails off with "..." when she loses interest in her own sentence.
- Fillers: えっと, あー, "mm", "okay", "ne" once in a while. "Honestly" and "basically" from the internet.
- Slips: drops an article now and then ("island has no food"), mixes "I am" and "I'm", uses "also" at the end ("tomorrow also"), "how to say".
- Notices: servers, logs, what will become her ticket, whether Mori will be embarrassed.
- Avoids: saying she's glad, saying his name (until lunch), explaining herself, bowing. Never lists three things, never gives an order in fragments.
- Calls him {gaijin} the way you'd call someone "the new guy", not to hurt him.

**Eric** (the player). Tired, polite, dry. Says little; his lines are short but whole sentences ("The copier's fixed." not "Fixed."). Choice texts are things he'd actually say.

**Kenji**. Keen to help and easily distracted: he offers to do things he isn't allowed to, and wanders off mid-sentence onto whatever caught his eye (forest cats on YouTube). School English he's eager to practise, cheerful about how little of it there is. Speaks Japanese casually; his English is nouns and "is" with no articles, sound effects for what he can't say, and a laugh ("My chair is... broken. Pshh." / "Machine room. Chair. Cat. Sorry!"). Never Mio's loose fluency.

**Emi**. Quick and complete sentences, talks like she's between two meetings. Brightness over worry: she says the good news first and the problem as an aside ("I got it. Well. I may have told them...").

**Mr. Mori**. Only polite Japanese. Warmth shows in what he does: bows, tea, making room that was already there.

**Mr. Ishibashi, the guard**. Polite, clipped Japanese. Speaks with his hands when he has to, precisely.

**Mr. Hamada**. Japanese only, apologises constantly, talks to machines like animals.

**Kuro**. Composed and precise, with the courtesy of someone at work. A tease stays in her usual even delivery; she lets Eric notice it without laughing at him or explaining it. No gushing, pet names or coy pauses.

**Narration**. Second person, a few words, only for what the scene can't show.

**Mio's texts** (`miotext`). Lower case, no full stops, short: "is that you?", "loud".

## Voice direction

Every voiced line has an `emo` tag; the list and what each means are in VOICE-DIRECTION.md.
