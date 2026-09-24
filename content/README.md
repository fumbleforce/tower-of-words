# Content: days 2 to 5

Story and dialogue for Amakawa's first week after day 1. The files are data only. Nothing here is wired into the game yet.

| File | Day | Grammar (spell) | Katakana block |
|---|---|---|---|
| `day2.js` | Tue, the copier war | te-form requests, 〜たい (動いて; learn 大丈夫だよ) | コピー, インターン, メニュー |
| `day3.js` | Wed, Rei's question | 好き / questions with の (待って) | エレベーター, カフェ, コンペ |
| `day4.js` | Thu, Aoi's disaster | 〜てもいい？, casual の-questions (開けて) | パソコン, ファイル, バックアップ, パスワード |
| `day5.js` | Fri, interview and review | 〜たいの？ asked of others (大丈夫だよ) | インタビュー, カメラ, ゲーム, ビール |

Each file exports `DAY` and `SCENES` in the same format as `game/data/script.js`, including `{kanji|kana|key}` markup. Scene ids are prefixed `dayN_`, and each day starts at `dayN_morning`. `glossary-additions.js` exports `GLOSSARY_ADDITIONS`, with every markup key from days 2 to 5 that isn't already in `game/data/glossary.js`, plus the katakana words. Merge it with `Object.assign(GLOSSARY, GLOSSARY_ADDITIONS)`.

## New step types

- `pin: { prompt, fields: [{ id, label, options, answer }] }`: the player pins what they understood from a message. Each wrong field sets the flag `pin_<id>_wrong`.
- `elevator: { target, wrong: 'default' }`: a wrong floor costs time and returns you to the panel. `default` means the engine's standard reaction.
- `ifTime: { after: 'HH:MM', then, else? }`: branches on the in-game clock.
- `learnSpell: { key, form, en }`: adds a spell to the kotodama book with a small ceremony.
- `menu: { title?, items: [{ jp, en, price }], noPay? }`: prices are numbers in yen. With `noPay`, the menu is only for reading.
- `pay: { wallet: [...] }`: the player picks coins and notes from the wallet for the last menu pick. The engine gives change and checks the sum.
- `spell.witnesses`: a number, or `'auto'` (day 4: 1 for Ishibashi, plus 1 if `aoiWithYou`). Each witness adds suspicion risk on a botched cast.
- `spell.outcomes`: a map from a wrong form to steps. `default` catches the rest.
- `freeTalk: { with, turns, goal, target: [grammar], fallback }`: free typing checked for the target grammar. `fallback` holds the steps (a normal choice) used when free typing is off.
- `freeReply: { prompt, accept: 'any', then }`: one short typed answer, never marked wrong.
- `reviewMessages: { count }`: rereads today's last N messages with readings shown.
- `ifRel: { who, atLeast? | below?, then, else? }`: branches on relationship points.
- `findLabel: { prompt, options, answer, wrong }`: pick the right shelf label. `wrong` steps run once per miss.
- `glossNote: { key, show }`: pops the glossary card for one word (used for 閉鎖).
- `reward: { id, rating, caption }`: shows a reward CG. `rating: 'sensitive'` means it respects the content setting. With that setting off, show the caption over a dimmed background instead.
- Choice options may carry `correct: true` (counts toward the grammar score) and `if: 'flag'` (hidden unless the flag is set).
- `set` values can be strings (`articleTone: 'warm' | 'sharp'`).

## Assets these days need

- **Cast:** `aoi` (panic, grin), `yuzuki` (smile, serious, tired), `secretary` (neutral), and the existing expressions for everyone else.
- **Backgrounds:** dorm, copyroom, meeting, cafe, storage, execfloor, pr, mio_room.
- **Reward CG:** `mio_gamenight`. Mio asleep on the player's shoulder on a sofa, in a loose hoodie, still holding a controller, with the TV glow. Suggestive at most, and both people clearly adult.
- **Elevator panel:** the B1 label should read 地下一階 コピー室・倉庫.

## Flags across days

- `gotDocs` (day 1) → day 3: what Rei asks you.
- `helpedAoi` (day 2) → day 3 canned coffee, day 5 review.
- `lateMeeting`, `pin_thing_wrong` (day 2) → day 2 meeting, day 5 review.
- `mioSaturday` (day 2) + Mio ≥ 2 → day 5 game night reward (`mioGameNight`).
- `yuzukiSawDoor` (day 3) → day 5 interview question and suspicion.
- `aoiWithYou`, `hasKey`, `missedDeadline` (day 4) → day 4 witnesses, day 5 review.
- `saidProtect`, `articleTone`, `knowsYuzukiDream` (day 5) → for week 2: the article comes out Monday, and its tone follows `articleTone`.
- `askedMemo` (day 4) → Emi's Monday announcement can open differently.
