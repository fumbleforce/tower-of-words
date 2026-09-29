# Cast

Everyone who appears in the game, as it is now. Last checked against the game on 2026-09-29.

This file holds who each person is, where they take part, the names the player sees, what they like, and which portrait faces exist. It doesn't hold how they talk (game3d/story/VOICE.md), their voice settings (game3d/story/VOICE-DIRECTION.md), what they do in each scene (day1.md), whether their art is approved (art.md; until that exists, bible/facts.yaml), or ideas for later days (notes/walkthrough/, not part of the game).

The tables are checked against the game by `node tools/facts/check.mjs`. Ids in backticks are the ids the story files use. The place names are `train`, `gate`, `lift` and `office`.

## Day 1 cast

| Id | Name | Who they are | Takes part in |
|---|---|---|---|
| `eric` | Eric | The player. A Nordic IT support engineer on a support contract, based on B2. | train, gate, office |
| `mio` | Mio | B2's programmer. | train, office |
| `mori` | Mr. Mori | On the B2 team; used to be a manager. | office |
| `kenji` | Kenji | The newest on the B2 team before Eric. | office |
| `emi` | Emi | B2's team lead. | office |
| `guard` | Mr. Ishibashi | The security guard at the lobby gate. | gate |
| `kuroda` | Mr. Hamada | Accounts, 12th floor. The sleeping man on the train. | train, gate |
| `kuro` | Kuro | The receptionist in the lobby. | gate |
| `aoi` | Aoi | A new hire on the train, on the phone. | train |
| `tama` | Tama | A calico cat who rides the monorail and gets off wherever she likes. | train, gate, office |
| `bun` | Woman with a bun | A passenger. | train |
| `youth` | Young man | A passenger. | train |
| `music` | Girl with headphones | A passenger. | train |
| `stander` | Man with a bag | A passenger. | train |
| `reader` | Man with a book | A passenger. | train |
| `ann` | Announcement | The station announcer (voice only). | train |
| `commuter` | Office worker | People coming in through the gate. | gate |
| `gatev` | The gate | The gate's recorded voice. | gate |
| `miotext` | Mio | Mio's text messages on Eric's phone. | gate |
| `sales1` | Man from Sales | In the lift down to B2. | lift |
| `sales2` | Woman from Sales | In the lift down to B2. | lift |

The id `kuroda` is Mr. Hamada. The id is older than the name and stays so the voice files keep working.

## People

**Eric** (the player). Age not decided. From Norway. He's here to help keep Amakawa's ancient systems running; the company won't replace them. Barely speaks Japanese. The island's old machines answer his spoken commands (kotodama) and nobody's; nobody knows why, Eric included.

**Mio** (25). Programmer on B2. Of the people Eric works beside on day 1, she's the only one with English (loose, learned from work and the internet). Dry, busy, keeps strangers at a distance and calls Eric 外人. Coming back from a night at her mother's on the mainland.

**Mr. Mori** (58). A former manager, now on the B2 team. Formal and kind, makes the tea. Opened the B2 copier's repair request in 1996. Japanese only.

**Kenji** (21). Two months on the team. Keen to help and easily distracted. A little school English he likes to practise.

**Emi** (32). B2's team lead. Native British English. At head office all of day 1 arguing for B2's parts budget; comes down to B2 at 17:40.

**Mr. Ishibashi** (64). The gate guard. Strict, fair, polite Japanese, no English.

**Mr. Hamada** (54). Accounts, 12th floor. Falls asleep on trains, is late through every gate, apologises constantly. Japanese only.

**Kuro** (玖路). The receptionist. Polite Japanese.

**Aoi**. A new hire on the train, telling someone on the phone that her assignment is decided today, anywhere but the basement. Japanese only.

**Tama**. A calico cat. Shows up on the train, at the gate and in the B2 machine room.

The B2 team is Eric, Mio, Mori and Kenji, with Emi as team lead.

## Names on screen

The name plate is the name on their lines. The label is the name over them when they can be talked to. "none" means there isn't one.

| Id | Place | Name plate | Label over them |
|---|---|---|---|
| `eric` | train | Eric | none |
| `eric` | gate | Eric | none |
| `eric` | office | Eric | none |
| `mio` | train | Mio | Mio |
| `mio` | office | Mio | Mio |
| `mori` | office | Mr. Mori | Mr. Mori |
| `kenji` | office | Kenji | Kenji |
| `emi` | office | Emi | Emi |
| `guard` | gate | Guard | Mr. Ishibashi |
| `kuroda` | train | Sleeping man | Sleeping man |
| `kuroda` | gate | Man from the train | Mr. Hamada |
| `kuro` | gate | Receptionist | Receptionist |
| `aoi` | train | Aoi | Aoi |
| `tama` | train | none | Cat |
| `tama` | gate | none | Tama |
| `tama` | office | none | Cat |
| `bun` | train | Woman with a bun | Woman with a bun |
| `youth` | train | Young man | Young man |
| `music` | train | Girl with headphones | Girl with headphones |
| `stander` | train | Man with a bag | Man with a bag |
| `reader` | train | Man with a book | Man with a book |
| `ann` | train | Announcement | none |
| `commuter` | gate | Office worker | none |
| `gatev` | gate | The gate | none |
| `miotext` | gate | Mio | none |
| `sales1` | lift | Man from Sales | none |
| `sales2` | lift | Woman from Sales | none |

## What they like

Gifts on day 1 are drinks from the vending machine: `coffee` (canned coffee), `tea`, `melon` (melon soda), `cornsoup` (canned corn soup). "Expects" is the Japanese they want to hear from Eric: `casual` or `polite`. "Gets on with" is one way: `likes` or `owes`.

| Id | Likes | Dislikes | Expects | Gets on with |
|---|---|---|---|---|
| `mio` | coffee | cornsoup, tea | casual | mori (likes) |
| `mori` | cornsoup | none | polite | mio (likes) |
| `kenji` | melon | none | casual | mori (likes), mio (owes) |
| `guard` | none | none | polite | none |
| `kuroda` | none | none | polite | guard (owes) |
| `kuro` | none | none | polite | none |
| `emi` | none | none | none | none |

## Portraits

The faces each person can show beside the text box. Files are `game3d/assets/portraits/<id>-<face>.webp`. Anyone not listed shows only a name plate.

| Id | Faces |
|---|---|
| `eric` | neutral, surprised, tired |
| `mio` | neutral, smile, deadpan, surprised, embarrassed, tired, phone |
| `mori` | neutral, smile, flustered |
| `kenji` | neutral, grin, sheepish |
| `emi` | neutral |
| `guard` | neutral, stern, amused |
| `kuroda` | neutral, sleepy, panicked |
| `kuro` | neutral |
| `aoi` | neutral |

Mio's `phone` face is her looking down at her phone (Jørgen asked for it as a portrait, not a phone icon). It's decided but the file hasn't landed; until it does the game shows her neutral face.

## Bodies in the world

Eric and Mio are Meshy models (game3d/assets/characters/, Mio's colours in game3d/js/mio.js). Everyone else is a chibi figure built in code (game3d/js/cast.js, game3d/js/train/people.js). Mori's Meshy model is built and loads only with `?cast3d=mori` until Jørgen approves it.

## In the code but not in day 1

People the game builds but doesn't use on day 1. Each has a reason to stay; anything else the game defines is drift and the check fails on it.

| Id | What it is | Why it's still there |
|---|---|---|
| `rei` | Rei, Sales. Her figure is built on the train, at the gate and in the office, and hidden all day. | Kept for a later day. On the train, Mio sits in her seat. |

## Open questions for Jørgen

Found while writing this page. The tables above say what the game does today; these are the places where that may not be what you want.

1. The guard's name plate says "Guard" and the label over him says "Mr. Ishibashi". Nobody says his name in dialogue. Same for Mr. Hamada at the gate ("Man from the train" on his lines, "Mr. Hamada" over his head). Should the player learn their names, and when?
2. The cat is labelled "Tama" at the gate and "Cat" on the train and in the office. Nobody tells Eric her name.
