# Day-1 pacing check, revised script

Run on the revised `day1-draft.md` and `game/data/script.js` (2026-09-25) with `tools/lang/pacing.py`, after splitting and simplifying every line the first report (`pacing-day1.md`) flagged. For Jørgen's profile one line is left over budget: the monorail announcement, which GUIDE gives word for word and which the player only needs 右 from (the door choice is shown in English). The beginner profile is still heavy (42 lines); that needs lighter beginner lines or more English support, not more cuts to the shared script.

### Absolute beginner (はじめて)

- 126 lines and 45 options checked. New over the day: 162 words, 39 grammar points.
- Lines over the one-new-item budget: 42 of 126. Over 16 characters: 1; over 24: 0.
- Choice screens over two new items: 8.
- Words shown in kana because a kanji is still hidden: 176.
- Katakana words to read (weak script): 28.

| Line | Text | Len | New | Flags |
|---|---|---|---|---|
| monorail:12 | ようこそ、天川へ。 | 7 | words: ようこそ; grammar: Direction へ | 2 new |
| monorail:14 | ここが天川シティです。 | 10 | words: ここ; grammar: Subject particle が, Polite copula です | 3 new |
| monorail:16 | あなたの部屋 | 6 | words: あなた, 部屋; grammar: の linking nouns | 3 new |
| monorail:17 | 寮・二階　203 | 6 | words: 寮, 二階; grammar: Numbers and counters | 3 new |
| monorail:18 | 荷物は、もう部屋にあります。 | 12 | words: 荷物, もう, ある; grammar: Topic particle は, に: time, place, target, Polite verbs 〜ます | 6 new |
| monorail:20 | ゲートで見せてください。 | 10 | words: ゲート, 見せる; grammar: で: place of action, means, Polite request 〜てください | 4 new |
| monorail:21 | チェック（２分） | 6 | words: チェック, ２分 | 2 new |
| monorail:35 | まもなく、天川シティ中央駅です。お出口は右側です。 | 22 | words: まもなく, 中央駅, 出口, 右側 | over 16, 4 new |
| monorail:41 | おはよう！九時に地下二階に来てね。 | 15 | words: おはよう, 九時, 地下, 来る; grammar: Casual request 〜て, te-form: る-verbs and する/来る, Sentence-end ね | 7 new |
| gate:48 | ちょっと、止まって。 | 8 | words: ちょっと, 止まる; grammar: te-form: う/つ/る → って | 3 new |
| gate:50 | 見ない顔だな。 | 6 | words: 見る, 顔; grammar: Plain negative 〜ない, Casual copula だ | 4 new |
| gate:51 | IDカード、カメラに見せて。 | 11 | words: IDカード, カメラ | 2 new |
| gate:60 | 企画室7？　地下の連中か。 | 10 | words: 連中; grammar: Casual question (rising tone) | 2 new |
| office:95 | 今、ゲーム中。 | 4 | words: 今, ゲーム | 2 new |
| office:102 | 私はエミ。ここのリーダー。 | 9 | words: 私, リーダー | 2 new |
| office:108 | うん、それでいいよ。 | 8 | words: それ, いい | 2 new |
| office:112 | さっそく、お願い。 | 7 | words: さっそく, お願い | 2 new |
| office:114 | これ、コピーして。十部。 | 8 | words: これ, 十部 | 2 new |
| office:115 | 十一時の会議で、使う。 | 9 | words: 会議, 使う | 2 new |
| office:117 | コピー機、ちょっと古いよ。 | 10 | words: コピー機, 古い | 2 new |
| office:118 | ちょっとじゃない。 | 8 | words: ない; grammar: Negative copula じゃない | 2 new |
| office:121 | ……また、つながらない。 | 8 | words: また, つながる | 2 new |
| office2:257 | おかえり。……え、できた？ | 8 | words: おかえり, できる | 2 new |
| office2:264 | 百部？　だれが読むの。 | 8 | words: 読む; grammar: Explaining の / んだ | 2 new |
| office2:266 | 二十部？　……多いほうが、いいか。 | 11 | words: 多い, ほう; grammar: Comparison より / ほうが | 3 new |
| office2:270 | うそ。あのコピー機で？ | 8 | words: うそ, あの | 2 new |
| office2:274 | ありがとう。助かる。 | 8 | words: ありがとう, 助かる | 2 new |
| office2:280 | 三階の営業部に行って。 | 10 | words: 行く; grammar: te-form: く → いて (行く → 行って) | 2 new |
| office2:281 | 黒田さんの数字が、ほしい。 | 11 | words: 数字, ほしい | 2 new |
| office2:282 | 二回、聞いた。 | 5 | words: 二回, 聞く | 2 new |
| office2:285 | あの人、こわいよ。 | 7 | words: 人, こわい | 2 new |
| sales:299 | 今、忙しい。午後に来て。 | 9 | words: 忙しい, 午後 | 2 new |
| office3:360 | ……どうやったの？ | 6 | words: どう, やった | 2 new |
| evening:397 | 会議、けっこううまくいった。 | 12 | words: けっこう, うまい | 2 new |
| evening:400 | 数字がなくて、ちょっと大変だった。 | 15 | words: 大変; grammar: te-form linking (and, then, so) | 2 new |
| evening:403 | コピー、みんなにわらわれた。 | 11 | words: みんな; grammar: Passive 〜れる / 〜られる | 2 new |
| evening:405 | あと、のこりの九十部、どうする？ | 13 | words: あと, のこり | 2 new |
| evening:406 | 今日は、もう帰っていいよ。 | 11 | words: 帰る; grammar: Permission 〜てもいい | 2 new |
| evening:412 | 駅のとなり。……電話、してね。 | 10 | words: 駅, となり, 電話 | 3 new |
| dorm:441 | ゆっくり寝てね。また明日。 | 11 | words: ゆっくり, 寝る, 明日 | 3 new |

(2 more flagged lines not shown.)

Choice screens over budget:

- monorail:22 (4 new): チェックする / はじめて / すこし / N3ぐらい
- monorail:37 (3 new): 右のドア / 左のドア
- gate:53 (4 new): IDをカメラに見せる / 笑う / 何もしない
- gate:63 (3 new): はい、よろしくお願いします。 / うん、よろしく。 / ……いつも？
- office:89 (5 new): 新人だよ。よろしく。 / 今日からここで働きます。よろしくお願いします。 / そっちこそ誰？
- copyroom:136 (5 new): ボタンを押す / パネルを開ける / たたく
- copyroom:223 (3 new): たたいた。 / なおした。 / 何も言わない
- sales:302 (4 new): お願い。今、ほしい。 / 会議の前に、ほしい。 / わかった。じゃあ、午後にまた来る。 / 言霊 　見ている人：一人 / 待つ / 言霊 　見ている人：なし

### Early intermediate: mid-N5 with gaps (Jørgen, placement quiz 2026-09-24)

- 126 lines and 45 options checked. New over the day: 77 words, 13 grammar points.
- Lines over the one-new-item budget: 1 of 126. Over 16 characters: 1; over 24: 0.
- Choice screens over two new items: 0.
- Words shown in kana because a kanji is still hidden: 119.
- Katakana words to read (weak script): 28.

| Line | Text | Len | New | Flags |
|---|---|---|---|---|
| monorail:35 | まもなく、天川シティ中央駅です。お出口は右側です。 | 22 | words: まもなく, 中央駅, 出口, 右側 | over 16, 4 new |

### N3 learner

- 126 lines and 45 options checked. New over the day: 27 words, 0 grammar points.
- Lines over the one-new-item budget: 1 of 126. Over 16 characters: 1; over 24: 0.
- Choice screens over two new items: 0.
- Words shown in kana because a kanji is still hidden: 0.

| Line | Text | Len | New | Flags |
|---|---|---|---|---|
| monorail:35 | まもなく、天川シティ中央駅です。お出口は右側です。 | 22 | words: まもなく, 中央駅, 右側; kanji with reading: 央 | over 16, 3 new |
