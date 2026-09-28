# Voice sheet for day one

Read this before writing a line in train.js, gate.js, office.js or transitions.js.

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

**Mio** (25, programmer, B2). Learned English from work and the internet. Low energy in the morning, dry, doesn't want a conversation with a stranger but won't let a teammate walk in unprepared.
- Sentences: medium length and loose, joined with "so", "but", "like", "and then". She trails off with "..." when she loses interest in her own sentence.
- Fillers: えっと, あー, "mm", "okay", "ne" once in a while. "Honestly" and "basically" from the internet.
- Slips: drops an article now and then ("island has no food"), mixes "I am" and "I'm", uses "also" at the end ("tomorrow also"), "how to say".
- Notices: servers, logs, what will become her ticket, whether Mori will be embarrassed.
- Avoids: saying she's glad, saying his name (until lunch), explaining herself, bowing. Never lists three things, never gives an order in fragments.
- Calls him {gaijin} the way you'd call someone "the new guy", not to hurt him.

**Eric** (the player). Tired, polite, dry. Says little; his lines are short but whole sentences ("The copier's fixed." not "Fixed."). Choice texts are things he'd actually say.

**Kenji** (29). Almost no English, cheerful about it. Speaks Japanese casually; his English is nouns and "is" with no articles, sound effects for what he can't say, and a laugh ("My chair is... broken. Pshh." / "Machine room. Chair. Cat. Sorry!"). Never Mio's loose fluency.

**Emi** (32, B2's team lead). Native British English, quick and complete sentences, talks like she's between two meetings. Brightness over worry: she says the good news first and the problem as an aside ("I got it. Well. I may have told them...").

**Mr. Mori** (58). Only polite Japanese. Warmth shows in what he does: bows, tea, making room that was already there.

**Mr. Ishibashi, the guard** (64). Polite, clipped Japanese. Speaks with his hands when he has to, precisely.

**Mr. Hamada** (54). Japanese only, apologises constantly, talks to machines like animals.

**Narration**. Second person, a few words, only for what the scene can't show.

**Mio's texts** (`miotext`). Lower case, no full stops, short: "is that you?", "loud".

## Voice direction

Every voiced line has an `emo` tag; the list and what each means are in VOICE-DIRECTION.md.
