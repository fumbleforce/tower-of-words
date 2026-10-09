# Voice direction for day one

Every voiced line in the story files carries an `emo` tag, for example `{ say: 'mio', emo: 'dry', text: '...' }`. The builder regenerates the clips with it. This page says what each tag means and how to turn it into a TTS instruction. Which voice each person has is in docs/game/art-and-sound.md, Voices.

## Pipeline

- `game3d/tools/voice-manifest.mjs` should copy `emo` into each manifest entry (`emo: s.emo`). Lines without one (Eric's typed words, which are fixed clips) use the speaker's default below.
- For a TTS that takes a style instruction (Qwen3-TTS VoiceDesign or CustomVoice), send the instruction from the table, prefixed with the speaker's base line. For the voice-clone Base model, which has no instruction input, use the speed column and pick the take whose delivery fits the tag; don't pile style words into the text.
- Keep the male-drift guard for Mio (GUIDE): redo a take with a median under 190 Hz. `shout` and `groan` should stay inside that range too.
- `miotext` lines are text messages. They are read, not spoken, and need no clip.
- Overheard lines (`overheard: true`) are played muffled, so their delivery matters more than their words: the tone is what the player gets.

## Speakers (base line, default tag)

| Speaker | Base line for the instruction | Default |
|---|---|---|
| mio | Woman of thirty, low and slightly husky, unhurried, speaking English as a second language with a light Japanese accent. | dry |
| eric | Tired man in his thirties, quiet and polite, no accent. | tired |
| mori | Man of about sixty, soft and formal Japanese, kind. | polite |
| kenji | Young man of about twenty-one, soft and mild, a little too quick when he wants to help, polite Japanese to his seniors; his English is a few halting school words. | bright |
| guard | Man in his sixties, clipped, correct Japanese, a security guard. | polite |
| kuroda (Hamada) | Man in his fifties, flustered, apologising, breathless. | flustered |
| emi | Woman in her thirties, native British English, quick and confident, always slightly in a meeting. | bright |
| kuro | Woman of 38, receptionist, confident and direct, low and unhurried, polite Japanese with an edge to it. | polite |
| aoi | Young woman, bright, on the phone. | bright |
| ann | Station announcer, even and clear. | announcer |
| gatev | The gate's recorded voice. | machine |
| sales1, sales2, commuter | Office workers, ordinary. | casual |

## Tags

| Tag | Instruction | Speed | Where it's used |
|---|---|---|---|
| dry | Flat and understated, a little amused underneath, no emphasis. | 1.0 | Mio mostly ("Sorry. She comes with it, I think.") |
| deadpan | Completely flat, a beat before speaking, no smile in the voice. | 0.95 | Mio's "...That door has a card reader, you know." |
| casual | Relaxed, conversational, like talking to a coworker. | 1.0 | Mio explaining, Sales in the lift |
| tired | Low energy, slightly slow, a small sigh in it. | 0.92 | Eric; Mio in the morning and at the end of the day |
| low | Quiet, close, said half to herself, not whispering. | 0.95 | Mio's evening list, "It's probably the sensor." |
| whisper | Breathy whisper, very soft. | 0.9 | Mori's 三十年, his 入れて to his own cup; Eric's "That's twice now." |
| warm | Gentle and kind, a smile in the voice. | 0.95 | Mori's thanks, the guard waving him through |
| fond | Affectionate, about something she likes but won't say so. | 0.95 | Mio on her mother's pickles, her old servers |
| amused | Trying not to laugh. | 1.0 | Mio's "not bad", the guard's はい、よろしく |
| laugh | A short real laugh before or through the words. | 1.0 | The guard's ははっ, Kenji's かたっ |
| bright | Upbeat and friendly, a bit fast. | 1.05 | Kenji, Aoi, Emi |
| excited | Big and happy, rising pitch. | 1.1 | Kenji getting melon soda |
| surprised | Caught off guard, pitch up at the start. | 1.05 | "Eh... B2?", "...Doors don't do that." |
| flustered | Rushed and embarrassed, words tripping. | 1.1 | Mio catching her bag, Hamada apologising |
| sheepish | Apologetic, a little embarrassed laugh. | 1.0 | Kenji about the chair, Mori about the copier eating paper |
| embarrassed | Shy, quieter at the end of the line. | 0.95 | Mio offering a pickle, "You can eat here tomorrow also" |
| teasing | Dry and playful, a small smile. | 1.0 | Mio's last line if they had lunch |
| hesitant | Starts and stops, unsure. | 0.9 | "Um. Eric.", Eric's "Hi. Um... good morning?" |
| curious | Interested, leaning in, a question under it. | 1.0 | Mio's "I want to see something", Kenji asking Mori |
| puzzled | Confused, a rising "huh". | 1.0 | Kenji's あれ？ at the fan, Mio about Mori's cups |
| polite | Formal Japanese politeness, even and careful. | 0.95 | The guard, Mori, the receptionist |
| stern | Firm and unsmiling. | 0.95 | The guard: "猫はいません。" |
| curt | Short, clipped, busy. | 1.05 | The guard on hold, an office worker's すみません |
| pleading | Begging softly, like coaxing an animal. | 0.9 | Hamada to the gate: お願い、開けて…いい子だから |
| panicked | Breathless, high, fast. | 1.15 | Hamada waking up and bursting in |
| shout | Raised voice across a distance, not screaming. | 1.05 | Mio's 待って at the doors, calling across the office |
| hurried | Fast, already leaving. | 1.1 | Mio running for the server |
| groan | A tired "ugh" in the voice, exasperated. | 0.95 | "あー, no, no...", the station ticket |
| announcer | Even, clear, public-address. | 0.95 | Train announcements |
| slow | The word on its own, said slowly and clearly for a learner, each syllable distinct, a little warmer than the line before. Lines tagged slow also carry `slow: true`. | 0.7 | Every teaching moment: the second, slow repeat of the new word |
| machine | Cheerful recorded announcement, perfectly even. | 1.0 | The gate's voice |

Faces (`face`) are separate from `emo` and only pick the portrait.
