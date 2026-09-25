# Day 3

## day3_morning
[scene: dorm]
[clock 07:45]
[message from Rei] 十二時、一階のカフェ。一人で来て。  /  Twelve o'clock, the café on the first floor. Come alone.
[message from Emi] 今日は午後から外。何かあったら、連絡して。  /  I'm out from this afternoon. If anything happens, contact me.
[pin: Rei's message. When and where? When? → noon; Where? → the café, ground floor]
→ day3_office

## day3_office
[scene: office]
[clock 09:05]
[show mio bored]
Mio [bored]: ねえ。新人くんって、何が好きなの？  /  "Hey. What do you like, new guy?"
CHOICE: Your reply
  1) You: ゲームが好き。  /  "I like games."
    Mio [smirk]: 知ってる。昨日、目がひかってた。  /  "I know. Your eyes lit up yesterday."
  2) You: 日本のアニメが好き。  /  "I like Japanese anime."
    Mio [bored]: ふーん。何のアニメ？  /  "Hmm. Which anime?"
    [typed reply: Name one (romaji is fine).]
      Mio [smirk]: ……センス、悪くないね。  /  "...Not bad taste."
  3) You: ミオさんは？  /  "What about you, Mio?"
    Mio [smirk]: 静かな場所。……と、ゲーム。人は、ちょっときらい。  /  "Quiet places. ...And games. People, not so much."
Mio [suspicious]: あと、黒田さんに気をつけて。あの人、昨日から君のこと、聞いてまわってる。  /  "Also, watch out for Kuroda. Since yesterday she's been asking around about you."  ⚠ 31 chars
[everyone leaves the frame]
[clock 11:52]
→ day3_elevator

## day3_elevator
[scene: elevator]
(Eight minutes to twelve. The elevator doors are already closing, and someone is inside.)
CHOICE: The doors are closing.
  1) You: （言霊を使う）  /  (Use kotodama. Someone is inside: 1 witness)  [kotodama]
    SPELL: Stop the elevator doors. (verbs 待つ, 渡す; answer 待って)
      cast 待って (works):
        (The doors stop halfway. They don't bounce back. They just stop, as if the building is holding its breath.)
        [set yuzukiSawDoor]
      cast 渡して (retry):
        (The doors close. A second later a business card slides out through the gap and lands at your feet. You take the stairs.)
        [time +6]
        [set tookStairs]
      cast default (anything else) (retry):
        (The doors close in your face. You take the stairs.)
        [time +6]
        [set tookStairs]
  2) You: 階段で行く  /  Take the stairs
    [time +6]
    [set tookStairs]
IF yuzukiSawDoor:
  [show yuzuki smile]
  Yuzuki [serious]: ……今、ドア、止まったよね？  /  "...The door just stopped, didn't it?"
  CHOICE: Your reply
    1) You: そう？　気のせいだよ。  /  "Did it? You must be imagining it."
      Yuzuki [smile]: ふふ。そういうことにしておく。  /  "Heh. I'll pretend that's true."
    2) You: このエレベーター、古いから。  /  "This elevator's old."
      Yuzuki [smile]: 先月、新しくなったんだけどね。  /  "It was replaced last month, actually."
  Yuzuki [smile]: 君、企画室7の新人くんでしょ。私、広報のユヅキ。社内報も作ってるの。  /  "You're the new hire in Planning 7, right? I'm Yuzuki from PR. I also make the in-house paper."  ⚠ 29 chars
  Yuzuki [smile]: また、話そうね。  /  "Let's talk again sometime."
  [everyone leaves the frame]
→ day3_cafe

## day3_cafe
[scene: cafe]
IF time after 12:00:
  [set lateRei]
[show rei cold]
IF lateRei:
  Rei [cold]: 遅刻ね。……まあ、すわって。  /  "You're late. ...Well, sit down."
ELSE:
  Rei [cold]: 時間どおりね。すわって。  /  "Right on time. Sit."
Rei [cold]: 何か飲む？　私が払う。  /  "Want something to drink? My treat."
[menu: コーヒー 300, カフェラテ 400, チーズケーキ 450, オレンジジュース 350]
IF gotDocs:
  Rei [cold]: で。月曜日の、何だったの？　私、なんで書類を渡したの？  /  "So. What was that on Monday? Why did I hand you those papers?"
  CHOICE: She is watching your face very carefully.
    1) You: 何もしてないよ。  /  "I didn't do anything."
      Rei [cold]: うそが下手ね。  /  "You're a bad liar."
    2) You: 黒田さんが、やさしいから。  /  "Because you're kind, Kuroda."
      Rei [smirk]: ……私、やさしくないよ。営業部で一番こわいって言われてる。  /  "...I'm not kind. People in Sales call me the scariest one there."
    3) You: ……言えない。  /  "...I can't tell you."
      Rei [confused]: ……言えないって何。ちょっと、おもしろいじゃない。  /  "...What do you mean, you can't tell me? Now that's interesting."
ELSE:
  Rei [cold]: で。昨日の会議から、君のことがちょっと気になって。企画室7に、なんで来たの？  /  "So. Since yesterday's meeting I've been curious about you. Why did you join Planning 7?"  ⚠ 33 chars
  CHOICE: Your reply
    1) You: 日本で働きたかったから。  /  "Because I wanted to work in Japan."
      Rei [cold]: ふうん。普通の答えね。  /  "Hmm. An ordinary answer."
    2) You: エミさんが呼んでくれたから。  /  "Because Emi brought me in."
      Rei [smirk]: 真壁さんが？　……へえ。  /  "Makabe did? ...Interesting."
Rei [smirk]: 君は、何が好き？　仕事で。  /  "What do you like? At work, I mean."
CHOICE: Your reply
  1) You: 新しいことを考えるのが好き。  /  "I like thinking up new things."
    Rei [smirk]: 企画室7らしい答えね。  /  "Very Planning 7 of you."
  2) You: 黒田さんは？  /  "What about you?"
    Rei [smirk]: 勝つのが好き。負けるのは、大きらい。  /  "I like winning. I hate losing."
Rei [cold]: 来週、夏祭りのコンペがある。企画室7には、負けないから。  /  "Next week there's a pitch competition for the summer festival. I won't lose to Planning 7."
Rei [smirk]: ……でも、君の秘密は、ちょっと知りたい。  /  "...But I do want to know your secret, a little."
[everyone leaves the frame]
→ day3_afternoon

## day3_afternoon
[scene: office]
[clock 15:00]
IF helpedAoi:
  [show aoi grin]
  Aoi [grin]: これ、昨日のお礼！　缶コーヒー。好き？  /  "This is for yesterday! A can of coffee. Do you like it?"
  CHOICE: Your reply
    1) You: 大好き。ありがとう。  /  "Love it. Thanks."
      Aoi [grin]: よかった！  /  "Yay!"
    2) You: コーヒーはちょっと苦手。  /  "I'm not great with coffee."
      Aoi [panic]: えー！　じゃあ明日、ジュースにする！  /  "Noo! Then tomorrow I'll bring juice!"
ELSE:
  (The afternoon passes in spreadsheets. From the copy room down the hall you hear Aoi arguing with the machine again.)
→ day3_evening

## day3_evening
[clock 18:40]
CHOICE: Evening. Where do you go?
  1) You: 屋上  /  Rooftop
    [scene: rooftop]
    [show goro smile]
    Goro [smile]: おや。トマト、元気になったよ。  /  "Oh. The tomatoes perked up."
  2) You: 寮  /  The dorm (rest)
    [scene: dorm]
    (An early night. You reread today's messages before you fall asleep.)
[everyone leaves the frame]
[clock 22:15]
[message from Yuzuki] 金曜日、社内報のインタビュー、させて。新人くんの特集。逃げないでね。  /  Let me interview you for the in-house paper on Friday. A feature on the new hire. Don't run away.
[end of day summary]
