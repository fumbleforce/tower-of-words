# People plan: everyone on the Meshy pipeline

Jørgen, 2026-10-05: "we should be working on the rest of the people, the regular people, I dont want to see the old models anywhere". The approved method is art/PROMPTS.md, "3D characters: ChatGPT chibi, then Meshy". This note lists every person the game can draw and how to cover them all with as few models as possible. Checked against the code on 2026-10-05.

Done on 2026-10-16 (#643): the chibi kit, the old Mio and every code-built body are gone. A person whose model fails to load is a stand-in that is never drawn, with an error logged (game3d/js/train/people.js standIn and missing), and game3d/test/unit/people-meshy.test.mjs keeps its list of chibi() callers empty. The tables below are the 2026-10-05 survey.

## Bodies the game has today

- **Meshy cast:** game3d/assets/characters/<id>/ or assets/mio, assets/eric. Loaded by cast3d.js (CAST3D_ON), mio.js and avatar.js. This is the approved look.
- **Code-built (old):** `chibi()` in game3d/js/train/people.js, called by cast.js `PEOPLE`, crowd/looks.js, train/people.js `buildPassengers`, avatar.js `buildEric`/`makeAvatar` and train/screen-scenes.js. Unless the chibi setting is on, every unnamed person is drawn this way.
- **Chibi kit (rejected, "too creepy"):** chibi.js, chibi-crowd.js, chibi-passengers.js, chibi-builds.js and assets/characters/chibi-* (18 folders, 28 MB, including 8 generic `chibi-gen-*` bases). It has been off by default since 2026-10-04, but Settings > Graphics > Chibi cast and `?chibi=1` still turn it on.

## Inventory

"Old" means code-built `chibi()`. Counts are the most on screen at once.

### Named people

| Id | Who | Body now | Where, when | At once |
|---|---|---|---|---|
| eric | Player | Meshy (assets/eric). Old body is the fallback: `?eric=chibi`, or when loading fails (main.js boot) | everywhere | 1 |
| carina | Player (2nd MC) | **Eric's Meshy model** as a placeholder (data/mc/carina.json `model.id: eric`) | everywhere, when she is picked | 1 |
| mio | Programmer | Meshy (assets/mio) | train, gate, office, walk home | 1 |
| kuro, aoi, emi, mori, kenji, guard, kuroda (Hamada), rei | Named cast | Meshy (CAST3D_ON). The old body is the fallback if the files fail (cast.js:418 `meshy3(id) ?? own[id]()`), and in Node unit tests | train, gate, lobby, office, day-2 party, day-3 places | 1 each |
| yui, sota, nao, hiro | Old B2 figures | Old (nao and hiro are `PEOPLE.worker(1/2)`); built in scenes/office.js and hidden at line 1936 | nowhere visible | 0 |
| briefcaseMan | Unused | Old | nowhere (never called) | 0 |
| tama | Cat | code-rigged cat (creatures/cat.js) | not a person, out of scope | |

### Unnamed people with an id (talkable or in the story)

| Id | Who | Body now | Where, when | At once |
|---|---|---|---|---|
| youth, music, reader, bun | Train passengers (young man; girl with headphones; man with a book; woman with a bun) | Old (`buildPassengers`) | train, days 1 to 3 | 4 (with Aoi, Hamada and Rei, 7 + Eric) |
| stander | Train passenger | Old, hidden ("read as a burglar") | nowhere | 0 |
| (phone photos) | Young man in football kit; girl with guitar on her bed | Old (`chibi()` in train/screen-scenes.js) | train discoveries, on a phone screen | 1 |
| worker_a, worker_b | Office workers in the security room | Old `PEOPLE.worker(4, 2)` | gate, day 1 morning | 2 |
| commuter_1..3 | Commuters through the gate (3rd has a cake box) | Old `PEOPLE.worker(0, 2, 5)` | gate, day 1 morning | 3 |
| sales1, sales2 | Man and woman from Sales | Old `PEOPLE.worker(9, 1)` | lift, day 1 | 2 |
| canteen_worker | Closes the terrace (white top, teal apron) | Old `PEOPLE.worker(25)` | plaza, after work | 1 |
| attendant, member | Gym attendant, swim club member | Old `PEOPLE.worker(5, 1)` (places/day-cast.js) | gym and pool, day 3 | 2 |

### Ambient crowd (crowd/looks.js `makeBody`, all old)

Kinds are office (`PEOPLE.worker(i+7)`, about 1 in 3 a woman in a skirt), casual (men and women), elder (men and women, grey hair) and sport (joggers). The table shows the most people per period in crowd/data.js (walkers + sitters + chatting pairs + queue). Desktop high quality shows all of them up to a cap of 36; phones show 55 to 90% of them, capped at 14 to 22.

| Place | Early / morning / lunch / afternoon / evening | Kinds |
|---|---|---|
| forecourt | 19 / 6 / 18 / 6 / 21 | office, casual, elder |
| plaza | 18 / 8 / 25 / 11 / 24 | all four |
| shotengai | 14 / 11 / 28 / 13 / 24 | all four |
| east_lane | 17 / 7 / 16 / 7 / 18 | all four |
| east_coast | 8 / 5 / 8 / 5 / 15 | all four, mostly sport |
| sports | 12 / 4 / 9 / 5 / 13 | sport, casual, office |
| office_quarter | 19 / 7 / 18 / 7 / 16 | office, casual, elder |
| harbour | 10 / 6 / 10 / 6 / 11 | all four |
| dorm_court | evening 3 | all four |

Day 1 passes through the forecourt and plaza (early and evening) and the dorm court. The other places come on later days. There are no kids and no dock or works crowd in the game today, so no model is needed for them.

## Plan: 7 archetypes plus Carina

These replace the eight `chibi-gen-*` bases in the same roles, made in the approved cast style instead of the vinyl chibi. The routing in chibi-crowd.js (`generic`, `crowdBody`, `worker`, the per-region tint from a hair/top/bottom mask, `variant` cycling every colour mix before any repeats, ±5% height) and the prop moves in chibi-passengers.js (headphones, book, bun) carry over, minus the chibi switch.

| # | Archetype | Covers | Variety (free) |
|---|---|---|---|
| A | Office man: suit and tie, short dark hair | worker_a/b, commuters, sales1, reader, office crowd men | jacket 5 colours × hair 3, height, briefcase/tote |
| B | Office woman: blazer and skirt, hair in a low bun | commuters, sales2, bun, office crowd women, member | top 5 × hair 3 × skirt 2 |
| C | Young man, casual: shirt or light jacket | youth (and his football-kit photo, by tint), casual men, sport men | top 6 × hair 3 × trousers 2 |
| D | Young woman, casual: hoodie, shoulder-length hair | music (headphones as a prop) and her guitar photo, casual women, sport women, attendant | top 6 × hair 3 × bottom 2 |
| E | Older man: polo or knit, grey hair | elder men | top 5 |
| F | Older woman: cardigan, short grey hair | elder women | top 5 × hair 2 |
| G | Worker in an apron | canteen_worker (teal apron) | apron colour |
| own | Carina | the 2nd MC; needs her approved portrait first (Review carina-portrait-7b) | |

They must not look like the named cast: Mori and Hamada are both men in suits, so the office man gets a different face, hair and build. The named cast (Mio, Eric, Kuro, Aoi, Emi, Mori, Kenji, Ishibashi, Hamada, Rei) already have their own models. Nobody else needs one.

The worst repetition is the gate, where up to 3 office men are seen close together. Tints, heights and bags help there. If Jørgen still spots twins, a second face painted on the same texture costs nothing.

### Cost

Per model, one round. The ChatGPT pictures cost about $0.25 each in tools/spend.json, and a round has 5 to 6 (a1, a2, b1, c1, d1), so about $1.25 to $1.50. Meshy charges 5 for the shape, 10 for the texture, 5 for the rig and 3 for the sit clip, **23 credits**. The 8 cast models so far needed 1 to 3 rounds each (Kenji 69, Kuro 65, Aoi and Emi 43, Rei 28, the rest 23), about 40 on average.

| Option | Per model | 8 models, first try | 8 models, expected |
|---|---|---|---|
| Meshy rig + Meshy sit | 23 | 184 | about 320, over the balance |
| Our rig, as Rei's (rei-rig-1: the game's Meshy skeleton with Emi's bone orientations, so the cast's walk, run and sit) | 15 | 120 | about 210 |

The balance is 300. Savings on top of that: pass a shape before paying for its texture (a retry is 5, not 15), and get the pictures right in ChatGPT, where a retry costs $0.25.

### Order

1. Pilot: A and B (gate, lift, train close-ups). One Review each. Put them in the game, and Jørgen judges them with their tints and props on.
2. Then C to G, one Review each, with each round's lessons carried into the next picture.
3. Carina once her portrait is approved.
4. Removal (below) as soon as A to G are approved, in one builder task.

## Making sure no old body is seen

Remove or replace:

- cast.js: delete the `chibi()` bodies in `PEOPLE` (aoi … sota, worker, briefcaseMan) and the `?? own[id]()` fallback. `PEOPLE.worker(i)` becomes an archetype (A/B, every third a woman, as now). If a model fails to load, log an error and draw nobody; never draw a code body.
- scenes/office.js: delete nao, hiro, yui and sota (already "to remove" in docs/game/cast.md).
- train/people.js: `buildPassengers` gives archetype bodies (youth C, music D, reader A, bun B); delete stander, `buildPlayer` and finally `chibi()` itself and its helpers.
- train/screen-scenes.js: the two phone photos pose C and D.
- crowd/looks.js: `makeBody` always takes `crowdBody` (office A/B, casual C/D, elder E/F, sport C/D in sports tints); delete `casual`, `sport` and `elder`.
- places/day-cast.js, lift.js, lobby.js, lobby-commuters.js, canteen-closing.js: no change beyond `PEOPLE.worker` (canteen-closing takes G).
- avatar.js and main.js: delete `buildEric`, `makeAvatar` and `?eric=chibi`. If Eric's model fails, show an error.
- Chibi kit: delete the Settings toggle (settings.js `chibi`, migration), `?chibi`, chibi.js, chibi-builds.js, chibi-passengers.js, the chibi branches of chibi-crowd.js (keep its routing, renamed) and assets/characters/chibi-* (28 MB). Delete viewer/roster.js's "code" look too.
- Node unit tests that build places use a tagged test stand-in (an empty rig), never a code body.

Checks:

1. **Unit test** (game3d/test/unit/people-meshy.test.mjs, runs in `npm run check`): read every file under game3d/js and fail on `chibi(`, `buildPassengers`, `buildEric`, `makeAvatar`, `CHIBI_ON` or `?chibi`, and on any `assets/characters/chibi-*` folder. It also fails if `PEOPLE` or the crowd's `makeBody` returns anything but the archetype loader's object, using the test stand-in's tag. The allowlist is empty. Until the removal lands, it lists the remaining callers by file, so the count only goes down.
2. **Fast test** (game3d/tools/fast.mjs): `meshyFrom` and the archetype loader tag every body (`root.userData.person = 'meshy'`). At each place the run reaches, fast.mjs walks the scene and fails on any visible object that looks like a person without that tag. Until `chibi()` is deleted, it sets `root.userData.codeBody = true`, and any visible codeBody is a FAIL with the place and the period. This also catches a failed model load, which shows up as a missing body plus a page error.
