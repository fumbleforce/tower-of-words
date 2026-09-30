# Story format for game3d

The engine (game3d/js) owns the places, people, objects, camera and effects. The story files own every word anyone says. This page is the contract between the two: how to write a story file, and the steps, triggers and hooks the engine runs.

What the game has (the people and their ids, the things, spots, seats and zones in each place, the words, the storylines, how the systems behave, which portraits exist) is in docs/game/. Read those for ids; this page only says how to use them.

Files: `game3d/story/train.js`, `game3d/story/gate.js`, `game3d/story/office.js`, and `game3d/story/transitions.js`. Each is a plain ES module with one default export. Until a file exists, the engine uses its own placeholder in `game3d/story/placeholder/` (same format). Check a file with `node --check game3d/story/train.js`, run `node game3d/tools/story-check.mjs` to catch unknown ids, missing nodes and bad conditions, and `node tools/facts/check.mjs` to check it against docs/game/.

## Shape of a file

```js
export default {
  // optional: names and roles for this file's speakers (merged over the engine's defaults)
  speakers: {
    guard: { name: 'Guard' },
  },

  // runs when the place begins (after the transition into it)
  start: 'lobby_in',

  // what runs when the player does something (see Triggers)
  on: {
    'talk:guard': [{ if: '!greeted_guard', node: 'guard_look' }, 'guard_again'],
    'say:akete:gate': { if: 'jammed', node: 'word_say' },
    'near:tama': { node: 'cat_notice', once: true },
    'event:card_red': 'card_red',
  },

  // optional: when a marker shows over an object (people always have theirs), and when it is highlighted as the next goal
  show: { kuroda: 'jammed' },
  goal: { reader_r: 'greeted_guard && !guard_asked' },

  // optional: the label shown over a person or object, over the engine's; [text, condition] shows text while
  // the condition holds and the engine's label after
  labels: { signin: 'Visitor book', mio: ['Woman with a laptop', '!mio_named'] },

  nodes: {
    lobby_in: [
      { do: 'goal', text: 'Say good morning to the guard.' },
      { say: 'guard', overheard: true, emo: 'polite', text: '{ohayo}。' },
      'eric: Hi. Um... good morning?',
      { choice: [
        { text: 'Sit on the bench', go: 'bench' },
        { text: 'Wait by the gate', go: 'wait', set: 'standing' },
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
| `'mio: text'` | A line. The id before the first `: ` is the speaker; the name and role show above the text. |
| `'> text'` | Narration (no speaker). Short, second person, only for what the scene can't show. |
| `{ say: 'mio', text: '...', emo: 'dry', face: 'smile', voice: 'key' }` | The long form of a line: `emo` is the voice direction tag (VOICE-DIRECTION.md), `face` the portrait (see Portraits), `voice` a clip (game3d/audio/<voice>.mp3) when it isn't found by the line's text. `name` overrides the name for this line (`{ say: 'mio', name: 'Woman with a laptop', text }`). `slow: true` marks the slow repeat of a new word. `overheard` and `clear`: see Overheard Japanese. |
| `{ choice: [ {...}, ... ], prompt: 'optional line shown above the buttons' }` | Reply buttons. Each option: `text` (what Eric says or does), and any of `go` (jump), `call` (run a node, then carry on after the choice), `set`, `if` (option only shows when true). |
| `{ offer: 'matte', line: 'mio: Shout {matte}!' }` | Hands Eric a word: the line, then one big button with the Japanese, reading and English. When tapped he says it (voiced) and it's learned. Carries on after. `from:` names who taught it. |
| `{ learn: 'kite' }` | Eric picks up a word without saying it. Shows the "New word" note. Takes `from:`. |
| `{ set: 'flag' }`, `{ set: { flag: 3 } }`, `{ unset: 'flag' }`, `{ inc: 'counter' }` | Flags. They are shared by all places. |
| `{ if: 'expr', then: [steps], else: [steps] }` | Branch. |
| `{ go: 'node' }` | Jump to another node (the rest of this node is skipped). |
| `{ call: 'node' }` | Run another node, then come back. |
| `{ wait: 800 }` | Pause in milliseconds. |
| `{ do: 'hook', ...args }` | An engine action (lists below). |
| `{ end: true }` | Stop this node here. |

Text: plain English. Japanese words go in braces as word ids and always show with reading and English, e.g. `{matte}` shows as 待って (matte, wait). The ids are in docs/game/words.md; ask for new ones in REQUESTS.md. Lines can be as long as a comfortable two or three lines on a phone. The player taps to go on, so there is no timed read speed.

Conditions (`if`, `show`, `goal`, trigger `if`): flag names with `!`, `&&`, `||`, parentheses, and comparisons with numbers (`coffees >= 2`) or strings (`gift_mio == 'like'`). Unset flags are false/0. Built-in flags: `know_<word>` (true once learned), `typed_<word>`, `talked_<id>` (true after the first `talk:<id>` trigger has run), `place` (`'train'`, `'gate'`, `'office'`), and the sim flags under Sim data.

## Triggers (`on`)

| Key | When |
|---|---|
| `talk:<id>` | The player taps the person or object, or presses E/Space beside it. Eric walks up first. |
| `idle:<person>` | Talking to a person when no `talk:<person>` entry holds right now (see Idle lines below). |
| `say:<word>:<id>` | Eric says a phrase or command from the Say menu while that person or object is the nearest target. |
| `say:<word>:*` | Fallback for that word anywhere in this place. With no match at all, the engine uses a small built-in reaction. |
| `give:<item>:<id>`, `give:*:<id>` | Eric gives an item (the Give button, next to a person). See Sim data. |
| `near:<id>` | Eric walks within about one step of it (checked every frame; use `once: true` for a one-off). |
| `zone:<zone>` | Eric steps into a named zone (docs/game/places.md). |
| `event:<name>` | Engine events (per place, below). |

A trigger value is a node name, `{ node, if, once }`, or a list of these; the first one whose `if` holds runs. While a node runs, the player can't walk and the markers hide.

### Idle lines (`idle:<person>`)

Every person with a body can always be talked to (Jørgen, 2026-09-30: "All people should always be interactable, but dont necessarily need to say that much interesting"); `show` never hides a person. When no `talk:<person>` entry holds, the engine runs `idle:<person>` from the story file of the place they're in. It is a normal trigger: pick the moment with `if` on the goal's flags or on the period (`period == 'lunch'`), first match wins, and end the list with a plain node as that person's default. With nothing that holds, they turn to Eric and nod.

```js
'idle:mio': [
  { if: 'got_ticket && !copier_done', node: 'idle_mio_copier' },
  { if: "period == 'lunch'", node: 'idle_mio_lunch' },
  'idle_mio',
],
```

An idle node is a line or two, voiced like any other, and doesn't move the story on: no `goal`, `next`, `trip`, `end`, `hold`, `type`, `kotodama`, `choice`, `offer` or `go` (story-check refuses them). It may `set` a flag. Mio's go in each place's file; the people with a body in each place are in docs/game/places.md (Who's there when).

## Speakers

Any id in docs/game/cast.md "Everyone" can speak. Add names or roles under `speakers`. A new speaker can talk, but only people with a body in a place (docs/game/places.md, Who's there when) can be shown, walked or tapped; ask in REQUESTS.md for new bodies. The player is `eric` (`who: 'eric'` or `'player'` in hooks). A speaker with `phone: true` (e.g. `miotext`) shows as a text message on its own dark card.

## Hooks that work everywhere

| Hook | Args | Does |
|---|---|---|
| `goal` | `text`, `at` (optional seat, spot, id or `[x, z]`), `side: true` | Sets the goal line top left (`text: ''` clears it). `at` puts the goal's teal pin there until the next goal (a thing or person with a pin just becomes the goal; a seat gets a "Free seat" pin, and tapping it walks Eric to the floor in front of it). `side: true` sets the small side line under it instead. |
| `hint` | `text`, `what: 'say'` (optional) | A tip, shown as the second line of the goal box until closed or the goal moves on. `what: 'say'` points at the Say button. |
| `walk` | `who`, `to` (a spot id, a person or object id, or `[x, z]`), `wait: true/false`, optional `speed` (units a second; Mio's default is 1.0) | A person walks there. People route through doors and corridors on their own. |
| `face` | `who`, `to` (id or `[x, z]`) | Turns someone toward a person, spot or object. |
| `sit` / `stand` | `who`, `at` (seat id) | Sits someone down (Eric included) or stands them up. |
| `look` | `who`, `at` (a person, spot, seat, thing or `[x, z]`) | Head turn only, held over the person's idle until the scene or place clears it. Works on every chibi (train passengers, the lift riders, the gate and office cast). |
| `cam` | `on` (id or `[x, z]`), `zoom` (1 to 2.5), `back: true` | Moves the camera in on a person or spot for a conversation, and back. |
| `sound` | `name`: `chime`, `ok`, `no`, `door`, `lift`, `word`, `beep`, `brake`, `crowd` | A sound. |
| `voice` | `key` | Plays game3d/audio/<key>.mp3. |
| `emote` | `who`, `kind`: `!`, `?`, `…`, `♪`, `heart`, `sweat`, `zzz`; `ms` | A bubble over a head. |
| `expression` | `who`, `face` | Sets someone's portrait face (see Portraits). |
| `show` / `hide` | `id` | Shows or hides a person or object (and a person's floor shadow). |
| `hold` | `who` (a person), or nothing to let go | Keeps Eric with that person until the story lets go: walking and taps on anything else only get a small bow from them; that person and Say still work. Only holds once he knows a word that person answers to. |
| `bow` | `who` (anyone, `eric` too), `depth: 'small'|'deep'` | A bow, shown. |
| `gesture` | `who`, `kind`: `nine`, `nod`, `point`, `shrug`, `finger`, `skijump`, `beckon`, `lift`, `squeeze`, `highfive`, `fistbump`; `to` | Arm moves. Chibi cast: nine fingers up (with a 9 bubble); nod and point, aimed at `to` (a person, spot, seat, thing or `[x, z]`; straight ahead without it): the head and a little of the body turn to it, the chin dips, and for point the arm on that side swings out toward it, about 1.5 s, drawn over the person's idle so it shows on the train passengers too (`{ do: 'gesture', who: 'music', kind: 'point', to: 'seat_far_r' }`); shrug, finger to the lips, Mori's ski jump, beckon, lift (both arms over the head; Hamada's briefcase goes up with his hand), high five, fist bump. Eric and Mio: point (turning to `to` first), lift (arms up in a wide V, an invisible case over the head), squeeze (a quarter turn sideways, chest back, arms up), nod (the chin dips twice, 0.9 s), bow (a small bow, 1 s), shrug (shoulders up, hands out, 0.9 s), wave (right hand up by the head, 1 s); each returns when it's done, so the next line follows at once. |
| `phone` | `who`, `state`: `buzz`, `look`, `away` (Mio, Eric); `on`, `off` (the guard) | A phone: Mio's buzzes with a bubble until she looks; the guard's handset at his ear with faint hold music. |
| `type` | `word`, `prompt` (optional line shown above it), `from` | The typing prompt for a new word (docs/game/systems.md, Typing a word). On success Eric says it, it becomes known, and flag `typed_<word>` is set. Use it where a word is taught, in place of a "say it" button: `{ do: 'type', word: 'yoroshiku', from: 'mio', prompt: 'mio: Say it. Like this.' }` |
| `kotodama` | `target` | The kotodama effect on a place's named target (docs/game/systems.md). The place does the rest; ask for new targets in REQUESTS.md. |
| `next` | | Starts the transition to the next place (see Transitions). |
| `trip` | `to` | Walks Eric to a neighbouring place off the day's line (`forecourt` and `plaza` both ways, and the way home: `office` to `forecourt`, `plaza` to `dorm_court`; places/definitions.js TRIPS). The same watched walk and crossfade as `next`, with no transition slot; the place's start node runs on arrival. |
| `end` | | The end of the day (Eric's room, on the walk home). |
| `find` | `id` | Eric takes a find (see Finds): it goes into his album, shows up close until tapped, and sets `found_<id>`. Nothing happens if he has it already. `{ do: 'find', id: 'bakery_flyer' }` |

Sim hooks (`period`, `bond`, `bondStep`, `remember`, `fact`, `relate`, `meet`, `buy`, `take`, `save`) are under Sim data.

## Place hooks and events

The things, spots, seats and zones each hook refers to are listed in docs/game/places.md.

### Train (`train`)

Events: `start`, `approach` (the train starts slowing, when the story runs `{ do: 'arrive' }`), `arrived` (stopped, doors open), `chime` (the door-closing chime starts).

- `announce` `text`, `voice`: the LED board at the top with the station announcement (`text: ''` hides it).
- `arrive`: the train brakes and pulls into the station (about 8 s), then fires `event:arrived`.
- `doorsOpen`; `doorsClose` (`to`, 1 open to 0 shut, and `ms` for a slow steady close; no `ms` is the quick close); `chime` (starts the closing chime; the doors start closing after about 3 s unless `doorsHold` runs); `doorsHold` (`kotodama: true` freezes the doors where they are, with the effect; without it they bounce back to about half open).
- `alight` `except`: everyone gets off but those listed. `depart`: the train leaves.
- `wake` `who`: a sleeper jolts awake.
- `catTo` `to`: Tama hops down and trots to a spot or person.
- `bag` `state: 'teeter'|'slide'|'caught'|'dropped'`: Mio's bag on the seat beside her.
- `cup` `state: 'tip'|'safe'`: the coffee on the seat beside Mio.

### Gate (`gate`)

Events: `start`, `card_red` (a card reader tapped before it works), `card_ok`, `arch_blocked` (walking into the closed gate), `gate_opened`.

- `reader` `side: 'l'|'r'`, `state: 'red'|'green'|'idle'`: the reader's light and beep.
- `gate` `state: 'open'|'closed'|'jam'|'slam'`: the flaps (`jam` rattles and the count screen shows a person, a briefcase and a red 2; `slam` bursts open, bounces and stays open).
- `cardOk`: Eric's card now works; his next tap turns the reader green and opens the gate.
- `enter` `who`: someone walks in through the entrance.
- `typing` `who`, `ms`: typing animation (the guard at his computer).
- `rush` `on`: office workers on or off. While the gate is shut or jammed they wait by the readers.
- `newsletter` `state: 'down'|'up'`: Aoi's newsletter on the bench.
- `catTo` `to`: Tama moves (crossing the barrier flashes the gate red).
- `liftOpen` / `liftClose`: one of the lifts opens.

### Lift

In `transitions.js` `gate_to_office.ride`: `{ do: 'floor', to: '5' }` moves the floor display one floor at a time (`B2`, `B1`, `1` ... `5`; the ride starts at 1), and `{ do: 'liftDoors', state: 'open'|'closed' }` plays the doors. If the ride doesn't end on B2, the engine finishes the count to B2.

### Office (`office`)

Events: `start`, `sat_down`.

- `copier` `state: 'jam'|'run'|'wild'|'idle'`: `run` prints a neat stack, `wild` sprays paper.
- `chairRoll` `to`: Eric pushes his chair to a spot, walking behind it (carrying Tama if she's on it).
- `coffee`: the coffee machine brews.
- `kettle` `state: 'pour'`: the pot pours, with steam.
- `rackAlarm` `state: 'on'|'off'`: a blinking light and beeps on the racks.
- `machineDoor` `state: 'open'|'closed'`.
- `vendingDrop`: a can drops out.
- `clockStop` `ms`: the wall clock's second hand stops for a while.
- `fan` `state: 'on'|'off'|'wild'`.
- `liftOpen` / `liftClose`.
- `sitDown`: Eric sits at his desk (fires `event:sat_down`).
- `lunchSit` `with: 'mio'|'mori'`: Eric and the partner sit down to lunch (machine room floor, or the kitchenette table). `lunchOver`: lunch packed away, everyone back on the floor.
- `catTo` `to`: lifts Tama off the chair and walks her (a spot or an id).

### Dorm courtyard (`dorm_court`)

- `mailbox203` `state: 'open'|'close'`: mailbox 203 in the hall. Open: the camera comes in close on it, the flap swings open on the folded bakery flyer inside (the flyer stays in the box after). Close: the flap shuts and the camera lets go. Both finish their motion before the story goes on; a save keeps the flap and the flyer. The `mailboxes` pin shows only while the story has a `talk:mailboxes` trigger.

### Eric's floor (`dorms`)

- `enterRoom`: Eric goes in at his door: his front drops, the door opens, he steps over the genkan into the room and the view widens to the flat.

## Portraits

The speaker's portrait shows beside the text box ([docs/game/controls-and-ui.md](../../docs/game/controls-and-ui.md)). The faces each person has are listed in docs/game/cast.md, Portraits. Set one on a line with the long form `{ say: 'mori', face: 'smile', text: '...' }` (it stays until changed or the scene ends: every triggered scene starts everyone on neutral), or with `{ do: 'expression', who: 'guard', face: 'stern' }`. A face that person doesn't have falls back to neutral. The `emote` hook also picks a face when that person has a fitting one: `?` suspicious/stern, `!` panicked/surprised, `♪`/`heart` smile/grin/amused, `sweat` flustered/sheepish/panicked, `zzz` sleepy/tired, `…` tired.

## Overheard Japanese

`{ say: 'guard', overheard: true, text: '日本語の文。', clear: ['B2', { ja: 'コンサルタント', ro: 'konsarutanto', en: 'consultant' }] }`. The text is the Japanese itself; how it shows and sounds is in docs/game/systems.md. Only the long form supports `overheard`. `clear` entries are readable for that line only and don't become known. An `{id}` in an overheard line is sharp only once that word is known; before that it blurs like the rest, even if it was shown glossed earlier (Jørgen: 本社 from the train announcement showed as known at the gate). Voice clips for overheard lines are generated from the text by `tools/voices.py` (run it after adding lines; no `voice` key needed).

Words count as known only once taught with `type`, `learn` or `offer`; a glossed `{id}` in a normal line doesn't teach it. The first time Eric learns any word, the Say button is taught automatically; whenever a goal answers to a word Eric knows (a `say:<word>:<id>` trigger on a goal), the button lights up. So put the first `type` where Eric can use the word right after, and mark the thing waiting on a word as a goal.

## Sim data (clock, schedules, ambient moments, bonds, gifts, memory, save)

All optional, all per story file, all generic so they carry over to later days. How these behave for the player (bond steps and points, gifts, memory) is in docs/game/systems.md. The engine side is game3d/js/sim.js, the bond maths js/bonds/model.js (tested by `node game3d/js/bonds/test.mjs`), standing cast data js/bonds/cast.js, and day 1's recorded moments js/bonds/day1.js.

```js
export default {
  // who they are, for the People panel (shown once Eric has talked to them)
  people: { kuroda: { name: 'Mr. Hamada', about: 'Accounts, 12th floor. Falls asleep on trains.', color: '#b3a58f' } },
  // where people are in each period ('*' = any period); `at` is a spot, object id or [x, z]; `sit` a seat id;
  // `face` an id to turn to; `hide: true` takes them out of the place. Applied when a place starts and whenever the period changes.
  schedule: { mori: { lunch: { at: 'kitchen_table' }, afternoon: { at: 'chief_desk' }, evening: { hide: true } } },
  // NPC-to-NPC moments, played as captions (no tapping) when Eric comes within `radius` (default 2.4) of `near`
  // (or the first person in `who`). Both people must be here and visible. Optional: `pair` (they must be within
  // this distance of each other), `rel` (a relation that must hold, 'kenji likes mori', or a list), `if`, `period`
  // (one or a list), `once` (true by default: once ever; 'day', 'period', or false), `set` (a flag when done).
  ambient: [{ id: 'kenji_mori', who: ['kenji', 'mori'], pair: 4, rel: 'kenji likes mori', period: 'afternoon', lines: ['kenji: ...', 'mori: ...'] }],
  // how people stand with each other, one way: 'likes', 'owes' or 'rivals' (over js/bonds/cast.js)
  relations: { kenji: { mori: 'likes' } },
  // tastes, for gifts: item ids. A need counts once they've said it out loud (`said` is that flag).
  likes: { mio: ['coffee'] }, dislikes: { mio: ['cornsoup', 'tea'] },
  needs: { mori: [{ id: 'thermos', item: 'tea', said: 'mori_said_empty' }] },
  register: { kenji: 'casual' },                     // the Japanese they expect from Eric: 'casual' or 'polite'
  gates: { mio: { 3: 'mio_turn_done' } },            // the scene flag each of steps 3-5 waits on (default bond3_mio ...)
  // a scene to run when someone reaches a step; for steps 3-5, when the points are there and it waits on its scene
  bondStep: { mio: { 2: 'mio_friendly', 3: 'mio_turn' } },
  // record things when a node starts, without writing steps into it (the way day1.js wires day 1)
  moments: { caught: { remember: [['mio', 'caught_bag', 'You caught her lunch bag.']], bond: [['mio', 'help', 1, 'the bag']] } },
  reasons: { copier: { source: 'ticket' } },         // the source of a `bond` step in that node ('node:who' for one person)
  on: {
    'give:coffee:mori': 'mori_coffee',   // Eric gives an item (Give button, when a person is near)
    'give:*:kenji': 'kenji_any_gift',    // any item
  },
};
```

Bond point sources, for `source`: `greet`, `talk`, `gift`, `need`, `ticket`, `help`, `their_way`, `register`, `scene` (what each is worth: docs/game/systems.md).

**Hooks.**
- `bond` `who`, `add`, `source`, `why`: adds points. `{ do: 'bond', who: 'mori', source: 'ticket', why: 'fixed his copier' }`. Without `source`, the node's entry in `reasons` (or day1.js) names it, else `scene`.
- `bondStep` `who`, `to` (3, 4 or 5): the scene that step waits on has played. Same as setting its gate flag.
  Custom gate names from earlier places are saved with bonds, so Continue retains them. Loading another slot replaces those overrides; old saves without them use the standing cast defaults until the current story is absorbed.
- `remember` `who`, `id`, `text`: something Eric did that they'll remember. Shows in People as "They remember: ...". Test it with the flag `rem_<who>_<id>`.
- `fact` `who`, `id`, `text`, `like`: something Eric has learned about them, for People; `like: 'coffee'` also shows that taste as noticed.
- `relate` `a`, `b`, `kind` (`likes`, `owes`, `rivals`, `none`): changes how a feels about b.
- `meet` `who`: adds them to People (step 1); talking to a person does this too.
- `period` `to: 'early'|'morning'|'lunch'|'afternoon'|'evening'`; only the story moves it.
- `buy` `item` (item ids: docs/game/systems.md, Gifts): sets `bought_<item>`, or `cant_buy`. `take` `item`. `save`.

**Flags for conditions.** `bond_<who>` (points), `step_<who>`, `bondready_<who>` (the step whose scene is due, else 0), `met_<who>`, `rem_<who>_<id>`, `fact_<who>_<id>`, `rel_<a>_<b>` (`'likes'`...), `register_<who>` (`'right'` or `'wrong'`: the register of the last word Eric said to them), and after a gift `gave_<item>_<who>`, `gift_<who>` and `gift_reaction` (`'need'`, `'like'`, `'neutral'`, `'dislike'`), set before the `give:` node runs. So one trigger can answer any gift: `'give:*:mio': [{ if: "gift_mio == 'like'", node: 'mio_likes_it' }, 'mio_polite_thanks']`. A refusal entry takes `keep: true` (`{ if: 'gifted_mio', node: 'gift_again', keep: true }`): its node runs, but the item stays in the bag and none of the gift flags are set.

Words record who taught them (the speaker of the `offer` line, or `from:` on `offer`/`learn`/`type`), shown in People.

## Finds (`finds.js`)

Photos and papers Eric picks up and keeps (docs/game/systems.md, Finds, has the ids and where each lies). The engine places the photos, draws their pictures and handles picking them up; `game3d/story/finds.js` holds their words and the notice boards' posts:

```js
export default {
  photos: { photo_plaza: { title: 'At the fountain', caption: '' } },   // title: a few words; caption: one optional short line
  papers: { bakery_flyer: { title: 'Bakery welcome flyer', lines: [{ ja: '', en: 'Fresh bread every morning.' }] } },
  boards: {
    // 4 to 6 posts, in reading order; a board with no posts can't be read
    plaza_board: [{ title: 'ポンプ (ponpu, pump)', en: 'One line.', color: 'yellow' }, { title: '', lines: [{ en: 'Post.' }, { en: 'Reply: ...' }] }],
  },
};
```

A post or paper line is `{ ja, en }`: `ja` optional, `en` always, so Japanese never shows without English. A post has `en` or `lines` (several), an optional `title`, and `color` (white, yellow, blue, pink, green). A photo with no entry shows the engine's plain title. Picking up sets `found_<id>`, usable in any condition (`'!found_bakery_flyer'`). A scene hands one over with the `find` hook.

## Transitions (`transitions.js`)

There are no cuts to black between places. Each move is one continuous trip (docs/game/places.md, Getting between places), and each has optional dialogue slots.

```js
export default {
  train_to_gate: {           // off the train, along the platform and the walkway, in through the lobby doors
    walk: ['mio: This way, the walkway is warmer.'],   // lines while walking (auto, no tap needed, about 3 s each)
    arrive: [],              // steps run as he comes in through the glass doors, before the gate's start node
    with: ['mio'],           // who walks with him into the next place (only people who exist in both)
  },
  gate_to_office: {          // into the lift; the ride counts floors; the doors open on the B2 landing
    ride: [{ do: 'floor', to: '5' }, 'sales1: ...', { do: 'floor', to: 'B2' }],   // lines during the ride (tap to go on; the ride waits for them)
    with: [],
  },
};
```

`walk` lines show on their own and don't stop the walk; `ride` and `arrive` are normal steps and wait for taps. Flags work in all of them (use `{ if: ... }` steps). `with` entries can be conditional: `with: [{ who: 'aoi', if: 'aoi_with' }]`.

## Music

Each place has its own loop (docs/game/art-and-sound.md). To change it in a scene: `{ hook: 'music', name: 'night' }` (`calm`, `office`, `lively`, `night`, or `null` for silence).
