# Cast

Every person and their id: the Everyone table, then one section per person with age, work, home, routine, who they know, how they talk and their approved look (hair, eyes, 3D colours). Then the names shown on screen, what each person likes (for gifts), which portrait faces each has, and people in the code but in no storyline. Last checked against the game on 2026-09-29.

Elsewhere: which storylines each person is in is in each storyline's Cast line ([stories/](stories/)); where the game puts people at each time of day is in [places.md](places.md); how to write their lines is in game3d/story/VOICE.md, and their voice settings in game3d/story/VOICE-DIRECTION.md; art history and candidates are in the bible. Ideas for later days (notes/walkthrough/) aren't facts until Jørgen decides them.

The tables are checked against the game by `node tools/facts/check.mjs`. Ids in backticks are the ids the story files use.

## Everyone

| Id | Name | Who they are |
|---|---|---|
| `eric` | Eric | The player. IT support engineer on a support contract, based on B2. |
| `mio` | Mio | B2's programmer. |
| `mori` | Mr. Mori | On the B2 team; used to be a manager. |
| `kenji` | Kenji | B2's newest engineer before Eric. |
| `emi` | Emi | B2's team lead. |
| `guard` | Mr. Ishibashi | The security guard at the head office gate. |
| `kuroda` | Mr. Hamada | Accounts, 12th floor. |
| `kuro` | Kuro | The receptionist in the head office lobby. |
| `aoi` | Aoi | A new hire. |
| `rei` | Rei | Sales. Not met on day 1. |
| `tama` | Tama | A calico cat. |
| `bun` | Woman with a bun | A monorail passenger. |
| `youth` | Young man | A monorail passenger. |
| `music` | Girl with headphones | A monorail passenger. |
| `stander` | Man with a bag | A monorail passenger. |
| `reader` | Man with a book | A monorail passenger. |
| `commuter` | Office worker | People coming in through the gate for work. |
| `sales1` | Man from Sales | Rides the lift to the 5th floor. |
| `sales2` | Woman from Sales | Rides the lift to the 5th floor. |
| `ann` | Announcement | The monorail's announcer (voice only). |
| `gatev` | The gate | The gate's recorded voice. |
| `miotext` | Mio | Mio's text messages on Eric's phone. |

The id `kuroda` is Mr. Hamada. The id is older than the name and stays so the voice files keep working.

## People

### Eric (`eric`)

- The player. From Norway. Age not decided (old prompts said 34 or 29).
- Work: IT support on B2, on a support contract to keep Amakawa's ancient systems running ([setting.md](setting.md)). Repair requests will take him all over the island.
- Home: moving to the island on day 1; his things were sent ahead. A company dorm room, the worst one, facing a concrete wall a couple of metres away (decided for the VN version, 2026-09-25): room 203 on 2F (built as `dorms`, [places.md](places.md)).
- Speaks English, and barely any Japanese: "arigatō" is about it. He can greet everyone from day 1 and learns greetings and simple phrases quickly; more Japanese opens up the other people (Jørgen, 2026-09-28). Tired, polite and dry.
- Kotodama works for him and nobody else ([setting.md](setting.md)).

### Mio (`mio`)

- Age 25. B2's programmer. Of the people Eric works beside, the only one with English (loose, learned from work and the internet).
- Home: on the island. Her mother lives on the mainland; Mio stays over sometimes and comes back on the monorail with a bag of her mother's pickles ("My mother thinks island has no food").
- Routine: looks after B2's old servers in the machine room, where she also eats lunch because "it's quiet, and nobody talks to me there". Hates bowing; that's why she's on B2. Anything reported broken goes on her list.
- Dry, low on energy, busy. Doesn't love strangers and keeps them at a distance, but won't let a teammate walk in unprepared and embarrass B2. On the train she's a little reluctant but gets Eric up to speed (Jørgen). She calls him 外人 consistently, the way you'd say "the new guy"; Mori corrects her to 外国の方.
- Knows: Mori (likes him), Kenji (barred him from the machine room).
- Look: approved portrait art/approved/mio/mio-after.webp. Hair dark green bordering on black, with lighter green underneath, as in the portrait (Jørgen). Eyes light tan, not brown; every expression keeps her exact glasses. 3D: Jørgen's Meshy model; game colours hair #13292f, underside and streaks #20a081, hoodie sampled from the portrait (approved, "yes this is sweet", commit df8f2f7).

### Mr. Mori (`mori`)

- Age 58. Used to be a manager; now on the B2 team. Formal and kind.
- Routine: makes the tea; has corn soup from a can every afternoon. Opened the B2 copier's repair request when he was new ([stories/copier.md](stories/copier.md)) and has said 動いて to it every morning since. Went to the Lillehammer Olympics in 1994 and does the ski jump with his hands.
- Speaks polite Japanese only. His warmth shows in what he does: bows, tea, making room.
- Knows: Mio (likes her; corrects her 外人 gently, the only time he interrupts).
- Look: chibi figure in code. His Meshy model (loads with `?cast3d=mori`) is parked (Jørgen, 2026-09-29, review mori-3d: "none of these").

### Kenji (`kenji`)

- Age 21. Two months on the team, the newest before Eric. Keen to help and easily distracted.
- Routine: lives on melon soda. His chair broke, so he borrowed Eric's and left it in the machine room.
- Speaks casual Japanese, and a little school English he likes to practise.
- Knows: Mori (likes him), Mio (owes her).
- Look: about 21, inexperienced, eager, easily distracted; varied looks but grounded, a junior IT support guy in work clothes (Jørgen, 2026-09-28). Approved portrait: h4, bedhead with an open smile (reviews/kenji-concept-3). Round 1 (hobby costumes) was rejected as "way out of whacko land... he is at work".

### Emi (`emi`)

- Age 32. B2's team lead. Native British English.
- On day 1 she is upstairs at head office all day, arguing for B2's parts budget, and comes down at 17:40 ([`emi-budget`](stories/emi-budget.md)).
- Quick and complete sentences; says the good news first and the problem as an aside.
- A cast member like any other, with no special restrictions: romance and rewards apply to her as to the rest (Jørgen, 2026-09-27).
- Look: approved portrait art/approved/emi/emi-after.webp (round 3 RDBT seed 41: auburn bob, clear tortoiseshell glasses, curvy, blazer and pencil skirt).

### Mr. Ishibashi (`guard`)

- Age 64. The security guard at the head office gate. Strict and fair.
- Routine: at his desk by the gate every morning, greeting people with おはようございます. Feeds a cat that, he says, is not there.
- Speaks polite, clipped Japanese and no English. Speaks with his hands when he has to, precisely.
- Look: approved portrait art/approved/ishibashi/ishibashi-after.webp.

### Mr. Hamada (`kuroda`)

- Age 54. Accounts, 12th floor.
- Lives on the island. Falls asleep on the monorail every time he comes back from the mainland, and is late through every gate. Apologises constantly and talks to machines like animals.
- Speaks Japanese only.
- Knows: the guard (owes him; the guard gets him through every morning).
- Look: chibi figure in code, and provisional portraits. "Hamada is fine" (Jørgen).

### Kuro (`kuro`)

- The receptionist in the head office lobby, behind the reception counter by the door (moved there from the station's visitor counter; Jørgen, 2026-09-30: "Then kuro should be there rather than at security"). Her name is written 玖路 and reads like 黒, black. Polite Japanese.
- Look: approved portrait art/approved/kuro/kuro-after.webp. Clear-lensed glasses, never tinted.

### Aoi (`aoi`)

- A new hire. Her assignment is decided today (day 1), and she's telling someone on the phone it can be anywhere but the basement. Japanese only.
- Look: approved portrait art/approved/aoi/aoi-after.webp.

### Rei (`rei`)

- Sales. Built in the game (figures on the train, at the gate and in the office) but hidden all day and in no storyline. Kept for a later day.
- Look: approved portrait art/approved/rei/rei-after.webp (silver ponytail, steel-grey eyes).

### Tama (`tama`)

- A calico cat who rides the monorail and gets off wherever she likes. Turns up on the train, by the guard's desk and asleep on Eric's chair in the B2 machine room. Her story: [`tama`](stories/tama.md).

### The others

The passengers, the office workers, the two from Sales, the announcer and the gate's voice are people with a day of their own; none of them know they're in Eric's story. They speak Japanese, which Eric hears as overheard speech ([systems.md](systems.md)).

The B2 team is Eric, Mio, Mori and Kenji, with Emi as team lead. Goro is a late-game character and not on day 1 (Jørgen).

## Names on screen

The name plate is the name above their lines; the label is the name over them in the world; the People panel is where people Eric has met are listed. "none" means there isn't one.

| Id | Name plate | Label over them | People panel |
|---|---|---|---|
| `eric` | Eric | none | none |
| `mio` | Mio | Mio | Mio |
| `mori` | Mr. Mori | Mr. Mori | Mr. Mori |
| `kenji` | Kenji | Kenji | Kenji |
| `emi` | Emi | Emi | Emi |
| `guard` | Guard | Guard | The guard |
| `kuroda` | Man from the train | Man from the train | Mr. Hamada |
| `kuro` | Receptionist | Receptionist | none |
| `aoi` | Aoi | Woman on her phone | none |
| `tama` | none | Cat | none |
| `bun` | Woman with a bun | Woman with a bun | none |
| `youth` | Young man | Young man | none |
| `music` | Girl with headphones | Girl with headphones | none |
| `stander` | Man with a bag | Man with a bag | none |
| `reader` | Man with a book | Man with a book | none |
| `commuter` | Office worker | none | none |
| `sales1` | Man from Sales | none | none |
| `sales2` | Woman from Sales | none | none |
| `ann` | Announcement | none | none |
| `gatev` | The gate | none | none |
| `miotext` | Mio | none | none |

### Where a name changes

| Id | Place | Name plate | Label over them |
|---|---|---|---|
| `mio` | train | Mio | Woman with a laptop (while `!mio_named`), else Mio |
| `kuroda` | train | Sleeping man | Sleeping man |
| `tama` | gate | none | Tama |

On the train Mio's lines are headed "Woman with a laptop" until she says her name.

## What they like

Gifts on day 1 are drinks from the vending machine ([systems.md](systems.md), Gifts). "Expects" is the Japanese they want from Eric: `casual` or `polite`. "Gets on with" is one way: `likes`, `owes` or `rivals`.

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

The faces each person can show beside the text box: `game3d/assets/portraits/<id>-<face>.webp`. Anyone not listed shows only a name plate. Which of these are approved: [art-and-sound.md](art-and-sound.md).

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

Mio's `phone` face is her looking down at her phone, a dialogue portrait of its own (Jørgen asked for it instead of a timed phone icon). Approved 2026-09-29 (reviews/mio-phone-5).

## In the code, in no storyline

People the engine defines that no storyline uses.

| Id | What it is | Why it's there |
|---|---|---|
| `yui` | A speaker and a hidden figure at the B2 copier (to remove). | Left from before the B2 team was settled; the office no longer has them (game3d/story/REQUESTS.md, done). |
| `sota` | A speaker and a hidden figure at the B2 coffee machine (to remove). | Same. |
| `nao` | A speaker and a hidden figure at a B2 desk (to remove). | Same. |
| `hiro` | A speaker and a hidden figure at a B2 desk (to remove). | Same. |
| `kanae` | A speaker only. | Added for an earlier day-1 draft; nothing uses it now. Kanae is in the wider cast (bible). |
| `reitext` | A speaker only: Rei's text messages. | Added for an earlier day-1 draft; nothing uses it now. |

## Open questions for Jørgen

1. Nobody says the guard's or Mr. Hamada's name out loud. The game calls them "Guard" and "Man from the train" on screen, and "The guard" and "Mr. Hamada" in the People panel (Hamada's name is only on the crackers card and in Mori's 浜田さん). Should the player learn their names, and when?
2. The cat is labelled "Tama" at the gate and "Cat" on the train and in the office. Nobody tells Eric her name, though her name is the first in the visitor book.
3. In the office, Mio's afternoon spot is `emi_seat` and the game's `mio_seat` is the same chair: Mio and Emi share one desk. Is that meant?
