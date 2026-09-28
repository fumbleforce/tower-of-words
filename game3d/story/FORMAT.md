# Story format for game3d

The engine (game3d/js) owns the places, people, objects, camera and effects. The story files own every word anyone says. This page is the contract between the two.

Files: `game3d/story/train.js`, `game3d/story/gate.js`, `game3d/story/office.js`, and `game3d/story/transitions.js`. Each is a plain ES module with one default export. Until a file exists, the engine uses its own placeholder in `game3d/story/placeholder/` (same format). Check a file with `node --check game3d/story/train.js`, and run `node game3d/tools/story-check.mjs` to catch unknown ids, missing nodes and bad conditions.

## Shape of a file

```js
export default {
  // optional: names and roles for this file's speakers (merged over the defaults below)
  speakers: {
    aoi: { name: 'Aoi', role: 'sales, second year' },
  },

  // runs when the place begins (after the transition into it)
  start: 'intro',

  // what runs when the player does something (see Triggers)
  on: {
    'talk:aoi': [{ if: '!metAoi', node: 'aoi_first' }, 'aoi_again'],
    'say:matte:doors': 'doors_hold',
    'near:tama': { node: 'cat_notice', once: true },
    'event:arrived': 'arrival',
  },

  // optional: when a marker shows over a person or object, and when it is highlighted as the next goal
  show: { kuroda: 'kurodaArrived' },
  goal: { reader_r: 'guardAskedCard && !gateOpen' },

  // optional: the label shown over an object (defaults are in the lists below)
  labels: { bowl: "Tama's bowl" },

  nodes: {
    intro: [
      { do: 'goal', text: 'Ride to {honsha}.' },
      '> The train hums across the bay.',
      'aoi: Oh! You have the new-hire lanyard.',
      'aoi: Sit, sit. It is a long bridge.',
      { choice: [
        { text: 'Sit next to her', go: 'aoi_sit' },
        { text: 'Stay standing', go: 'aoi_stand', set: 'standing' },
      ] },
    ],
    // ...
  },
};
```

## Steps

A node is a list of steps, run in order.

| Step | Meaning |
|---|---|
| `'aoi: text'` | A line. The id before the first `: ` is the speaker; the name and role show above the text. |
| `'> text'` | Narration (no speaker). Short and in the second person. |
| `'mio: text'` | Mio speaks (she's the player; use sparingly). |
| `{ say: 'aoi', text: '...', voice: 'aoi-hi' }` | A line with a voice clip (game3d/audio/<voice>.mp3). Use the long form only when you need extra fields. |
| `{ choice: [ {...}, ... ], prompt: 'optional line shown above the buttons' }` | Reply buttons. Each option: `text` (what Mio says or does), and any of `go` (jump), `call` (run a node, then carry on after the choice), `set`, `if` (option only shows when true). |
| `{ offer: 'matte', line: 'aoi: Shout {matte}!', voice: 'aoi-matte' }` | Hands Mio a command: the line, then one big button with the Japanese, reading and English. When tapped, Mio says it (voiced) and the command is learned (first time). Carries on after. |
| `{ learn: 'kite' }` | Mio picks up a command without saying it (e.g. Emi says "来て" and Mio just follows). Shows the "New command" note. |
| `{ set: 'flag' }`, `{ set: { flag: 3 } }`, `{ unset: 'flag' }`, `{ inc: 'counter' }` | Flags. They are shared by all three places. |
| `{ if: 'expr', then: [steps], else: [steps] }` | Branch. |
| `{ go: 'node' }` | Jump to another node (the rest of this node is skipped). |
| `{ call: 'node' }` | Run another node, then come back. |
| `{ wait: 800 }` | Pause in milliseconds. |
| `{ do: 'hook', ...args }` | An engine action (lists below). |
| `{ end: true }` | Stop this node here. |

Text: plain English. Japanese words go in braces and always show with reading and English, e.g. `{matte}` shows as 待って (matte, wait). Known ids: `matte`, `akete`, `kite`, `ugoite`, `honsha`, `tsugiwa`. Ask for more in REQUESTS.md. Lines can be as long as a comfortable two or three lines on a phone; there is no limit on how many lines a node has. The player taps to go on, so there is no timed read speed.

Conditions (`if`, `show`, `goal`, trigger `if`): flag names with `!`, `&&`, `||`, parentheses, and comparisons with numbers (`coffees >= 2`). Unset flags are false/0. Built-in flags: `know_matte`, `know_akete`, `know_kite`, `know_ugoite` (true once learned), `talked_<id>` (true after the first `talk:<id>` trigger has run), `place` (`'train'`, `'gate'`, `'office'`).

## Triggers (`on`)

| Key | When |
|---|---|
| `talk:<id>` | The player taps the person or object, or presses E/Space beside it. Mio walks up first. |
| `say:<cmd>:<id>` | Mio says a command (`matte`, `akete`, `kite`, `ugoite`) while that person or object is the nearest target. |
| `say:<cmd>:*` | Fallback for that command anywhere in this place. With no match at all, the engine uses a small built-in joke. |
| `near:<id>` | Mio walks within about one step of it (checked every frame; use `once: true` for a one-off). |
| `zone:<zone>` | Mio steps into a named zone (per place, below). |
| `event:<name>` | Engine events (per place, below). |

A trigger value is a node name, `{ node, if, once }`, or a list of these; the first one whose `if` holds runs. While a node runs, the player can't walk and the markers hide.

## Speakers (defaults)

`mio`, `aoi`, `kuroda`, `guard` (Mr. Ishibashi), `kuro` (receptionist), `emi`, `mori`, `kenji`, `yui`, `sota`, `nao`, `hiro`, `ann` (station or lift announcement), `reader`, `music`, `bun`, `youth`, `stander`, `commuter`. Add names, roles or new speakers under `speakers`. A new speaker can talk, but only the people listed below have a body in a place; ask in REQUESTS.md for new bodies.

## Hooks that work everywhere

| Hook | Args | Does |
|---|---|---|
| `goal` | `text` | Sets the goal line top left (`text: ''` clears it). |
| `hint` | `text` | A short hint at the bottom for a few seconds. |
| `walk` | `who`, `to` (a spot id or `[x, z]`), `wait: true/false` | A person walks there (Mio too: `who: 'mio'`). |
| `face` | `who`, `to` (id or `[x, z]`) | Turns someone toward a person, spot or object. |
| `sit` / `stand` | `who`, `at` (seat id) | Sits someone down (Mio included) or stands them up. |
| `look` | `who`, `at` | Head turn only. |
| `cam` | `on` (id), `zoom` (1 to 2.5), `back: true` | Moves the camera in on a person or spot for a conversation, and back. |
| `sound` | `name`: `chime`, `ok`, `no`, `door`, `lift`, `word`, `beep`, `brake`, `crowd` | A sound. |
| `voice` | `key` | Plays game3d/audio/<key>.mp3. |
| `emote` | `who`, `kind`: `!`, `?`, `…`, `♪`, `heart`, `sweat` | A small bubble over a head. |
| `show` / `hide` | `id` | Shows or hides a person or object. |
| `bow` | `who` (anyone, `eric` too), `depth: 'small'|'deep'` | A bow, shown. |
| `gesture` | `who`, `kind: 'nine'|'point'|'shrug'|'finger'|'skijump'` | Arm moves for the chibi cast: nine fingers up (with a 9 bubble), point, shrug, finger to the lips, Mori's ski jump. |
| `type` | `word`, `prompt` (optional line shown above it) | The typing prompt for a new word: shows the Japanese, the romaji letter by letter and the English, and Eric types the romaji (forgiving: case, spaces, hyphens, long vowels ō = ou = oo = o). Letters light up as they're typed; a wrong Enter shows the next letter, and after three tries the whole romaji. Works with the phone keyboard. On success Eric says it (voiced), it becomes a known word (it stays sharp in overheard lines from then on) and flag `typed_<word>` is set. Use it where a word is taught, in place of a "say it" button. Any word id works: `{ do: 'type', word: 'yoroshiku', prompt: 'mio: Say it. Like this.' }` |
| `next` | | Starts the transition to the next place (see Transitions). |
| `end` | | The end card (office only). |

## Places

Coordinates: x runs left to right on screen, z runs from the back (negative) toward the camera (positive); units are about a metre and a half. People are about 1.15 tall.

### Train (`train`)

The car from side/train, crossing the bay; the camera looks at it from the platform side. The car is about 8 long (x -4 to 4) and 2.4 wide (z -1.2 far seats to +1.2 near seats). Sliding doors at the near-side corners (x -3.5 and x 3.5).

People (ids, where they are):
- `aoi`: pink hair, far bench, x -1.7 (on her phone).
- `kuroda`: salaryman asleep, far bench, x -2.55.
- `reader`: glasses, reading a book, far bench, x 1.05.
- `music`: cap and headphones, nodding, far bench, x 2.5.
- `stander`: man standing by the far right corner with a bag.
- `bun`: woman with a bun on the near bench, x -2.5 (seen from behind).
- `youth`: young man with olive hair on the near bench, x 2.55 (seen from behind).
- `tama`: the calico cat, far bench, x -0.85.

Objects: `doors` (both door pairs), `door_l`, `door_r`, `plant`, `bags`, `rack`, `straps`, `window`, `poster`, `sign` (the station sign, visible when stopped), `platform`.

Seats for `sit`: `seat_aoi` (right beside Aoi, far bench x -1.25; the tote there moves), `seat_far_r` (far bench x 1.6), `seat_near_l` (near bench x -1.3), `seat_near_r` (near bench x 1.4). Spots for `walk`: `aisle`, `door_l`, `door_r`, `by_aoi`, `by_kuroda`.

Zones: `door_zone` (either door, only while the doors are open).

Events: `start`, `approach` (the train starts slowing for the station, fired when the story runs `{ do: 'arrive' }`), `arrived` (stopped, doors open), `chime` (door-closing chime starts, fired by `{ do: 'chime' }`).

Place hooks:
- `announce` `text`, `voice`: the LED board at the top with the station announcement (`text: ''` hides it).
- `arrive`: the train brakes and pulls into the company station (about 8 s), then fires `event:arrived`.
- `doorsOpen`, `doorsClose`, `chime` (starts the closing chime; the doors start closing after about 3 s unless `doorsHold` runs), `doorsHold` (the doors stop halfway and stay).
- `wake` `who`: a sleeper jolts awake.
- `catTo` `to`: Tama hops down and trots to a spot or person.
- `bag` `state: 'slide'|'caught'|'dropped'`: Mio's bag of food on the free seat beside her slides off, is caught back onto the seat, or lands on the floor.

### Gate (`gate`)

The company lobby, muted palette. About 12.6 wide (x -6.3 to 6.3) and 9 deep (z -4.5 back wall to +4.5 entrance). Glass entrance doors at the bottom centre. The barrier runs across at z -0.55 with two card readers (x -0.93 and 0.93) either side of the scanner arch (x 0), which has two glass flaps. The guard desk sits in the barrier line on the right (x 1.2 to 3.2). The lift bank (two lifts) is on the back wall, past the barrier.

People:
- `guard`: Mr. Ishibashi, seated behind his desk (2.35, -1.2).
- `aoi`: comes in with Mio; her default place is the right bench (3.6, 1.2).
- `kuroda`: comes in late through the entrance when the story runs `{ do: 'enter', who: 'kuroda' }`.
- `kuro`: the receptionist, behind the visitor counter on the left (-4.3, 0.1).
- `tama`: the cat, by the guard desk (3.45, -0.15), eating.
- Commuters walk in, tap through the gate and take the lifts on their own (not tappable). `{ do: 'rush', on: true/false }` turns the morning rush up or down.

Objects: `reader_l`, `reader_r`, `gate` (the arch and flaps), `desk` (guard desk), `counter` (visitor counter), `signin` (visitor book on the counter), `lostfound` (lost-and-found shelf by the counter), `screen` (notice screen on the back wall), `kiosk` (coffee vending machine, front right), `bench_l`, `bench_r`, `poster_l`, `poster_r`, `lift` (the lift bank), `entrance`, `plant`, `bowl` (Tama's).

Spots: `entrance_in`, `bench_l`, `bench_r`, `before_gate`, `after_gate`, `lift_front`, `counter_front`, `desk_front`.

Zones: `arch` (walking into the gate), `past_gate`, `lift_front`.

Events: `start`, `card_red` (Mio holds her card to a reader before it works), `card_ok`, `arch_blocked` (walks into the closed gate), `gate_opened`.

Place hooks:
- `reader` `side: 'l'|'r'`, `state: 'red'|'green'|'idle'`: the reader's light and beep.
- `gate` `state: 'open'|'closed'|'jam'|'slam'`: the flaps (`jam` rattles, `slam` bursts open and bounces).
- `cardOk`: Mio's card now works; her next tap turns the reader green and opens the gate.
- `enter` `who`: someone walks in through the entrance.
- `typing` `who`, `ms`: typing animation (the guard at his computer). (Renamed from `type`, which is now the typing prompt below.)
- `rush` `on`: commuters on or off.
- `liftOpen` / `liftClose`: one of the lifts opens.

### Office (`office`)

Third floor, one compact rectangle (x -7 to 7, z -6.4 to 6.4). Top row, left to right: lift lobby (with the stairwell behind it), the main office 企画室 (one island of six desks and the section chief's desk across its head), the machine room 機械室. A corridor runs right across the middle (z 0.2 to 2.4), with the fire exit at its right end. Bottom row: copy room コピー室, kitchenette 給湯室 (its door faces the office door), men's and women's toilets.

People:
- `emi`: waiting by the lift (-5.3, -1.35); her desk is the south row, left (-2.0, -2.4), next to Mio's.
- `kenji`: north row, left desk, facing the camera.
- `nao`: north row, middle desk, headphones.
- `hiro`: south row, right desk, on the phone.
- `mori`: section chief, at the head of the island (2.2, -3.4), facing along it.
- `yui`: at the copier in the copy room (-2.95, 3.55).
- `sota`: at the coffee machine in the kitchenette (1.05, 3.5).

Objects: `lift`, `vending`, `bench`, `stairs`, `office_door`, `inout_board`, `clock`, `whiteboard`, `calendar`, `water_cooler`, `cabinets`, `fan`, `coat_rack`, `boxes`, `my_desk` (south row, middle, name card ミオ), `my_chair` (starts in the copy room), `chief_desk`, `machine_door`, `racks`, `fire_exit`, `noticeboard` (corridor), `extinguisher`, `hydrant`, `copier`, `fax`, `paper_shelf`, `worktable`, `coffee_machine`, `kettle`, `fridge`, `microwave`, `kitchen_table`, `toilet_m`, `toilet_f`, `plant`.

Spots: `lift_out`, `lobby`, `office_door`, `my_seat`, `emi_seat`, `copier_front`, `coffee_front`, `corridor_w`, `corridor_e`, `machine_front`.

Zones: `office`, `copy_room`, `kitchen`, `machine_room`, `corridor`, `toilets`.

Events: `start`, `sat_down`.

Place hooks (the unlock effects):
- `copier` `state: 'jam'|'run'|'wild'|'idle'`: `run` prints a neat stack, `wild` sprays paper.
- `chairRoll` `to`: Mio's chair rolls itself to a spot (e.g. `my_seat`).
- `coffee`: the coffee machine brews.
- `machineDoor` `state: 'open'|'closed'`.
- `vendingDrop`: a can drops out.
- `clockStop` `ms`: the wall clock's second hand stops for a while.
- `fan` `state: 'on'|'off'|'wild'`.
- `liftOpen` / `liftClose`.
- `sitDown`: Mio sits at her desk (fires `event:sat_down`).

## Done from REQUESTS.md (engine side)

- Words: `ohayo`, `yoroshiku`, `otsukare`, `kotodama`. Speakers: `rei`, `kanae`, `sales1`, `sales2`, `gatev`, `reitext` (shown as a text message on a light card).
- Train: `rei` has a body on the far bench at x 2.1 with a laptop; `music` is gone. Her folder and a lidded coffee (`cup`) are on `seat_far_r`; sitting Mio there moves them. Hook `cup` `state: 'tip'|'safe'` (`safe` puts it upright in Rei's hand). Bags sit on `seat_aoi`, `seat_near_l` and `seat_near_r` (sitting there moves the bag). `hide` also hides the person's floor shadow.
- Gate: `rei` has a body (walks in with Mio when she's in `with`). `aoi` starts seated on `bench_r` behind an upside-down newsletter (hook `newsletter` `state: 'down'|'up'`). `catTo` works (crossing the barrier flashes the gate red). One commuter carries a cake box. `with` entries can be conditional: `with: [{ who: 'aoi', if: 'aoi_with' }]`.
- Lift: the ride starts at 1. Put `{ do: 'floor', to: '5' }` steps in `ride` to move the counter one floor at a time (`B2`, `B1`, `1` ... `5`), and `{ do: 'liftDoors', state: 'open'|'closed' }` for the doors' sound. If the ride doesn't end on B2, the engine finishes the count to B2. The office is on B2 (plates B2 and 企画室７).
- Office: `yui`, `sota`, `nao`, `hiro` are gone. `aoi` has a hidden body at the lift (`show`, then `walk` from `lift_out`). Three desks have cloth over their monitors: ids `covered` (north middle) and `covered_monitor` (south right). New ids `box_crowns`, `cups`, `nameplate`. `my_chair` starts in the machine room with `tama` asleep on it; `chairRoll` carries her along; `catTo` lifts her off and walks her (spots or ids, e.g. `catTo` `to: 'my_desk'`). `mori` can `walk` anywhere (people route through doors and the corridor on their own).

## Done from REQUESTS.md, round two

Commands `irete` 入れて, `dashite` 出して, `tomatte` 止まって (voiced). Rei has a hidden body in the office (`show`/`walk`/`hide`, or the schedule). Bonds fire when a level is crossed, not only hit. `{ say: 'rei', name: 'Woman in white', text }` overrides the name for one line. `newsletter` `up`/`down` (the right way up now). Office hooks `kettle` `state: 'pour'` (steam) and `rackAlarm` `state: 'on'|'off'` (blinking light and beeps). Items: `tea` is royal milk tea. Speaker `kuroda` shows as Mr. Hamada.

## Portraits (VN style)

The speaker's approved portrait shows beside the text box (desktop: large at the left; phone: smaller, above the box). Eric's shows smaller on the right on his lines, and the listener dims. Narration shows none. Faces that exist: only `neutral`, for `mio`, `aoi`, `eric` and `kuro` (cut-outs of the approved bible portraits). The old smirk/suspicious/panic sprites were old art and are gone; new expressions will be repainted from the approved portraits later. Face steps are kept and fall back to neutral until then.
Everyone else (Mori, Kenji, Hamada, the guard and the rest) has no approved art yet and shows just the name plate. Once more faces exist: set one on a line with the long form `{ say: 'mio', face: 'smirk', text: '...' }` (it stays until changed), or with `{ do: 'expression', who: 'mio', face: 'suspicious' }`; the `emote` hook also picks one when it fits (`?` suspicious, `!` panic, `♪`/`heart` smirk).

## Eric, Mio, phrases and overheard Japanese (the new premise)

- The player is Eric (speaker id `eric`, shown as "Eric · you"). In hooks, `who: 'eric'` (or `'player'`) moves him. `sit` with `who: 'eric'` sits him (train seats, office `my_seat`).
- Mio is an NPC with a body in every place (Jørgen's Meshy model). Speaker and id `mio`: `talk:mio`, `say:<word>:mio`, `walk`, `face`, `sit` (any seat id), `show`/`hide`, `with` in transitions. She is hidden until shown, except on the train, where she starts seated on the far bench (x 2.1, `seat_mio`) with her laptop, beside the free seat `seat_far_r`. `labels: { mio: '...' }` renames her marker.
- Phrases: `ohayo` おはようございます, `yoroshiku` よろしくおねがいします, `sumimasen` すみません. Learn them with `{ learn: 'ohayo' }` (or `offer`). They sit in the Say menu above the commands and trigger `say:<phrase>:<id>`, exactly like commands (voiced by Eric). Commands: `matte`, `akete`, `kite`, `ugoite`, `irete`, `dashite`, `tomatte`.
- The Say button is taught automatically: the first time Eric learns any word (`type`, `learn` or `offer`), the button pulses and a tip explains it. Whenever a goal marker answers to a word Eric knows (a `say:<word>:<id>` trigger on a goal), the button lights up. So put the first `type` where Eric can use the word right after, and mark the thing waiting on a word as a goal.
- Words count as known only once taught in play: through `type`, `learn`/`offer`, or a glossed `{id}` in a normal line. Nothing is known at the start. `clear` entries in an overheard line are readable for that line only (plain, not styled as known) and don't become known.
- Overheard Japanese: `{ say: 'guard', overheard: true, text: '日本語の文。', clear: ['B2', { ja: 'コンサルタント', ro: 'konsarutanto', en: 'consultant' }] }`. The text is the Japanese itself. Every character Eric doesn't know shows as a soft, shifting stand-in glyph; his phrases and commands, and the `clear` entries, stay sharp (with reading and English when given). The voice plays muffled through a low-pass filter. Voice clips for overheard lines are generated from the text by `tools/voices.py` (run it after adding lines; no `voice` key needed). Only the long form supports `overheard`. Words shown glossed in ordinary lines (for example `{gaijin}` 外人, gaijin, foreigner) are remembered, and stay sharp in later overheard lines too.

## Sim data (clock, schedules, ambient talk, bonds, gifts, save)

All optional, all per story file, all generic so they carry over to later days.

```js
export default {
  // who they are, for the People panel (shown once Mio has talked to them)
  people: { rei: { name: 'Rei', about: 'Sales, fifth floor. Short sentences.', color: '#c9ced8' } },
  // where people are in each period ('*' = any period); `at` is a spot, object id or [x, z]; `sit` a seat id;
  // `hide: true` takes them out of the place. Applied when a place starts and whenever the period changes.
  schedule: { mori: { morning: { at: 'chief_desk' }, lunch: { at: 'coffee_front', face: 'coffee_machine' } } },
  // NPC-to-NPC talk that plays as captions (no tapping) when Mio comes within `radius` (default 2.4) of `near`
  // (or the first person in `who`). once: true by default. `set` sets a flag when it has played.
  ambient: [{ id: 'kenji_mori', who: ['kenji', 'mori'], period: 'morning', if: '!copies', lines: ['kenji: ...', 'mori: ...'], set: 'heard_km' }],
  // scenes that run when a bond first reaches a level
  bonds: { rei: [{ at: 3, node: 'rei_bond3' }] },
  on: {
    'give:coffee:mori': 'mori_coffee',   // Mio gives an item (Give button next to Say, when a person is near)
    'give:*:kenji': 'kenji_any_gift',    // any item
  },
};
```

Hooks: `period` `to: 'commute'|'morning'|'lunch'|'afternoon'|'evening'` (the HUD shows "Thu 1 Oct · Morning at work"; only the story moves it), `bond` `who`, `add` (default 1; flag `bond_<who>` holds the level), `meet` `who` (adds them to People; tapping a person does this too), `buy` `item` (`coffee`, `tea`, `melon`, `cornsoup`; ¥1000 to start; sets `bought_<item>`, or `cant_buy`), `take` `item`, `save`. A given item is removed from the bag and sets `gave_<item>_<who>`. Commands record who taught them (the speaker of the `offer` line, or `from:` on `offer`/`learn`), shown in People. The game saves flags, bonds, period, bag, commands and place at every place change and on `save`; the title offers Continue.

## Transitions (`transitions.js`)

There are no cuts to black between places. Each move is one continuous trip, and each has an optional dialogue slot.

```js
export default {
  train_to_gate: {           // Mio steps out, walks along the platform to the covered walkway, and in through the lobby doors
    walk: ['aoi: This way, the walkway is warmer.'],   // lines while walking (auto, no tap needed, about 3 s each)
    arrive: [],              // steps run as she comes in through the glass doors, before the gate scene's start node
    with: ['aoi'],           // who walks with her into the next place (only people who exist in both)
  },
  gate_to_office: {          // into the lift, doors close, the floor indicator counts 1 to 3, doors open on the office lift lobby
    ride: ['kuroda: Third floor? Planning. Good luck.'],  // lines during the ride (tap to go on; the ride waits for them)
    with: [],
  },
};
```

`walk` lines show on their own and don't stop the walk; `ride` and `arrive` are normal steps and wait for taps. Flags work in all of them (use `{ if: ... }` steps).


### Music
Each place has its own loop (train calm, gate lively, office office; after work, night). Voices duck it. To change it in a scene: `{ hook: 'music', name: 'night' }` (`calm`, `office`, `lively`, `night`, or `null` for silence).
