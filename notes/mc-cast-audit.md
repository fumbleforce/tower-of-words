# Protagonist and cast audit

Audit date 2026-10-05. Read-only; numbers come from grep and are exact unless marked "about". Question: what does it take for several playable protagonists (Eric, Carina, later a custom one) and a cast set where people fill roles?

## Summary

- The player's id `eric` is used as a quoted string in 35 places in 20 files of game3d/js. That is small. Most other "eric" hits are a local variable or a field (`W.eric`, `const eric = game.player`), which are cosmetic renames, not coupling. In the story it is `say: 'eric'` 64 times in 27 files and `speakers.eric` once per place file.
- The real coupling is in assets and in data tables keyed by `eric`: the 3D model folder (game3d/assets/eric), the portrait set (3 faces), 14 word clips `eric-<word>`, a height table, a portrait crop table, and the voice reference. All are lookups by id, so they move to a protagonist config without code rewrites.
- Text is already almost neutral. Narration is second person ("You pat the chair"). Of about 424 story `say` lines and about 88 narration lines, only about 12 lines say the name and about 3 to 6 carry a gendered or "new guy / gaijin" hook. Nothing has to be rewritten for a woman except a short list (section 2).
- The cast is wired by person, not role: Mio alone has 109 quoted references in 20 code files and 186 in the story. A role layer is a bigger job than a second protagonist. It is realistic for roles whose person only appears in a few beats (team lead, secretary, receptionist) and not for Mio.
- Bonds are already per person with the player as an implicit single subject. The save keeps one set of flags. A second protagonist needs a `mc` field in the save and nothing else in the bond model.
- Minimal first slice (section 7): a protagonist config file plus a `?mc=` switch, Carina placeholder model and portraits reusing existing bases, name tokens in about 12 lines. Roughly 1 agent-day. Then roles.

## 1. Protagonist coupling in code

### How `eric` is used

| Use | Count | Examples |
|---|---|---|
| Quoted id `'eric'` in game3d/js | 35, in 20 files | game3d/js/end.js:51 (`id !== 'eric'` when listing people met), game3d/js/narrative/hooks/targets.js:1 (`isPlayer`), game3d/js/runner.js:353 and :357 (voice key fallback for the player), game3d/js/ui.js:592 and ui/portraits.js:190 (portrait of the player), game3d/js/chibi.js:22 and :25 (height table, chibi cast), game3d/js/places/lift.js (about 6 `slotW(L, 'eric')`), game3d/js/train/discoveries.js:274 to :277 (walk, face, gesture) |
| Player is also matched as `'player'` | 6 places | game3d/js/places/office.js:816, :840, game3d/js/places/train.js:1096, :1118. So there are already two names for one thing |
| Word `eric` anywhere in game3d/js (variables, comments, strings) | 790 hits in 184 files | Mostly `const eric = game.player` style names. Rename is cosmetic and can wait |
| Bare identifiers | `loadEric` (game3d/js/avatar.js:245), `ericBody` (game3d/js/chibi.js:271), `game.ericBox` (narrative/hooks/prompt-view.js:50), `eric_dorm` (scenes/island-plan.js:158, a building id, not the player) | Few. `ericBox` is used by goal-arrow and portraits |
| Query switch | `?eric=chibi` only (game3d/js/main.js:559) | No `?mc=` exists yet |
| Flags | None are named with `eric`. Flags are `lunch_mio`, `greeted_guard`, `ticketread_<ID>` | The flag layer is already player-neutral |
| Save | The save keys (game3d/js/saves/store.js) hold one autosave and slots; nothing in saves/ mentions the player | Add `mc` and `cast` fields; one migration step |
| Tests | game3d/test has 13 files with the word (65 hits, mostly fixtures and `saved-people`, `say-guard`, `steer-release`, `tickets`); game3d/qa 13 files (transcripts, briefs) | See section 5 |
| Tools | tools: 135 files, 3,741 hits (mostly art pipelines, section 4); game3d/tools: 52 files (shots, checks, `voice-manifest.mjs`) | |

### Where the player's name, gender and pronouns are baked in

- Name `Eric` in code strings: 24 in game3d/js (end.js:90 "Handed to: Eric", ui/tickets-view.js:65 "B2 IT · Eric", places/definitions.js:30 "Eric's room", ui/settings-view.js:76, map/screen.js:353 map tag, lang.js:57 the katakana word エリック, narrative/speakers.js:3 speaker name, viewer/roster.js:18). Most others are debug messages and comments.
- Pronouns about the player in code strings: practically none. game3d/js/bonds/day1.js writes memories in second person ("You greeted him"), and the "him" there is the other person.
- Gender in sprite and voice: portrait crop table (ui/portraits.js:17, eric has its own 648x768 box), chibi `HEIGHT` table (chibi.js:22), voice description "Tired man in his thirties" (game3d/story/VOICE-DIRECTION.md:18), voice refs tools/voice-refs/eric-*.wav.
- Docs: docs/game has 489 hits for "Eric" in 27 files and `he/his` about the player in 27 files. Docs describe day 1 for Eric; they stay as the default and should say "the protagonist" only where a rule is general (systems.md Bonds says "Every person has a bond with Eric").

### What one protagonist config would replace

A data file per protagonist, for example game3d/data/mc/eric.json and carina.json (plain JSON, no script):

- `id`, `name`, `name_jp` (エリック / カリーナ), `name_katakana_gloss` for the lang.js entry, `short` (room label "Eric's room").
- `gender` and the English tokens `{they}`, `{them}`, `{their}` filled as he/him/his or she/her/her. Needed only where a third person says it about the player.
- `address`: how Japanese NPCs address the player: `suffix` (さん for both is the default; くん only for some people), `jp_called` (エリックさん), and `gaijin_label` text.
- `portraits`: id of the face set (assets/portraits/<id>-<face>.webp), the face list (today neutral, surprised, tired) and the crop box (replaces ui/portraits.js:17).
- `model`: folder under game3d/assets (base.webp, idle/walk/run/sit glb), `height` (1.2 today), optional `chibi` height.
- `voice`: key prefix for the word clips (`eric-ohayo` becomes `<id>-ohayo`), speaker voice description for the TTS manifest.
- `outfit`: id of the outfit set (today one).
- `bio`: job and contract (the same for Eric and Carina; this stays in the config only so a custom protagonist can differ).

Files that need to change for the config, in order of size:

1. game3d/js/avatar.js, chibi.js, main.js (load the right body: 3 call sites).
2. game3d/js/ui/portraits.js, ui/portrait-data.js, narrative/speakers.js (portrait set, crop, name).
3. game3d/js/lang.js (14 `voice: 'eric-...'` fields become a prefix lookup; the エリック entry at :57 comes from the config).
4. game3d/js/narrative/hooks/targets.js plus the 20 files with the quoted id: replace `'eric'` with `game.mc.id` or keep the literal `'eric'` as an internal role id "player" (the cheaper route, see below).
5. game3d/js/end.js, ui/tickets-view.js, places/definitions.js, map/screen.js (display name).
6. game3d/tools/voice-manifest.mjs (speaker per player line, voice prefix) and tools/facts/check.mjs / bible/facts.yaml:26 to :31 (the player entry).

Cheapest route: keep the internal id as the literal `'player'` role for code that only needs "the player" (rename the 35 quoted uses to a constant `PLAYER_ID` in one module; this is mechanical), and let the config supply the asset names. Story files keep `say: 'eric'` unchanged and the engine maps it to the active protagonist (as `speakers.js` already does with `role: 'you'`).

### Rig and camera assumptions about the player's height

- The model is scaled to `height: 1.2` at load (avatar.js:245). The camera gets a bounding box per frame (cam.js:148 `box.max.y`), so it follows the real body. Prompt framing uses a fixed corner height `1.25` (narrative/hooks/prompt-view.js:45) and the portrait code assumes the player's cut-out is shorter (ui/portraits.js:275). Sitting uses a shared lift (`setSitLift`, main.js:556).
- Animations: 4 clips plus 4 gestures (bow, wave, shrug, nod) retargeted to the rig as JSON (avatar.js, "relaxed-idle-eric.json" in assets/characters). A Meshy-rigged Carina reuses the same loader (`loadMeshy(id, {dir, height})`). A body that is the same skeleton needs no code. The gait and sit seats (movement/gait.js, places/office-chair.js) tune to the rig's leg length; a shorter body needs a check of seat snapping (about an hour per place, 6 places with seats).
- Phone UI, tickets, album: the phone belongs to "Eric's phone" in comments and in the held view, but no gender or id is in the code. Tickets pay and show "B2 IT · Eric" (tickets-view.js:65). The album (finds-view) is the player's own photos, per save. So these three need only the display name.

### Effort for section 1

| Piece | Size | Agent-hours |
|---|---|---|
| Config loader, `PLAYER_ID`, `?mc=`, save field | S | 3 to 5 |
| Rename quoted ids, display names | S | 2 to 3 |
| Portrait, model, chibi, lang.js voice prefix lookups | M | 4 to 6 |
| Seat and camera checks with a new body | S | 2 to 3 |
| Total code | M | about 12 to 17 |

## 2. Story and text

Totals in game3d/story: 38 files, 2,924 lines, about 424 `say:` lines, about 88 narration lines ("> ...").

| Reference to the player | Count | Notes |
|---|---|---|
| Player speaks (`say: 'eric'`) | 64 lines | Typed words are fixed clips; the rest are short spoken lines. English, first person. First-person English is neutral for both. |
| Speaker declaration `eric: { name: 'Eric', role: 'you' }` | 1 per place file | Generated from the config |
| Narration | about 88 lines, second person ("You...") | Neutral already |
| `you` / `your` in lines | 184 occurrences | Neutral |
| The name "Eric" in spoken or shown text | 12 lines | game3d/story/office.js:180 "Eric-san?", :560 "You must be Eric", :573; train.js:218 choice "I'm Eric."; day2/office.js:53; day2/shotengai.js:43, :62 (`エリックさんは` with its English), :125; tickets.js:6 "Eric's test copies"; dorm_court.js:17 `エリック · erikku · Eric`; one in plaza/other. These become `{mc.name}` and `{mc.name_jp}` tokens. |
| Japanese address | 2 files: `エリックさん`, `エリック` (7 + 2 hits in story, js and docs) | Token `{mc.jp_called}` |
| English pronouns about the player ("he/him/his") in story lines | 0 found. The 75 "he/him/his" hits are all other men (Mori, Kenji, Hamada, the guard, the youth) or comments | Zero to rewrite |
| Gendered or marked words aimed at the player | 4 to 6 | train.js:214 "the new guy" (Mio explaining 外人); the `gaijin` lesson (train.js:210 to :215, six uses of gaijin/外人/gaikoku in 8 lines); "foreigner / the support contract / a {gaijin} is coming" |
| Western / Nordic / Norway mentions | 6 | Origin is shared by Eric and Carina (same bio), so not a variant |
| Gendered Japanese in the player's own lines (ぼく, おれ, わたし) | 1 hit of 私 | The player says only fixed polite phrases, so no first-person pronoun problem |

Estimate for a woman protagonist: about 12 name lines to tokenise (mechanical), about 3 lines to rewrite for neutrality ("the new guy" becomes "the new person" or a token), 0 for pronouns. So about 15 of about 510 player-facing lines need a touch, roughly 97% neutral already. The same applies to docs/game/stories: 27 files mention "he/his" about the player in prose (design docs, not shown to the player) and can say "the protagonist" over time; not needed for the slice.

Not neutral and needing per-variant content: see section 3 (c) and the private side. In public story, nothing needs a per-protagonist file apart from possible romance-flavoured lines for later days, which do not exist yet.

## 3. Cast as roles

### How characters are referenced today

- Story files: by id in `say`, `who`, `from`, `to`, schedule blocks and `talk:<id>` triggers. Counts of those references in game3d/story: mio 186, mori 110, guard 106, kuroda 69, kenji 58, emi 26, kuro 24, aoi 15, rei 1, mizuno 0 (Mizuno does not exist in the game, docs or code; the name appears only on the private side).
- Code: quoted ids in game3d/js (count, files): mio 109 / 20, mori 58 / 14, kenji 44 / 12, kuroda 25 / 13, guard 16 / 9, aoi 14 / 9, emi 11 / 7, rei 9 / 7, kuro 5 / 4. Mio has her own loaders (`mioBody`, `game.mioNpc`, js/mio.js, js/vrm/mio.js), 46 references to `mioNpc`/`mioBody`.
- Per-person tables: bonds/cast.js (tastes, register, rel, scene gates, one block per person), ui/portrait-data.js (faces), chibi.js `HEIGHT`, story/people.js (People panel text), bonds/day1.js (memories and facts written per person, about 25 entries), audio voice manifest (per speaker), assets/portraits, assets/characters/<id>, relaxed-idle-<id>.json, bible/facts.yaml.
- Flags: named after beats, not people (`lunch_mio`, `lunch_mori`, `mio_named`, `mio_warm`). Bond keys are per person id in the save. There is no `friend.<id>` flag family (one stray hit in a tool).
- Places and schedules: each place's story file has a `schedule` map by person id and period (gate.js: `aoi: { '*': { hide: true } }`), and places/catalog-*.js place people on named spots. Tickets are authored with a person in the text ("Closed by Mio after Eric's test copies..." in story/tickets.js:6) and hand-over text in end.js:90 ("from Mio, B2").

### What a role layer needs

A `roles` table (data file, JSON, no scripting): `role -> person id`, plus one record per person: `name`, `name_jp`, `gender` tokens, `portrait set`, `model/rig folder`, `height`, `voice prefix and description`, `speech style` (register towards the player: casual or polite, and the 1-2 sentence voice sheet the TTS and writers use), `likes/dislikes` (today in bonds/cast.js). A cast set is: `{ team_lead: emi, senior_dev: mio, ... }` chosen at new game and stored in the save as `cast: {role: personId}`. The story addresses roles (`say: 'role:team_lead'` or a token) and the engine resolves it. Personal tables (bonds/cast.js, portrait-data.js, chibi HEIGHT, people.js) become one record per person looked up by id, which is mostly a move of existing data.

### How deeply each person is hard-wired

Role versus person, by beat on day 1 and 2:

| Person | Role in the story | What is the person, not the role |
|---|---|---|
| Mio | Seat partner on the train, the person who teaches `gaijin`, B2 programmer, copier owner, lunch choice, the day-1 text messages (`miotext`), the day-end handover | Her mum and the bag (train catch beats), her dry voice, the cat jokes, the 外人 gentle correction. The train opening, the copier lines and the end handover are written around her voice; the plot beats would survive a swap, the lines would not. Very deep. |
| Emi | Team lead who appears once at the end of day 1 ("You must be Eric. Emi, I run this lot") and in the budget story | Little: 26 story references, introduction and a few lines. A male team lead is a name, a portrait, a body, a voice and about 26 lines in his register. Role-ready. |
| Kuro | Lobby receptionist | 24 references, no plot weight. Role-ready. |
| Aoi | New hire, mostly hidden on day 1 (`aoi: hide`) | Light. Role-ready. |
| Rei | Sales, reitext message, not met on day 1 | 1 story reference. Role-ready. |
| Kenji | Newest engineer, the chair beat, "Eric! After work. Food." | Chair and pat beats and the kiddish English voice are him. Medium. |
| Mori | Former manager, copier, tea and cups, the seven cups beat | Strongly him (ski-jump mime, dusty cups, 入れて whisper). Deep. |
| Guard (Ishibashi) | Gate guard, the cat he says is not there, the briefcase mime | Strongly him. Deep. |
| Kuroda / Hamada | Man stuck in the gate | Plot function, 69 references; medium. |
| Mizuno | Not in the public game | n/a |

Conclusion: swap by role is cheap for team lead, receptionist, new hire and sales. A "male secretary" fits the receptionist role without story change. Mio, Mori, Kenji and the guard carry authored comic beats; for them a swap means rewriting the beat for the new person, so treat them as "fixed roles with one default person". Do not try to make the whole cast swappable at once.

### Where the fixed person is assumed (for a cast set)

- Story: speakers declared per place with a name; voice keys `ln-<hash>` are hashes of the text, so changing a person's lines needs a new clip (about 417 `ln-` and 109 `oh-` clips exist).
- Places: person spots and schedules by id in about 14 place files; catalog-*.js.
- Tickets: the example ticket names Mio; the hand-over line names Mio.
- Voices: one clone per person (tools/voice-refs/*.wav), manifest in game3d/tools/voice-manifest.mjs by `speaker`.
- Bonds: gates for turn and payoff scenes are written per person (bonds/cast.js); a replacement person with no scenes has no step-3 to step-5 content until written.
- Portraits and models by id folder; the cast `HEIGHT` table.

## 4. Voice, portraits, 3D models, animations

### Inventory of protagonist-specific assets (Eric)

- Voice: 14 word clips game3d/audio/eric-*.mp3 (of 603 clips in game3d/audio); clone references tools/voice-refs/eric-*.wav (5 versions: nordic, v2, v3, v3-lighter, eric-voice). The player's 64 spoken English lines are written, with clips in the `ln-` set.
- Portraits: game3d/assets/portraits/eric-{neutral,surprised,tired}.webp (3 of 26 files). Art pipeline output: art/production/PC (eric, eric-anime2 to 5, eric-expr1, about 350 files), art/candidates/portraits/eric* (about 260 files), tools/eric_anime2..5.py, tools/mc_options.py (ten protagonist options, one of them "09-nordic-woman", a 28-year-old Nordic woman with a strawberry-blonde bob, already rendered as a candidate set).
- 3D: game3d/assets/eric/{base.webp, idle.glb, run.glb, walk.glb, sit.glb}; assets/characters/chibi-eric and relaxed-idle-eric.json; Meshy rig and retarget via tools/characters/meshy.py and retarget.py; shots game3d/shots/eric-*; test pages game3d/tools/eric-test.html, eric-face-shots.mjs, eric-gesture-check.mjs, eric-canvas-shots.mjs.
- Files with the word eric in tools: 59 python and 28 js/mjs.

### How they are generated

- Portraits: local ComfyUI with the Anima model on the GPU (skill portrait-round, tools/production.py, tools/local_round*.py), judged by Jørgen in a Review item. Every asset needs his approval before it goes in a build.
- Voice: local Qwen3-TTS clones (skill voice-clips, tools/voice/ gen_takes.py, check_takes.py, export.py; manifest by game3d/tools/voice-manifest.mjs). Needs a reference clip and its text per voice.
- 3D: ChatGPT chibi concept, then Meshy image-to-3D and Meshy rig and animation (art/PROMPTS.md "3D character workflow"; Meshy credits are limited: GUIDE says do not waste points). The code-built chibi is the fallback.
- tools/creator (experiment: cut parts of Mio and Eric, swap hair/eyes/clothes on closed base bodies, "Save recipe" to JSON, "Apply JSON"). The game does not use it yet. It could feed a custom MC as a recipe file (body id, six parts, colours, height) that the protagonist config points to; the config would carry `model.recipe: "recipes/custom-1.json"` and a runtime builder would be needed (not built; an offline export to glb through tools/creator/export-glb.js already exists). That is the route for "player chooses a look" and is a later, separate job. The slice below does not need it.

### What a new protagonist (Carina) costs

| Asset | Work | Cost |
|---|---|---|
| Portraits (3 faces plus decide on a base) | one decision round and one expression round on the local GPU, using the existing nordic-woman option as a starting point; red-rim, frame and glasses checks; Review item | M, 4 to 6 agent-hours GPU time, plus Jørgen's picks |
| Voice | pick a reference, make 14 word clips plus around 64 + player lines (about 25 of those are unique spoken lines) | M, 3 to 4 hours, run on the manifest |
| 3D body | Meshy image-to-3D, rig, walk/run/idle/sit, 4 gesture clips retargeted | M, 3 to 5 hours and Meshy credits (roughly the Eric round) |
| Chibi fallback | chibi build entry | S, 1 hour |
| Integration | config, seat and camera check | counted in section 1 |

Option to cut cost: Carina reuses Eric's skeleton and animations by retargeting (retarget.py), so only the body mesh and texture are new.

## 5. Tests and checks

| Check | Assumes Eric or cast? | Change |
|---|---|---|
| `npm run check` (tools/check/run.mjs: syntax, lint, format, budgets, dependencies, unit tests, story, choices, language, facts, story map) | Unit tests with Eric fixtures: game3d/test/unit/saved-people, say-guard, steer-release, tickets, crowd-give-way, asset-source. Fixtures: structural-baseline.json, declarations-before.json | Fixtures keep `eric` as the default; add `PLAYER_ID` constant in tests. S |
| story-check (game3d/tools/story-check.mjs:49) | A hard-coded list of valid ids includes `'eric'`, `'player'` | Read the ids from the config. S |
| facts sync (tools/facts/check.mjs, bible/facts.yaml:26 to :37) | Eric entry with `game: eric`, voice prefix `[eric, player]`, portrait list | One entry per protagonist plus a `cast sets` table |
| fast test (game3d/tools/fast.mjs, `?test=fast`) | Whole-day run plays Eric; routes in game3d/test/routes (arrival.mjs:64 uses node `its_eric`, office.mjs) | Add `?mc=carina`; the node id `its_eric` should be renamed `its_name` |
| voice manifest (voice-manifest.mjs lines 4, 43, 63) | Writes `eric-<word>` keys | Prefix from the config; fast.mjs "NO CLIP" will then flag Carina's missing clips (good) |
| game3d/tools (52 files with eric): shots, soft-collision (52 hits), chair-check, steer-check, seat-check | Screenshot and geometry checks reference the player | Leave as Eric-only for now; add the one seat-check run for Carina |
| language audit (lang-audit.mjs, tools/lang) | `エリック` in the word list (lang.js:57) | Comes from config |
| private-plugins unit test | Loads plugins; not the user folder | Unchanged |

How to parameterise: `?mc=<id>` selects the protagonist (default `eric`, existing `?eric=chibi` kept as a legacy switch), `?cast=<set id>` selects a cast set (default `default`). Both are written into the save at new game, so a Continue ignores the query string (as `?day=2` does today). Every check script that opens a page gets an optional `--mc` and `--cast` that is appended to the URL. For CI and `npm run check`: run the full set for the default, and a short smoke (title, train opening, gate) for each other protagonist, so the cost grows slowly.

## Addition: N protagonists and a custom one; cast sets

### (a) What the protagonist config must hold

For N and for a custom one (all plain data, JSON):

- identity: `id`, `name`, `name_jp`, `name_kana` (for the lang.js gloss and the 外人 line), `gender` plus pronoun tokens (`he/she/they` set), and `title` if needed.
- address: for each cast person, the player's address comes from that person's record (`calls_player: {mori: "{name}さん", kenji: "{name}-san"}`), with a default of `{name_jp}さん`. Mori and Kenji speak in their own style; address is the only per-protagonist difference.
- look: `portraits` (a folder and face list; for a custom one a generated bundle of 3 faces), `model` (folder of glb or a creator recipe), `height`, `outfit`.
- voice: `prefix`, `voice_ref` (wav and text), `voice_description`. A custom MC can have no voice: then player lines show text only (the engine already supports lines without a clip) and the word clips are silent or a stock voice by gender (female stock or male stock, 14 clips each).
- bio: `job`, `contract`, `level` (all the same for Eric and Carina).
- tags: `romance: ["any"]` or a list, used only by private scenes and later bond content (bisexual: both). Carina is `bisexual`; the public game ignores it.

The creator (tools/creator) can feed this by writing a recipe JSON and, offline, exporting a glb and 3 face renders. Custom character creation at run time (browser) needs a builder that does not exist in game3d, so a custom MC in the first versions is: pick from a gallery of pre-made bodies and faces, type a name, pick a gender token set. That fits "data files plus tokens".

### (b) What a cast set is

A cast set is a small file: `id`, `name`, `roles: { team_lead: "emi", receptionist: "kuro", secretary: "kuro", ... }`, with the person records in a separate `people/<id>.json`. Chosen at new game (a screen with a default and a "randomise" choice), stored in the save as `cast` (set id plus the resolved role map, so a later change in the data does not break old saves). What assumes a fixed person per role today: schedules and place spots (14 place files), `say:` ids (about 424 lines), bond gate scenes (bonds/cast.js), voice clips by text hash, portraits and chibi tables by id, tickets and end-of-day text that name Mio, People panel texts (story/people.js), the memory and fact lines in bonds/day1.js (about 25 entries that say "him" and "her"). The change is: the engine resolves a role id to a person id once at load, and all lookup tables are keyed by person id as now. This keeps stories written to person ids working (Mio stays Mio) and lets new, light roles use role ids. Do not rewrite existing story to role ids.

### (c) Text that cannot be token-based

- Voiced lines: a clip is per text (hash). A token such as `{name}` inside a voiced line needs a clip per name. Solution: keep the player's name out of voiced lines, or make the clip for the name a separate short clip (e.g. "Eric-san" as its own sound) and avoid inlining. The 12 name lines are mostly voiced (office.js:180, :560, shotengai.js:62), so each of them needs a clip per protagonist anyway: about 12 clips per protagonist.
- The 外人 lesson (train.js:210 to :215) explains a word that depends on being a foreigner; fine for both, but the line "it's like saying the new guy" must become gender-neutral text. One text edit.
- Lines spoken by the replaced person in their own voice: per-person writing, e.g. a male team lead replacing Emi needs those 26 lines rewritten in his register and voiced. This is per-variant content, not tokens. The role record has a `speech_style`, but lines are authored; do not try to auto-generate them.
- Japanese: address and politeness of NPCs are fixed by register in bonds/cast.js; a token `{player_called}` covers names. Verb endings that mark the speaker's gender in Japanese (e.g. だわ, ぜ) are not used for the player, so there is nothing to vary.
- Private scenes: per protagonist and per cast; see section 6 in the final message (counts only).
- Narration that describes a body ("his hands", "tall") would not be token-safe; day 1 has none today. A rule for writers: narration about the player stays in second person and describes actions, not the body.

## 7. Recommended order and the first slice

Order:

1. Protagonist config and loader, `?mc=` and the save field (code).
2. Name and address tokens in the 12 lines and the one "new guy" line (story).
3. Carina assets: portraits, then voice, then 3D body (art/voice), in parallel with 1 and 2 using a placeholder.
4. Check pass: story-check, facts, voice manifest and a fast-test run with `?mc=carina`.
5. Cast layer: person records move out of bonds/cast.js, portrait-data.js, chibi.js and people.js into `people/<id>.json`; role map; start with the light roles (team lead, receptionist, new hire, sales).
6. Cast set picked at new game and saved; a second set (male secretary, male team lead) as a proof, with its lines written by Codex.
7. Custom MC: gallery picker and typed name; creator recipe export only after the first six.

Minimal first slice: a second protagonist can walk the day-1 opening (train, gate, to the office). Use placeholders for art: Carina uses Eric's skeleton with the existing nordic-woman portrait candidate or the code-built chibi, silent word clips (or Mio's). The slice proves: config, tokens, `?mc=carina`, save field, fast test passes to the gate.

First five tasks:

| # | Task | Owner | Size |
|---|---|---|---|
| 1 | Add game3d/data/mc/eric.json and carina.json (name, name_jp, tokens, portraits, model, voice prefix); loader module; `game.mc`; `PLAYER_ID`; `?mc=` switch; `mc` in the save and its migration; remove the 24 name strings from js | claude-main | M, 5 to 6 h |
| 2 | Replace the 12 name lines and the "new guy" line with tokens (`{mc.name}`, `{mc.name_jp}`, `{mc.called}`); keep Eric's output byte-identical; story-check and facts check read ids from the config; rename node `its_eric` | Codex | S, 2 h |
| 3 | Carina decision round: portraits for 3 faces from the nordic-woman candidate; red-rim, frame and glasses checks; Review item. Then body: Meshy round on the same skeleton | staff-model art agent (portrait-round skill, then art-round) | M, 6 to 10 h with Jørgen's picks |
| 4 | Carina voice: pick a reference, make the 14 `carina-<word>` clips and the 12 name-line clips; manifest prefix from the config | staff-model voice agent (voice-clips skill) | M, 3 to 4 h |
| 5 | Parameterise checks: `--mc`/`--cast` on fast.mjs and the route runner, a Carina smoke run (title, train, gate), and a seat/camera check with the new body | claude-main (builder) with a reviewer pass | S to M, 3 to 4 h |

Total for the slice: about 20 to 30 agent-hours across the owners, of which about 8 are blocked on Jørgen's picks. Cast roles (steps 5 and 6 of the order) add about 20 to 30 more hours for the light roles; swapping Mio, Mori, Kenji or the guard would add story rewriting and is not recommended now.

## Effort summary by layer

| Layer | Size | Agent-hours |
|---|---|---|
| Code: config, loader, tokens, save | M | 12 to 17 |
| Story and text for a woman protagonist | S | 2 to 4 |
| Assets for Carina (portraits, voice, body) | M to L | 12 to 20 (+ Meshy credits) |
| Tests and checks | S to M | 4 to 6 |
| Cast role layer (light roles) | M to L | 20 to 30 |
| Cast role layer (all, with story rewrites) | L | 60+ (about, not recommended) |
| Custom MC (creator recipe, gallery) | L | 30+ (about) |
