# Day-1 pacing check

Run on `day1-draft.md` as of 2026-09-25 (121 lines, 45 reply and action options) with `tools/lang/pacing.py`. Rerun it after every draft change: `~/ai/lang/.venv/bin/python tools/lang/pacing.py --md out.md`.

Budgets from `day1-design.md`: a spoken line is 16 characters or fewer where possible and never over 24 (punctuation not counted); at most one item new to the player per line; a choice screen at most two new items across all options. An item is a new word or a new grammar point. A word or point counts as new only the first time it appears in the day, so the scene order matters. Kanji the player can't read yet don't count: the engine shows those words in kana. Interjections (え, ああ, へえ) and auxiliary verbs after て (〜てください, 〜てくる) aren't counted as words.

## Summary

| Profile | New words | New grammar | Lines over one new item | Choice screens over two | Words shown in kana |
|---|---|---|---|---|---|
| Absolute beginner | 188 | 48 | 53 of 121 | 9 | 201 |
| Jørgen (mid-N5, gaps; katakana weak) | 102 | 21 | 24 of 121 | 3 | 139 |
| N3 | 36 | 0 | 3 of 121 | 0 | 0 |

Length: no line is over the hard cap of 24. Seven are over 16, the same seven for everyone:

- monorail:33 まもなく、天川シティ中央駅です。お出口は右側です。 (22; a real announcement, fine to keep long)
- monorail:39 おはよう！九時に地下二階の企画室7に来てね。 (20)
- gate:48 見ない顔だな。IDカード、カメラに見せて。 (17)
- office:85 ふーん。……ミオ。今ゲーム中だから、話しかけないで。 (18)
- copyroom:216 ……エミさんがたたいても、動かなかったのに。 (18)
- office2:273 黒田さんから、去年の数字をもらってきて。 (18)
- office2:274 チャットで二回聞いたけど、返事ないの。 (17)

## Jørgen's profile: lines over budget

The profile: N5 words in the top 3,000 known; kanji band 1 plus the kanji he read in the quiz (日月人山水大小上下中食行見電車死); grammar known up to te-requests, たい, ない, じゃない and the basic particles. Casual past, ないで, けど, explanatory の and ている are counted as new.

Worst lines (3 or more new items):

| Line | Text | New |
|---|---|---|
| gate:57 | 変なことしたら、すぐわかるからな。 | 変, こと, すぐ; 〜たら, reason から (5) |
| monorail:33 | まもなく、天川シティ中央駅です。お出口は右側です。 | まもなく, 中央駅, 出口, 右側 (4) |
| monorail:18 | IDカード　企画室7・地下二階 | IDカード, 企画室, 地下 (3) |
| office:85 | ふーん。……ミオ。今ゲーム中だから、話しかけないで。 | ゲーム, 話しかける; 〜ないで (3; also 18 characters and a kanji with a reading, 話) |
| office:92 | 遅刻だよ、新人くん。ま、初日だし。 | 遅刻, 初日; 〜し (3) |
| office:105 | さっそくだけど、お願いがあるの。 | さっそく; けど, explanatory の (3) |
| office2:273 | 黒田さんから、去年の数字をもらってきて。 | 数字, もらう; 〜てくる (3; also 18 characters) |

Two new items (17 lines): monorail:16 寮, 棟 · monorail:20 日本語, チェック · gate:54 ダメ, 〜ても · gate:56 新人, 連中 · gate:64 気にするな, command form (also a kanji with a reading) · floor panel 屋上 庭園 and 二階 会議室・社内報 · office:94 君, casual past · office:95 リーダー, いちおう · office:103 試用期間, 三か月 · office:111 こわれる, 〜てる · office2:254 読める, セーフ · office2:270 さっき, adjective past · office2:274 チャット, 返事 · office2:276 がんばって, こわい · sales:313 渡す, だろう · office3:367 今度, ゲーム機.

Choice screens over two: the gate (IDをカメラに見せる / 名刺を出す / にっこり笑う: 名刺, にっこり, 笑う), Mio's question in office3 (運がよかっただけ / ひみつ / 黒田さん、やさしかったよ), and the dorm chat replies (かべ, 見える, つかれる across four options).

Katakana: 33 katakana words over the day, which is his weak script (tap for romaji).

## What this suggests

- The gate is the heaviest scene for a mid-N5 player. 変なことしたら、すぐわかるからな stacks three words and two grammar points in one line. A shorter threat keeps the mood: 「変なことするなよ。」 or split it into two lines.
- The first office scene introduces most of the day's grammar: casual past, けど, explanatory の, ている, ないで and し all arrive in lines 85 to 111. Spreading them (for example Emi's 遅刻だよ line without 初日だし, or さっそくだけど without the の) would keep each line to one new thing.
- Floor labels and the ID card are a pile of new nouns (企画室, 地下, 役員室, 会議室, 社内報, 屋上, 庭園). That's fine as long as the player only has to read the one they need and the rest stay tappable, which is what the design already says.
- For a real beginner almost half the lines carry two or more new items. The adaptive display helps (201 words drop to kana), but it doesn't reduce the vocabulary. The beginner route needs its own lighter lines or more English support on day 1; tuning the script to Jørgen's level alone won't fix that.
- N3 players are over budget only on the monorail announcement and the phone's ID and room screens (寮, 棟, 企画室, 中央駅, 右側), which is expected for place names.

## Limits of the check

- Branches are read in draft order, so a word first met in one branch counts as known in a later branch the player may never take.
- Word knowledge is modelled from JLPT lists and frequency, not from real play data. Once the game logs taps and look-ups, the profiles should come from those.
- Readings come from the tokeniser with overrides (`tools/lang/overrides.json`). In a hand check of 50 draft lines (76 words with kanji), unidic alone got 12 readings wrong (天川, 棟, 日本語, ２分, 九時, 一階, 今 ×3, 私 and similar); after the counter rules and overrides all 76 were right.
