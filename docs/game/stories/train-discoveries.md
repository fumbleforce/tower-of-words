# People on the train

The unnamed passengers stay in the background. Eric does not handle their belongings, and they do not show him personal projects or direct him to a seat (Jørgen, 2026-10-16). Hamada keeps his sleepy phone reminder before the later rescue. Built. Spoken Japanese remains blurred except for words Eric knows.

## Cast

`eric`, `bun`, `music`, `reader`, `kuroda`

## Beats

1. The woman with a bun gives a quiet emote. Her shopping bag stays by her feet.
2. The woman with headphones keeps listening to her music.
3. The man with a book keeps reading. Eric can read its title, "Excel for People Who Hate Excel".
4. Talking to Hamada: his phone buzzes with the appointment reminder. He sleepily apologises while it is held on screen, then taps it silent when the player advances. He stays asleep for the later [rescue](sleeping-man.md).

## Choices and flags

These are optional talk actions, with no item reward or new lesson. Bun and music give the same quiet emote every time. Reader keeps his book-title line on the first visit and gives a quiet emote after that. Greetings are unchanged. The unused first-talk node ids remain and contain no seat directions. Hamada's phone is dismissed inside his node, and Continue restarts that encounter with its captured staging. Completed encounters retain their seen flags.

| Flag | Set when | Read by |
|---|---|---|
| `train_bun_seen` | Her talk action finishes | Retained save flag |
| `train_music_seen` | Her talk action finishes | Retained save flag |
| `train_reader_seen` | His talk action finishes | `reader`, quiet repeat |
| `train_hamada_seen` | His encounter finishes | `hamada`, quiet repeat |

The shared seat flags belong to [Mio on the train](mio-train.md).

## Words taught

None. Subtitles do not add words to the player's knowledge.

## Nodes

| File | Nodes |
|---|---|
| `train.js` | `first_bun`, `first_music`, `bun`, `music`, `reader`, `hamada` |
