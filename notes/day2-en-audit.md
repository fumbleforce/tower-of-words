# Day 2: subtitled Japanese (`en:`) lines

An audit for the rule set on day 3 (Jørgen, 2026-10-05, on the gym scene: "first of all it should not be in english"): a Japanese speaker in a conversation Eric is part of speaks Japanese on screen, as on day 1, and `en:` is only for the rare overheard moment. This is a list only. Nothing here has been rewritten.

`grep " en: '" game3d/story/day2/*.js` finds 50 hits. 8 of them are the word records in words.js (glosses, not lines). The other 42 are spoken lines, and every one of them is said to Eric or in a group he sits in, so all 42 break the rule. None is an overheard moment between other people.

## gate.js: the guard (6)

All are Eric talking to the guard (Talk, or a word said to him).

- d2_guard: 点検ですね。どうぞ。 / お疲れさまです。
- d2_guard_idle: はい、どうぞ。
- d2_cat: 猫はいません。 (answers Eric's line about the cat)
- d2_guard_food: 食堂は下です。 (answers 食べたい)
- d2_guard_drink: 外に自動販売機があります。 (answers 飲みたい)

## office.js: Mori (1)

- d2_mori_work: 古い資料ですが、よかったら使ってください。 (Talk at his desk)

## east_coast.js: Hamada at the telescope (10)

All are Eric's conversation with him at the lookout.

- d2_hamada: あ、すみません。もう終わります。 / いえ、レンズが汚れているだけです。… / どうぞ。お金はいりませんよ。
- d2_see_word: {mitai}。 and its slow repeat (a taught word; would become a plain glossed line, no `en`)
- d2_lookout_view: 満潮のときは、水の下です。
- d2_hamada_idle: どうぞ。まだ見ますか。
- d2_hamada_go: 下には降りられませんよ。… (answers 行きたい)
- d2_hamada_food: 食事でしたら、商店街はあちらです。 (answers 食べたい)
- d2_hamada_drink: テラスに自動販売機があります。 (answers 飲みたい)

## shotengai.js: Mori at the sea-facing supper (25)

All are Mori speaking to Eric or to the group Eric sits in.

- d2_supper: お疲れさまです。 / 店より、海のほうが静かですから。 / 食堂で作ってもらいました。… / エリックさんは、どちらがいいですか。 (a question that leads straight into Eric's choice)
- d2_take_food: よかったです。まだありますから、どうぞ。
- d2_norway: はい。写真がどこにあるか、探さないと。 / はい。1994年にリレハンメルへ行きました。 / 寒かったですが、また行きたいですね。 (Mori answering Eric's question)
- d2_goodnight: 気をつけて。おやすみなさい。
- d2_mori_party: 遠慮しないでくださいね。
- d2_mori_wait: こちらへどうぞ。
- d2_mori_rest: いいえ。箱は月曜日に返せばいいんです。 / ありがとうございます。写真も持ってきますね。… / 1994年に行ったんです。… / また行きたいですね。今度は夏に。
- d2_go_word: {ikitai}。 and its slow repeat (taught word) / ええ、ぜひ。
- d2_leftovers: まだありますよ。どうぞ。
- d2_mori_drink: お茶は終わってしまいました。… (answers 飲みたい)
- d2_mori_rest_idle and d2_mori_rest_again: もう少ししたら、帰ります。 (twice)
- d2_mori_go_reply: どこへ行きたいですか。 (Eric answers it in English)
- d2_mori_see_reply: 写真ですね。月曜日に持ってきます。 / 何が見たいですか。 (Eric answers the second in English)

## What a fix would have to handle

- Four lines are questions Eric answers in English (Mori's どちらがいいですか, どこへ行きたいですか, 何が見たいですか, and the Norway question he asks). Overheard, Eric can't follow them, so each needs a gesture, a known word, Mio or Kenji translating at the supper, or a reworked exchange.
- The four taught-word lines (mitai, ikitai) only need `en` removed.
- docs/game/stories/day2/welcome.md says "Mori's Japanese is subtitled, never muffled". That line would change with the rewrite.
