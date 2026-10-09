# Kenji drift list

These are the Kenji lines in game3d/story/ that break [voice.md](voice.md), checked on 2026-10-09 after Jørgen's note on character-voices-1: "no eric is younger, inexperienced and would see eric as a senpai. Eric is 37 (record this), with significant experience. in the game his english is too god." (Read "eric is younger" as Kenji.) Nothing in game3d/ has been changed.

E means his English is too good. J means he treats Eric as a peer or a junior (no さん, ordering him about, casual or slang Japanese to him, correcting him).

How to read a rewrite: 「…」 is an overheard Japanese line (`overheard: true`). Loanwords, digits and names in it get a line-only `clear`, and known words come through sharp on their own. Text in [brackets] is a gesture or a hook. "…" in quotes is an English line. Every rewrite keeps the meaning readable from known words, loanwords, English scraps and the gesture, and each one needs a new voice clip.

Lines not listed are fine as they are. Most are already broken school English ("Ah, sorry. Is loading. Very slow.", "Okay. I am quiet."), word lessons ({kanpai}!, "Is “want eat”. Me, yes!"), or Japanese said to someone else (office.js `ambient` to Mori, the `lunch_end` gate rumour, the `ms_kenji_delete` request to the club member).

## Day 1 (office.js)

| Id | Why | Current | Rewrite |
|---|---|---|---|
| `kenji_first` | E, J | {mc.name}-san? I am Kenji! Two months here, so now I am not the newest. Ah, sorry, your chair... I borrowed it. Mine is broken. | 「{mc.name_jp}さんですか？ケンジです。よろしくお願いします。」 [bow] "Ah... chair. Your chair. Sorry. My chair, broken." |
| `kenji_first` | E | I bring it back for you! It's in machine room, with the cat. Norway has the big forest cats, right? I see on YouTube, they are so big, like... | [point at the machine-room door] "Chair... there. Cat also." Then, brightening: "Norway... big cat? YouTube! Very big..." [hands wide] |
| `kenji_first` | E | ...Ah, no. Mio-san says I can't go in machine room anymore. Sorry! You go? | 「あ…でも僕、機械室はダメなんです。」 "Mio-san... no. Me, no." 「すみません、{mc.name_jp}さん、お願いします。」 [small bow] |
| `kenji_again` | E | Chair is okay? If you need anything, I help! Cables, printer, um... I know where is the good tape. My English is very little, but. | 「椅子、大丈夫ですか？」 [points at the drawer] "Tape... good tape, here. I know." "English... very little. Sorry." |
| `kenji_again` | E | Machine room. Chair. Cat. Sorry! | 「すみません、椅子…まだ機械室です。」 [points at the door, bows] |
| `kenji_small` | E, J | Ha! Okay, okay. Then we practise together. Same team! | [laughs, covers his mouth] 「えっ、本当ですか？」 "Me, English... {mc.name}-san, Japanese. Practice... together?" [small bow instead of the high five] |
| `ohayo_kenji` | J | かたっ！おはよう、でいいよ。 / おはよう。 (with a `clear` that teaches casual おはよう) | 「あ、おはようございます！」 [bow, deeper than Eric's]. Drop the casual おはよう line and its `clear`. A junior doesn't tell a senpai he's too polite. |
| `yoroshiku_kenji` | J | よろしく！ [fistbump] | 「よろしくお願いします！」 [bow instead of the fist bump] |
| `sumimasen_kenji` | J | え、何？大丈夫？ | 「あ、はい！…大丈夫ですか？」 |
| `gift_kenji_melon` | J | マジで？神！ | 「えっ、いいんですか？」 |
| `gift_kenji_melon` | E | Melon! You are genius. Now I owe you, I fix anything for you. Well... I try. | "Melon soda! Thank you, {mc.name}-san." [bow] 「今度、何か手伝います。…がんばります。」 "I help. ...I try." |
| `gift_kenji_other` | J | あ、ありがとう… | 「あ、ありがとうございます…」 |

## Day 2

| Id | Why | Current | Rewrite |
|---|---|---|---|
| `d2_invitation` (day2/office.js) | J | {mc.name}! After work. Food. Welcome food! | 「{mc.name_jp}さん、今日、歓迎会です。」 "Welcome... party. Food." [mimes eating] |
| `d2_invitation` (day2/office.js) | E | I help Mori-san. Then... izakaya. Blue curtain. We meet there. | "Me... Mori-san, help. After, izakaya." [draws a hanging curtain in the air] "Blue... curtain." 「そこで会いましょう。」 |
| `d2_meet_kenji` (day2/shotengai.js) | J | {mc.name}! This way. Mori-san is there. | 「あ、{mc.name_jp}さん！こちらです。」 [points at the curtain] "Mori-san... inside." |
| `d2_kenji_wait` (day2/shotengai.js) | J | Mori-san has table. Come in! | 「どうぞ、どうぞ。」 [holds the curtain aside] "Mori-san... table." |
| `d2_supper` (day2/izakaya.js, after Emi arrives) | E | You like chicken? Mori-san ordered vegetables also. | 「{mc.name_jp}さん、焼き鳥、どうぞ。」 [slides the plate over] "Chicken. Vegetable also... Mori-san." |
| `d2_goodnight` (day2/izakaya.js) | E, J | Yes! See you Monday, {mc.name}. Computer game also, maybe? | 「お疲れさまでした！」 [bow] "Monday... see you, {mc.name}-san. Game also... maybe?" |
| `d2_no_drink` (day2/izakaya.js) | E | Okay. Tea is here, if you want. | 「お茶もありますよ。」 [lifts the teapot a little] |
| `d2_kenji_wait` (day2/izakaya.js) | J | Food is there. This way! | 「こちらです。」 [gestures at the table with an open hand] |

## Day 3 and the dorm sofa

| Id | Why | Current | Rewrite |
|---|---|---|---|
| `d3_tv` (day3/dorm_commons.js) and `room_kenji` (room-talk.js) | J | {mc.name}! Sit, sit. This is replay. I know winner. | 「あ、{mc.name_jp}さん！どうぞ、座ってください。」 [moves his bag off the sofa] "Replay. I know... winner." |
| `room_kenji` (room-talk.js) | J | Ah, {mc.name}. TV again. My room is... small. | "Ah, {mc.name}-san. TV... again." [holds his hands close together] "My room, small." |
| `room_replay` (room-talk.js) | J | Yes! Last point is very good. Look, look. | 「最後、すごいです。見てください。」 [points at the screen] "Last point... very good." |
| `d3_kenji` (day3/shotengai.js, afternoon) | E | I only look. If I play, lunch money... gone. | "I only look." [pats his pocket] "Play... lunch money, gone." |

## Day 4

| Id | Why | Current | Rewrite |
|---|---|---|---|
| `d4_kenji` (day4/shotengai.js, evening) | E | I won a game! I go home now, before I lose again. | "Game... I win!" 「もう帰ります。また負けるから。」 [waves, already walking] |
| `d4_kenji` (day4/shotengai.js, daytime) | E | I bought curry bread again. Yesterday it was too hot, so today I wait. | 「またカレーパンです。」 [holds it up] "Yesterday... hot!" [fans his mouth] "Today, wait." |

## Day 5

| Id | Why | Current | Rewrite |
|---|---|---|---|
| `d5_booth_hello` (day5/karaoke_booth.js) | E | You work on B2? I’m Kenji. I work there too. | 「B2の{mc.name_jp}さんですか？ケンジです。僕もB2です。」 [bow] |
| `d5_booth_hello` (day5/karaoke_booth.js) | E | Yes. Over here, please. | 「はい。こちらです、お願いします。」 [points at the selector] |
| `d5_selector` (day5/karaoke_booth.js) | E | It stays! Thank you. I can check songs now. | 「止まってます！ありがとうございます。」 "Song... I check, now." |
| `d5_selector_request` (day5/karaoke_booth.js) | E | Can you help with this? I want that song, but it keeps going past. | 「すみません、これ…」 [points at the screen as the list scrolls on] "Song... go, go, go. No stop." |
| `d5_selector_magic` (day5/karaoke_booth.js) | E | Eh? You say stop, it stops? | 「え？{mc.name_jp}さんが言ったら…」 "You say... stop?" |
| `d5_selector_clear` (day5/karaoke_booth.js) | E | Yes, that’s the song. It stays there now! | 「これです、この曲！」 "Thank you, {mc.name}-san." [bow] |
| `d5_kenji_name` (day5/office.js) | E | I’m Kenji. I work here too, just over there. | 「ケンジです。よろしくお願いします。」 [bow, then points at his desk] |
| `d5_kenji` (day5/office.js) | E | We have drinks here after six. Will you come? Mori-san and Mio-san also. | 「6時から、ここで飲み会です。」 [points at the vending machine] "Mori-san, Mio-san also. {mc.name}-san... come?" |
| `d5_kenji` (day5/office.js) | E | Yes, I’m buying. But only for us, okay? | "Yes. Me... buy." [points round the B2 desks] "Only us. OK?" |
| `d5_kenji` (day5/office.js) | E | We’ll be here after six. | "Six... here." [holds up six fingers] |
| `d5_reveal_agree` (day5/reveal.js) | E | Yes. Can you do it with my drink? | 「僕のメロンソーダで、お願いします！」 |
| `d5_first_reactions` (day5/reveal.js) | E | I didn’t press it! How did you... it’s cold. | 「え…押してない…」 [touches the can] "No press! ...Cold." |
| `d5_first_reactions` (day5/reveal.js) | E | You did this at karaoke? When you said stop? | 「カラオケの時も…？」 "Karaoke... same?" |
| `d5_first_reactions` (day5/reveal.js) | E | Okay. I won’t tell them. | 「はい、言いません。」 [finger to his lips] |
| `d5_reveal_defer` (day5/reveal.js) | J | {mc.name}, what do you want? | 「{mc.name_jp}さん、何にしますか？」 [points at the machine] |
| `d5_drinks_again` (day5/reveal.js) | E | Can we try again? I want to watch from here. | 「もう一度、いいですか？」 [steps back] "I watch... here." |
| `d5_replay_ordinary` (day5/reveal.js) | E | Okay, I’ll get them. | 「はい、買ってきます！」 |
| `d5_first_exit` (day5/reveal.js) | E | Thank you. I forgot I wanted to drink it. | "Thank you, {mc.name}-san." [looks at the can] "Melon soda... I forget!" |
| `d5_rounds_exit` (day5/reveal.js) | E | Thank you. I have enough now. | 「もう大丈夫です。ありがとうございます。」 |

## Ongoing scenes

| Id | Why | Current | Rewrite |
|---|---|---|---|
| `conversation_kenji` (conversations/kenji.js) | E, J | Sorry, work first. Later, okay? | 「すみません、今、仕事中で…あとでいいですか？」 [bows, glances at his screen] |
| `conversation_kenji_arcade` (conversations/kenji.js) | E | Game centre. Crane game is... expensive for me. | 「ゲームセンターです。」 "Crane game... money, gone." [turns out a pocket] |
| `ongoing_kenji` (ongoing/office.js) | E | On Friday we have drinks here after work. You want to come? | 「金曜日、ここで飲み会です。」 [points at the vending machine] "Friday... drink. {mc.name}-san, come?" |
| `ongoing_kenji` (ongoing/office.js) | E | Maybe we go to game centre after. I must finish this first. | "After... game centre? Maybe." 「これ、先に終わらせます。」 [taps his screen] |
| `ongoing_karaoke` (ongoing/karaoke-session.js) | E | Come in. You can sit here. I found some songs. | 「どうぞ。ここ、どうぞ。」 [pats the seat] "Song... many!" |
| `ongoing_karaoke_make_room` (ongoing/karaoke-session.js) | E | Ah, all mine. Sorry. I put in too many. | "Ah... all, mine. Sorry." 「入れすぎました。」 |
| `ongoing_karaoke_offer_turn` (ongoing/karaoke-session.js, to Hamada) | E | One song? You can do more. I wanted three. | To Hamada, in Japanese: 「一曲だけですか？もっとどうぞ。」 |
| `ongoing_karaoke_song` (ongoing/karaoke-session.js, to Hamada) | E | Keep the microphone. What song next? | 「マイク、どうぞ。次、何にしますか？」 |
| `ongoing_karaoke_booking` (ongoing/karaoke-session.js) | E | He books it. Then he comes to get me. I forget. | "Hamada-san... book." [points at himself, shrugs] "Me... forget. He come, get me." |
| `ongoing_karaoke_return` (ongoing/karaoke-session.js) | E | You came! Same seat? | 「あ、{mc.name_jp}さん！」 [pats the same seat] "Same... seat?" |

## Milestones (milestones/kenji.js)

| Id | Why | Current | Rewrite |
|---|---|---|---|
| `ms_kenji_opening` | E | Can you listen to the start? I check it for Wednesday. | 「{mc.name_jp}さん、ちょっと聞いてもらえますか。」 "Wednesday... song. Listen, please?" |
| `ms_kenji_opening_evening` | E | I start too high here. Can you listen? | [raises a flat hand above his head] "Too high... me." 「聞いてもらえますか。」 |
| `ms_kenji_try` | E | I start too high again. Wait, I try lower. | 「あ、また高い…」 [lowers his hand] "Again. Lower." |
| `ms_kenji_try` | E | Yes. I can breathe now. | 「はい。楽になりました。」 [breathes out, hand on his chest] "OK now." |
| `ms_kenji_queue` | E | Where is her song? Can you see it? | 「あれ？あの人の曲…」 [scrolls the list] "Her song... where?" |
| `ms_kenji_missing` | E | Ah. These are all mine. I kept adding. | "Ah... all, mine." 「入れすぎました。すみません。」 |
| `ms_kenji_restore` | E | Yes. Wait, I remove mine first. | 「はい！僕のを先に消します。」 "Mine... delete." |
