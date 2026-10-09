# Kuro drift list

These are the Kuro lines in game3d/story/ that break [voice.md](voice.md). I checked them on 2026-10-09 after Jørgen's notes on character-voices-1: "She is very japanese and would demand more japanese knowledge even for visitors, proud to be japanese and a bit xenophobic of pure english speakers, you need to make an effort, but she really appreciates that", and "where kuro is flirtatious and direct in her approach, she still views the player as an equal in the end". Nothing in game3d/ has been changed.

E means she speaks English where she would speak Japanese. S means the line is too soft for her: she defers, asks permission or makes herself small. B means she makes a booking with a time before Eric knows 〜時, 二人 and 私/あなた (see [sample.md](sample.md), Words this needs).

How to read a rewrite: 「…」 is an overheard Japanese line (`overheard: true`). Loanwords, digits and names in it get a line-only `clear`, and known words come through sharp on their own. Text in [brackets] is a gesture or a hook. "…" in quotes is an English line, which she keeps for a few front-desk phrases. Every rewrite keeps the meaning readable from known words, loanwords and the gesture, and each one needs a new voice clip.

Lines not listed are fine as they are. They are short Japanese a learner can follow from the gesture (「{ohayo}。どうぞ。」, 「お疲れさまです。」), word lessons (`{oyogu}。`, `{yasumi}。`), or Japanese said to someone else.

## Day 1 (forecourt.js)

| Id | Why | Current | Rewrite |
|---|---|---|---|
| `kuro_intro` (line 61) | E | {ohayo}. Which floor, please? | 「おはようございます。……何階ですか。」 [waits; when he doesn't answer, flat] "B2?" |
| `kuro_intro` (line 63) | E | You're allowed to say good morning first. | [taps the counter and doesn't point to the lift yet] 「まず、{ohayo}、でしょう？」 |
| `kuro_intro` (line 65) | E | Do come and say it tomorrow. | [points at him, then at the counter] 「明日も、ここで言ってくださいね。」 [small smile] |

## Day 2 (day2/forecourt.js)

| Id | Why | Current | Rewrite |
|---|---|---|---|
| `d2_kuro_talk` (line 24) | E | I have to make a call. See you later? | [lifts the desk phone and holds up one finger] 「電話です。また、あとで。」 |
| `d2_kuro_greet` (line 38) | E | You remembered. | [puts her pen down and smiles] 「覚えてたんですね。」 |
| `d2_kuro_work` (line 43) | E | Tomorrow is my day off. | Cut it. 明日は{yasumi}です already says it, and the slow {yasumi} follows. Point at herself on 私 (her line becomes 明日は私、{yasumi}です) so the `watashi` lesson in sample.md can sit here. |
| `d2_kuro_weekend` (line 51) | E | I go swimming. Can you swim? | [mimes a stroke] 「プール、行きます。泳げますか？」 [points at him] |
| `d2_kuro_swimmer` (line 58) | E, B | Come tomorrow, then. After six. | 「じゃあ、クラブで。」 [points toward the plaza board] No time yet. Eric's "You said after six" in `club_swimming_intro` (clubs.js line 96) has to go with it. |
| `d2_kuro_beginner` (line 62) | E, B | Slow is fine. Come tomorrow, after six. | 「ゆっくりで、いいですよ。クラブで。」 [points toward the plaza board] |
| `d2_kuro_ok` (line 67) | E | Then you came just to talk? | 「じゃあ、話しに来ただけ？」 [leans on the counter, waits] |

## Day 3

| Id | Why | Current | Rewrite |
|---|---|---|---|
| `d3_kuro_lunch` (day3/shotengai.js lines 103, 107) | E | Hello. It's strange without a counter between us, isn't it? | 「こんにちは。カウンターがないと、変な感じですね。」 [taps the table between them] |
| `d3_kuro_lunch` (day3/shotengai.js line 111) | E | Hello. Are you waiting to order? | 「並んでますか？」 [points at the till] |
| `d3_kuro_pool` (day3/pool.js line 26) | E | Enjoy it while it lasts. Next week it's the gym, and nobody has told me how we swim in a gym. | 「プール、今日で最後ですよ。来週はジムで。」 [mimes a stroke, then shrugs] |
| `d3_kuro_pool` (day3/pool.js line 28) | E | Good evening. You found the pool too. | 「こんばんは。来たんですね。」 [looks him over, smiles] |
| `d3_kuro_pool` (day3/pool.js line 29) | E | Good evening. Are you here for the swimming club? | 「こんばんは。クラブですか？」 |
| `club_swimming_intro` (clubs.js line 95) | E, S | You came! I wasn't sure if you'd remember. | 「来たんですね。」 [a long look] 「忘れると思ってました。」 |
| `club_swimming_intro` (clubs.js line 97) | E | And I still haven't told you my name. I'm Kuro. | [points at herself] 「玖路です。」 |
| `club_swimming_intro` (clubs.js line 99) | E | Good evening. No floor number tonight? | 「こんばんは。今日は、何階？」 [amused, points down] |
| `club_swimming_intro` (clubs.js line 101) | E | I'm Kuro, by the way. We never got as far as names at the desk. | [points at herself] 「玖路です。受付の。」 |
| `club_swimming_intro` (clubs.js line 103) | E | Good evening. I'm Kuro. I work at reception. | 「こんばんは。玖路です。本社の受付です。」 |
| `club_swimming_join` (clubs.js line 143) | E | The steps are on this side. | 「こっちです。」 [takes his arm and walks him to the steps] |
| `club_swimming_length` (clubs.js line 177) | E, S | Was that pace all right? | 「速かった？」 [touches his shoulder at the wall] |
| `club_swimming_sit` (clubs.js line 198) | E | They can carry their own things. Come down with me next time. | 「荷物は、自分で。」 [nods at the bags, then at the bench beside her] 「次は、{isshoni}。」 |
| `club_swimming_winter` (clubs.js line 219) | E | I still packed my goggles. | [holds up her goggles] 「持ってきちゃいました。」 |
| `club_swimming_winter_sit` (clubs.js line 230) | E | I should have brought thicker socks. | [rubs her feet on the gym floor] 「寒い……靴下、もっと厚いのにすればよかった。」 |
| `club_swimming_winter_leave` (clubs.js line 245) | E | See you another Saturday. | 「また土曜日に。」 [points at him] |

## Day 4

| Id | Why | Current | Rewrite |
|---|---|---|---|
| `d4_kuro` (day4/shotengai.js lines 66, 73) | E | I came for washing powder. I have to keep saying it or I'll get home without it. | 「洗剤、洗剤……」 [holds up her empty basket] 「言ってないと忘れるんです。」 |
| `d4_kuro` (day4/east_coast.js line 12) | E | Hello, {mc.name}. There's less wind at this end. | 「{mc.name_jp}さん。ここ、風が弱いですよ。」 [pats the bench beside her] |
| `d4_kuro` (day4/east_coast.js line 13) | E, S | Hello. This end is a bit more sheltered, if you want to sit. | 「こんにちは。ここ、どうぞ。」 [points at the bench] |

## Day 5 (day5/reception.js)

| Id | Why | Current | Rewrite |
|---|---|---|---|
| `d5_kuro_name` (line 3) | E | I'm Kuro. I work on reception. | [points at herself, then the counter] 「玖路です。受付です。」 |
| `d5_label` (line 12) | E | The long names fit now. Thank you. | [holds up a full label] 「全部、入ってます。ありがとう。」 |
| `d5_label` (line 13) | E | Could you look at the label printer? I put a request in this morning. | 「{mc.name_jp}さん、これ、見てください。」 [taps the printer] 「朝、頼みました。」 |
| `d5_label` (line 16) | E | The end of the name keeps getting cut off. I've been writing the missing part by hand. | [shows a label cut off mid-name, then the pen] 「名前が切れるんです。ずっと手で書いてて。」 |
| `d5_label_fix` (line 23) | E | Yes, that's the whole name. I'll print the rest like that. Thank you. | 「はい、全部です。」 [a pleased look at him, longer than needed] 「さすがですね。」 |

## Later (ongoing/winter.js, milestones/kuro.js)

The milestone scenes are superseded under #357 and will be rewritten whole. The lines below are listed so the rewrite doesn't carry them over.

| Id | Why | Current | Rewrite |
|---|---|---|---|
| `ongoing_winter_watch` (ongoing/winter.js line 71) | E | Of course. Same place. (to Emi) | 「はい、同じところで。」 She speaks Japanese to Emi too. |
| `ms_kuro_seat` (milestones/kuro.js line 8) | E, S | {mc.name}, which seat would you like? I'm keeping this one by the window. | [sits by the window and pats the seat beside her] 「{mc.name_jp}さん、ここ。」 |
| `ms_kuro_seat` (milestones/kuro.js line 12) | E | The one near the door gets cold every time someone comes in. I've done my turn there. | [nods at the door, rubs her arms] 「あそこ、寒いんです。」 |
| `ms_kuro_equipment` (milestones/kuro.js line 18) | E | She wants me to fetch a mat. I was just about to join that group. | [to Eric, rolling her eyes toward the member] 「私に取ってこいって。」 |
