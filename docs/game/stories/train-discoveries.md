# People on the train

Five optional encounters give the passengers something of their own to do before Eric sits with Mio. Built. The passages follow the author decision in reviews/train-discoveries-1 under C-0193; Aoi keeps her original replies. Japanese has English subtitles for the player, while Eric follows gestures and familiar words.

## Cast

`eric`, `bun`, `youth`, `music`, `reader`, `kuroda`

## Beats

1. Talking to the bun-haired woman: she points at her overfilled shopping bag, Eric presses it down while she zips it, and she thanks him. The bag stays closed.
2. Talking to the young man: he shows a football photograph and his first goal despite a 1–6 loss. Eric points and asks whether it is him; he points himself out in the photo and nods.
3. Talking to the headphone wearer: she lifts a cup and asks whether the sound was leaking. Eric answers; she shows her own guitar practice video, then puts the phone away and headphone back.
4. Talking to the reader: the book title is shown, then its page beside his old Windows 95 printout. He explains the missing buttons; Eric recognises the version, and the reader confirms it is the one at work.
5. Talking to Hamada: Eric notices the existing appointment note. His phone buzzes with the reminder; he taps it silent and sleepily apologises. He stays asleep for the later [rescue](sleeping-man.md).

## Choices and flags

These are optional talk actions, with no menu, item reward or new lesson. When bun, youth or music is the first passenger spoken to, their encounter flows straight into the directed seat point and existing `nod_seat` goal. Reader and Hamada retain their original lack of a seat hint. Repeat talks give only a small emote; greetings are unchanged. Each held view is dismissed inside the same node, and Continue restores the active encounter before replaying to its saved line.

| Flag | Set when | Read by |
|---|---|---|
| `train_bun_seen` | Her encounter finishes | `bun`, quiet repeat |
| `train_youth_seen` | His encounter finishes | `youth`, quiet repeat |
| `train_music_seen` | Her encounter finishes | `music`, quiet repeat |
| `train_reader_seen` | His encounter finishes | `reader`, quiet repeat |
| `train_hamada_seen` | His encounter finishes | `hamada`, quiet repeat |

The shared seat flags belong to [Mio on the train](mio-train.md).

## Words taught

None. Subtitles do not add words to the player's knowledge.

## Nodes

| File | Nodes |
|---|---|
| `train.js` | `first_bun`, `first_youth`, `first_music`, `bun`, `youth`, `music`, `reader`, `hamada` |
