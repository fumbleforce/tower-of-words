# Voice sheet

Read this before writing dialogue for any day. Discoveries and private scenes: `.claude/skills/rpg-scenes/SKILL.md`.

Follow the mandatory [plain writing rules](../../GUIDE.md#plain-writing) before sending or saving prose. This applies to voice notes as well as dialogue.

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

**Mio**. Her personality is in [cast.md](../../docs/game/cast.md#mio-mio), and her full voice sheet, approved by Jørgen, is [notes/characters/mio/voice.md](../../notes/characters/mio/voice.md). She sounds dry and tired. She gets annoyed when people interrupt her. She talks more when the subject is a game she likes. She is comfortable with silence.
- Sentences: medium length and loose, joined with "so", "but", "like", "and then". She trails off with "..." when she loses interest in her own sentence.
- Fillers: えっと, あー, "mm", "okay", "ne" once in a while. "Honestly" and "basically" from the internet.
- Slips: drops an article now and then ("island has no food"), mixes "I am" and "I'm", uses "also" at the end ("tomorrow also"), "how to say".
- Notices: servers, logs, what will become her ticket, whether Mori will be embarrassed.
- Avoids: saying she's glad, saying his name (until lunch), explaining herself, bowing. Never lists three things, never gives an order in fragments.
- Calls him {gaijin} the way you'd call someone "the new guy", not to hurt him.

**Eric** (the player). Tired, polite, dry. Says little; his lines are short but whole sentences ("The copier's fixed." not "Fixed."). Choice texts are things he'd actually say.

**Kenji**. His personality is in [cast.md](../../docs/game/cast.md#kenji-kenji). He speaks casual Japanese. He hesitates when he is confused. He sometimes agrees before he understands what someone wants. His English is limited to what he learned at school. He points or uses his hands when he cannot find a word. He is often funny without meaning to be.

**Emi**. Quick and complete sentences, talks like she's between two meetings. Brightness over worry: she says the good news first and the problem as an aside ("I got it. Well. I may have told them...").

**Mr. Mori**. Only polite Japanese. Warmth shows in what he does: bows, tea, making room that was already there.

**Mr. Ishibashi, the guard**. Polite, clipped Japanese. Speaks with his hands when he has to, precisely.

**Mr. Hamada**. Japanese only, apologises constantly, talks to machines like animals.

**Kuro**. Her personality is in [cast.md](../../docs/game/cast.md#kuro-kuro). She speaks slowly in a low voice. She flirts openly and looks straight at the person she wants. She can ask someone out without hiding behind a joke. She is polite to visitors at work. Her English is limited to short practical exchanges.

**Aoi**. She wants to take part and is tired of being handed the basket or a form. Her [assignment and language](../../docs/game/cast.md#aoi-aoi) stay in the cast sheet.

- Uses casual Japanese with peers, switching to short polite requests with senior staff or someone she has just met. A hesitation usually comes before asking a basic question; once she asks it, she wants an answer.
- Notices whose turn it is, who has a racket and whether a booking leaves room for beginners. She asks concrete questions and sometimes corrects her first request halfway through.
- Eric gets meaning from pointing, demonstrations and translated dialogue. Do not give her convenient English or make every misunderstanding a language lesson.
- The train-call callback is briefly awkward; she does not spend the whole meeting apologising. Avoid bubbly mascot speech, constant exclamations, instant confessions and enthusiasm written as a row of fragments.

**Rei**. Her personality is in [cast.md](../../docs/game/cast.md#rei-rei). She tells people what to do. She interrupts when she thinks she already knows the answer. She is impatient with objections. She speaks practical English and uses polite Japanese with strangers.

- English level and limits: [conversational, used with overseas customers](../../docs/game/cast.md#rei-rei). Write short complete requests and explanations; when she loses a word, she substitutes an ordinary one or demonstrates. Her tennis jargon can outrun Eric even when her English grammar is simple.
- In Japanese she uses polite forms with a new acquaintance. Her words can still be abrasive. English has fewer softeners. Do not explain away every harsh correction as an accident of language.
- Notices where someone aimed, whether they got another turn, and when an explanation has stopped helping. Teasing refers to something that just happened between them.
- Avoid stock sales pitches, mysterious insinuations and Mio's internet fillers. Rei wants to get on with what she is doing. She will leave a conversation to return to her game.

**The gym attendant** (`attendant`, day 3). A man at the gym's reception counter by day and on the pool deck in the evening. Polite Japanese to visitors, short practical sentences, and a casual あ、戻った！ when something works again. Says 出して to his printer out of habit. Never English.

**The club member** (`member`, day 3). A young woman in the swimming club. Quick, casual-polite Japanese, an あっ before she knows what she's saying. Never English.

**Narration**. Second person, a few words, only for what the scene can't show.

**Mio's texts** (`miotext`). Lower case, no full stops, short: "is that you?", "loud".

## Voice direction

Every voiced line has an `emo` tag; the list and what each means are in VOICE-DIRECTION.md.

### Station garden worker

An unnamed adult tending the garden, using the approved reader clone. Polite, unhurried Japanese. He notices a visitor without turning the job into a lesson. First Talk offers an actually free bench; repeat Talk points toward the next visible patch. After both patches are clean, he parks his tools and takes a break. When collecting, he asks for a moment and keeps the exchange brief. Eric replies “Oh, thanks.” or “Sure. I’ll leave you to it.” No personal backstory, previous-day claim, or new vocabulary prompt.
