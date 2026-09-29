# Day 1 simplification proposal: train

Proposal only. No story, fact, engine or asset files changed. The user brief is “dont overcomplicate scenes like this”, “2 steps”, and naming the important event directly. The lunchbox already follows that rule. A longer teaching or rescue scene still needs its setup, a spoken model, the player's attempt and a response.

Source: the story files at the commit below.
Source commit: `52144e90d7873882d8f3111451c364bed9a41e7b`. The audited story and three storyline documents had no working changes.
All node/index references below are zero-based indices in this frozen source.

## Counting method

- **A**: manual advances of spoken lines or narration after the text has appeared. Each `say` or narration string requires one. A line immediately followed by a choice still requires its own advance in this engine.
- **C**: selections, including story-choice buttons and a word selected from the Say menu. Choice prompts are shown with their buttons and add no A.
- **T**: successful typed submissions. Enter is optional: `typePrompt` completes when the answer matches. Character keystrokes, retries and microphone alternatives are excluded.
- **E**: external interactions that start or resume a scene, such as tapping Mio or opening Say. Selecting the Say word is C, not another E. Walking/target positioning is stated separately, since keyboard movement and floor taps have no fixed click count.
- Counts assume a new player, manual dialogue advance and default mastery of three successful uses. A repeat Say reaction needs T=1 while its word is below mastery, otherwise T=0. There is no additional confirmation after a successful type prompt.
- Optional text-reveal taps, audio replay, hints, cancelling menus and hurrying animation are excluded. Automatic camera moves, animation hooks, flag writes and node jumps are not inputs. Start/Continue, settings and cross-place transitions are outside this train-story count.

Count evidence: `game3d/js/ui/dialogue.js` (`say`, `choose`), `game3d/js/ui.js` (`sayMenu`, `typePrompt`), `game3d/js/gameplay/interactions.js` (`use`, `sayWord0`), `game3d/js/mastery.js`. Reading the story's node count as its click count would be incorrect.

## Before and after: main scenes

Each entry is **A / C / T / E**. Ranges name their routes in the same row. The optional reaction table below is not included in the main-route totals.

| Scene and covered nodes | Before | Proposed | Entry and decision |
|---|---:|---:|---|
| Free exploration: `intro`, ambient `mio_wifi` | 0 / 0 / 0 / 0 | Same | Keep controls-only opening and player movement. Wi-Fi is an ambient caption, not an advance. |
| First passenger: `first_aoi`, `first_bun`, `first_youth` or `first_music` → `nod_seat` | 2 / 0 / 0 / 1 | Same | One passenger interaction, their Japanese reply, then the seat direction. It is optional if the player finds Mio/seat directly. Keep a readable goal. |
| Lunchbox: `seat` → `caught`, `dropped` or `mio_catches` | 1 / 1 / 0 / 0 or 1 | Same | E=0 by entering the free-seat zone; E=1 by talking to Mio. All three choices already resolve in one reply and automatically seat Eric. Keep. |
| B2 and 外人: `sit` | 6 / 1 / 1 / 0 | Same | Continues automatically from the lunchbox. Includes the identity/family/nod choice. Keep the question that motivates explaining 外人, and the typing. |
| Name reply: `its_eric` → `chat1_end` | 1 / 0 / 0 / 0 | Same | Keep “It's on your card.” The choice is counted in `sit`. |
| Family reply: `family` → `chat1_end` | 2 / 0 / 0 / 0 | 1 / 0 / 0 / 0 | Merge her two short replies. Preserve warmth and the family detail. Only available when `heard_mum`. |
| Quiet reply: `leave_it` → `chat1_end` | 0 / 0 / 0 / 0 | Same | Keep Eric's nod/bow and the exploration break. |
| Starting the lesson and おはよう: `lesson` → `jp_one` or `jp_none` → `lesson2` | 11 / 1 / 1 / 1 | 9 / 1 / 1 / 1 | Both Japanese-ability routes have the same counts. Merge the two warnings and remove the wave narration. Keep the slow spoken model, typing, feedback, and cat instruction. |
| Practice with the cat: `ohayo_cat` | 1 / 1 / 1 / 1 | Same | Approach Tama, open Say (E), choose おはよう (C), type it again (T), advance Mio's reply (A). The lesson was only practice use one, so default mastery still requests typing. Keep the joke and first real use of Say. |
| Sleeper setup, よろしく and arrival announcement: `lesson3` | 8 / 0 / 1 / 1; warm route 9 / 0 / 1 / 1 | 6 / 0 / 1 / 1; warm route 7 / 0 / 1 / 1 | Tap Mio again when ready. Remove tiny-bow narration; merge positive feedback with Mori's bow advice. Keep sleeper setup, meaning, slow model, type, optional pickle and destination/door instruction. |
| Walk to the doors: `approach` | 0 / 0 / 0 / 0 or 1 | Same | E=0 on entering the near-door trigger; E=1 on tapping a door. Walking stays player-controlled. Braking and staging are automatic. |
| Aoi blocks the exit / すみません: `arrival` | 5 / 0 / 1 / 0 | 3 / 0 / 1 / 0 | Triggered automatically when the train arrives. Remove the general advice detour and the chopping-hand narration. Keep the immediate reason, slow word, type-to-Aoi and Aoi's answer before she moves. |
| Sleeping man and 待って: `platform` | 8 / 1 / 1 / 0 or 1 | 7 / 1 / 1 / 0 or 1 | E=0 by walking onto the platform; E=1 via the door interaction. Remove flat-palm narration only. Keep the mainland stakes, Mio's failed shout, further door closure, slow word, Eric's typing, visible magic, escape and Mio's reaction. C is “Did I do that?” / silence. |
| Reaction and Mio's concern: `did_i` or `did_quiet` → `mio_tests` | Ask: 2 / 0 / 0 / 0; quiet: 1 / 0 / 0 / 0 | Same | Her uncertain answer remains on the ask route. Keep her concern that a report will become her ticket. After buzzing, go directly to `mio_phone`. |
| Phone and goodbye: `mio_phone` | 3 / 0 / 0 / 1 | 3 / 0 / 0 / 0 | Remove the extra tap on Mio between the phone buzz and her checking it. Warm and cool goodbyes both use one advance. Keep server emergency, card-until-nine warning, guard instruction and greeting reminder. |

For a route that talks to one passenger, walks into the seat/door/platform zones, completes the mandatory cat practice, and takes no optional detours: **46–50 A → 39–42 A, 5 C → 5 C, 6 T → 6 T, 5 E → 4 E**. The shortest named route is any lunchbox outcome → “Just nod” → either Japanese-ability reply → no warm pickle → “Say nothing”: 46→39 A. The longest is catch lunchbox → ask about mum → warm pickle → “Did I do that?”: 50→42 A. Talking directly to Mio instead of entering the seat zone adds E=1; tapping the two door interactions can each add E=1. Skipping the initial passenger removes 2 A and 1 E. These are successful action counts, not a claim about literal mouse taps.

## Optional scenes and repeat reactions: kept

All counts below are unchanged before/after. Each row is one optional visit unless stated. **P** means one typed submission while the selected word is below mastery, zero after mastery. Every Say visit has E=1 to open Say and C=1 to select its word, after the player gets in range. Ordinary Use/Talk is E=1. These visits can be repeated, so there is no finite total for a player who keeps exploring.

| Scene / node | A / C / T / E | Why keep it |
|---|---:|---|
| `bun` | 1 / 0 / 0 / 1 | A brief Japanese passenger response. |
| `youth` | 1 / 0 / 0 / 1 | One response plus an automatic puzzled emote. |
| `music` | 0 / 0 / 0 / 1 | The musical-note reaction has no dialogue confirmation. |
| `phone_girl` | 1 / 0 / 0 / 1 | Aoi is occupied with her own placement news. |
| `window` | 1 / 0 / 0 / 1 | Eric's dry observation establishes distance from the mainland. |
| `poster` | 1 / 0 / 0 / 1 | One inspect response; no forced detour. |
| `straps` | 1 / 0 / 0 / 1 | One inspect response about his unfamiliarity with the train. |
| `rack` | 1 / 0 / 0 / 1 | The matching company tags are a small detail. |
| `plant` | 1 / 0 / 0 / 1 | Keep the watered-plastic-plant joke. |
| `seat_bags` | 1 / 0 / 0 / 1 | A short explanation when inspecting the occupied seats. |
| `reader` | 1 / 0 / 0 / 1 | The book-title joke fits an optional inspection. |
| `hamada` | 1 / 0 / 0 / 1 | The briefcase note establishes his destination and time. |
| `tama` | 1 / 0 / 0 / 1 | Optional cat contact stays short. |
| `ohayo_bun` | 1 / 1 / P / 1 | A matching greeting from the actual recipient. |
| `ohayo_youth` | 1 / 1 / P / 1 | One casual response. |
| `ohayo_music` | 0 / 1 / P / 1 | Puzzled emote only. |
| `ohayo_aoi` | 1 / 1 / P / 1 | Aoi stays on her phone. |
| `ohayo_reader` | 1 / 1 / P / 1 | Reader stays occupied. |
| `ohayo_tama` | 0 / 1 / P / 1 | A later greeting produces a heart without another forced exchange. |
| `asleep`, reached with おはよう, よろしく or すみません | 0 / 1 / P / 1 per selected word | The sleeper stays asleep. Preserve the later rescue setup. |
| `matte_tama` | 1 / 1 / P / 1 | Keep the cat's literal response to “wait”. |
| `cat_nudge` | 1 / 0 / 0 / 1 | Optional reminder when talking to Mio instead of practising. |
| `ohayo_mio_again` | 1 / 1 / P / 1 | Wrong-target response sends the player back to the cat. |
| `mio_doors_nudge` | 1 / 0 / 0 / 1 | One reminder, still about her pickles. |
| `mio_after` | 1 / 0 / 0 / 1 if reached | A farewell fallback while she leaves; not a required extra interaction. |
| Legacy saved wobble: direct `caught`, `dropped` or `mio_catches` trigger | 1 / 0 / 0 / 0 or 1 for the lunchbox outcome, then `sit` | Old free-seat-zone or object/person triggers remain compatibility paths. New play uses the lunchbox choice and never needs box clicking. No proposed change. |

Dormant nodes also audited: `first_stander` would be 2 A including `nod_seat`; `stander` would be 0 A; `ohayo_stander` would be 1 A. None has an `on` trigger in this source, so they add **zero** to reachable route totals. Keep them outside the proposed player-facing edits. Likewise, `nod_seat[1].then` has one narration advance like its else branch, but the usual first interaction sets `seat_goal` and prevents subsequent `first_*` triggers; the documented “after three passengers” case is not a normal fresh-game route. Do not count it three times.

Coverage: all **56 nodes**, plus ambient `mio_wifi`, are named above. `nod_seat` and `chat1_end` are included through their callers and never counted twice.

## Exact proposed edits

These are the complete proposed text and flow changes. All unnamed lines, choices, teaching prompts, flags and animation hooks stay as they are. No story text is changed until Jørgen picks the train option.

### 1. Family reply: merge `family[1]` and `family[2]`

Before, two advances:

> Mm. I stayed at her place last night, on the mainland.
>
> She always packs too much. Like I'm moving to another country.

After, one line at the first location; delete the second:

> Mm. I stayed at her place last night, on the mainland. She always packs too much, like I'm moving to another country.

Keep `say: 'mio'`, use `emo: 'fond', face: 'tired'`. Keep `family[0]` warmth and its final jump. The family answer and joke fit one short response without changing subject or speaker.

### 2. Why Mio teaches: merge `lesson2[0]` and `lesson2[1]`

Before, two advances:

> You know it's all Amakawa people on the island, right? Nobody speaks English. Even at the supermarket.
>
> And Mori-san is going to be so polite with you, and you'll just stand there.

After, one line at the first location; delete the second:

> It's all Amakawa people on the island, and nobody speaks English. Mori-san will be so polite with you, and you'll just stand there.

Keep `say: 'mio'`, use `emo: 'amused', face: 'smile'`. This retains the company island, English problem and her concern about embarrassing the team. The supermarket aside does not need another beat.

### 3. Delete `lesson2[3]`

> She lifts two fingers off her laptop in a lazy wave, and nods.

The word's explanation and slow spoken model remain on either side. This gesture has no explicit matching hook in the scene. Removing its text avoids an extra confirmation without removing the spoken example or asking for new animation.

### 4. Delete `lesson3[9]`

> She dips her head about two centimetres. It is the smallest bow you have ever seen.

Keep the meaning, slow よろしく, typed attempt and Mori-specific bow advice. This standalone gesture description needs an advance and has no matching bow hook here.

### 5. Merge `lesson3[12]` and `lesson3[13]`

Before, two advances:

> {yoroshiku}. Mm, good.
>
> With Mori-san, bow a little when you say it. He likes that.

After, one line at the first location; delete the second:

> {yoroshiku}. Mm, good. Bow a little with Mori-san, he likes that.

Keep `say: 'mio', emo: 'casual'`. Positive feedback naturally carries the next practical tip. The earlier slow model and typed submission remain separate.

### 6. Delete `arrival[5]`

> You'll get lost today, everybody does. Just say it and point at things. Honestly it works for almost everything.

The current obstruction is Aoi in the doorway. Keep `arrival[4]`, which identifies the problem and teaches the word's use for sorry as well; keep the slow model, typing and Aoi's reply. The broad advice delays this immediate exchange. Mio still tells Eric to talk to the guard during her goodbye.

### 7. Delete `arrival[6]`

> She holds one hand up edge-on in front of her and makes a little chopping motion, cutting a path through an invisible crowd.

Aoi is already staged in the way and moves after the exchange. This gesture is not an authored hook and explains no necessary action beyond the visible blocker and the word's meaning.

### 8. Delete `platform[17]`

> She holds up a flat palm at the doors, like stopping traffic.

Keep Mio's shouted 待って, the doors continuing to close despite it, her slow pronunciation, Eric's typed attempt and the kotodama hold. “Wait” appears in the word gloss and typing UI. This deletion removes one confirmation without weakening the contrast between Mio's failed attempt and Eric's effect.

### 9. Append `{ go: 'mio_phone' }` after `mio_tests[2]`

No line is changed. Current tail:

```js
{ do: 'phone', who: 'mio', state: 'buzz' },
{ set: 'phone_buzz' },
```

Proposed tail:

```js
{ do: 'phone', who: 'mio', state: 'buzz' },
{ set: 'phone_buzz' },
{ go: 'mio_phone' },
```

The phone interrupt belongs to the conversation already in progress. Mio can check it after the player advances her secrecy line. Keep the `phone_buzz` flag and existing talk fallback for save compatibility. Her reply lines remain player-paced. This removes exactly one required external re-interaction, with no extra narration or automatic text advance.

## Why these scenes stay longer than two inputs

The platform sequence must show a sleeping passenger, where the train is going, Mio failing, Eric trying, and the unusual result. Collapsing these into an unexplained magic event would repeat the user's earlier confusion. The lesson pauses after the first chat and after cat practice let the player explore and choose when to resume. Removing those pauses would save taps by taking away the user's requested control over starting story beats.

The optional scenes already cost one reply advance or less. Removing them would save nothing for a player following the main goal and would reduce exploration, passenger voices and the cat's humour. The four slow pronunciation examples, all five taught words, the cat's practice typing, warmth branches and magic cause/effect all remain.

The dialogue/story-sense diagnosis is pacing friction within coherent scenes. The humanizer pass keeps Mio's spoken clauses and avoids compressed instruction fragments. The cliche-transcendence check retains her own concerns (mother's food, team embarrassment, future tickets and the server) instead of turning her into a tutorial announcer.

If picked, three merged Mio lines need fresh voice clips from Claude's tool; deleted narration needs no audio. Fact updates would be limited to the changed beat descriptions in `docs/game/stories/mio-train.md`, `docs/game/stories/sleeping-man.md`, and the phone-continuation description in `docs/game/stories/mio-notices.md` after checking that file. No new artwork or engine hook is proposed.

## Source hashes (SHA-256)

| Source | SHA-256 |
|---|---|
| `game3d/story/train.js` | `e1635b97ea37b1831b5d2440d03d3b6c4218eebc07b052a7e8788978dafb9c6a` |
| `docs/game/stories/mio-train.md` | `67c683f450c5235aed2e654d9c525fce988e317a554906bc6293303fbe6c9aad` |
| `docs/game/stories/sleeping-man.md` | `e800c4bbd3d1ecbec001f60b05d20cc962ea5d00feca0b9b54f88b641c5e85db` |
| `docs/game/stories/tama.md` | `4679906fb48a8a1fb516332430c1af50d08a6fce6be5c296369b94b635621f24` |
| `game3d/story/VOICE.md` | `c64fd077885cf3a254ca582a5bc3a1055b17895c29cc197337a7999229d71241` |
| `game3d/js/ui/dialogue.js` | `db6ad03bc93cb08565eb21ec3ddda9a9c7ca13f705d42f815eaf9bea8ad67e81` |
| `game3d/js/ui.js` | `01c9aadb9e66fec644752c9f5fadfe424778b0328b2ca87f1b11be05f7f516b1` |
| `game3d/js/gameplay/interactions.js` | `f3ac0adf05a6cf318669d059464e947514edd77e8f330fcb73af6ccc00613b56` |
| `game3d/js/mastery.js` | `9f79e89b63421cc683420d12703579db87ef4abcc69047ee120edde4455e144b` |
