# Aoi: sample scene

A voice sample, not wired into the game. Day 3 (Saturday), lunch, on the shop street (`shotengai`), where the outline already has Aoi looking at shoes. She sits on the bench at an alley mouth with her phone out. It plays only after her introduction at the plaza board (`d3_aoi_intro`), and it would replace the short `d3_aoi_shoes` lines. About a minute.

New word: `dotchi`, どっち, "which one". It would need a REQUESTS.md entry and clips. Words Eric knows by now and hears sharp: すみません (day 1). Everything else she says is blurred, and he gets it from the phone she holds up, her pointing and what happens. The English in brackets is for the reader only.

---

`[talk:aoi]` Aoi holds her phone at arm's length and frowns at two pictures of tennis shoes, one white pair and one pink. A bakery bag sits beside her on the bench.

**aoi** (overheard, clear ピンク): うーん……白か、ピンクか。
  (Hmm... white or pink.)

**aoi** (overheard): あ、{mc.name_jp}さん！ ちょうどよかった。
  (Oh, Eric! Perfect timing.)

`[aoi turns the phone round to Eric and points at one shoe, then the other]`

**aoi** (overheard): どっち？
  (Which one?)

**eric:** You want me to pick? I know nothing about tennis shoes.

**aoi** (slow): どっち。
`[aoi points left, then right, then left again]`

`[type: dotchi. Prompt: "She's asking which one: dotchi."]`

**eric:** {dotchi}?

**aoi** (overheard): それ、私が聞いてるんですけど。
  (That's what I'm asking you.)

**choice**
- "Point at the white pair." → `white`
- "Point at the pink pair." → `pink`

**white**

**aoi** (overheard): 白……。絶対、すぐ汚れますよ。
  (White... They'll get dirty straight away, guaranteed.)

**eric:** Then why are they on your phone?

**aoi** (overheard): 安いから。……じゃあ、白で。
  (Because they're cheap. ...Fine, white.)

**pink**

**aoi** (overheard): ですよね！ 髪と同じ。
  (Right?! Same as my hair.)
`[aoi holds the phone up beside her hair, then looks at the price and lowers it]`

**aoi** (overheard): でも、高い……。初心者なのに、いいのかな。
  (But they're expensive... Is that all right for a beginner?)

**eric:** Get the pink ones. You'll be wearing them every Sunday.

**all branches**

`[aoi taps the screen twice, puts the phone away and picks up the bakery bag]`

**aoi** (overheard, clear テニス): {mc.name_jp}さんも、テニス、来ます？ ……あ、地下の人って、日曜日もお休みですか？
  (Are you coming to tennis too? ...Oh, do people in the basement get Sundays off?)
`[aoi grins and winks]`

**eric:** Was that about B2?

**aoi** (overheard): うそうそ、{sumimasen}。
  (Kidding, kidding. Sorry.)

`[Set d3_aoi_shoes_picked = white / pink. Aoi walks toward the plaza lane.]`

---

## What the choice changes

On day 4 at the courts, before she asks to borrow a racket, she lifts one foot to show Eric the shoes.

- `white`: There's already a grey mark on the toe, and she points at it before he can.
- `pink`: 「ほら、ピンク。」 (Look, pink.)
