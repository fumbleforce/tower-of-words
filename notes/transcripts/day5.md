# Day 5

## day5_morning
[scene: dorm]
[clock 08:00]
(Friday. Your phone has been buzzing since seven.)
[message from Yuzuki] 十時、二階の広報室ね。カメラもあるから、髪、ちゃんとして。  /  Ten o'clock, PR office on the second floor. There's a camera too, so do your hair properly.
[message from Aoi] あたしも写真、呼ばれた……一緒に行ってもいい？  /  I got called in for the photo too... Can I go with you?
CHOICE: Reply to Aoi
  1) You: いいよ。九時半に一階で。  /  Sure. Ground floor at 9:30.
  2) You: うん。  /  Yeah.
→ day5_interview

## day5_interview
[scene: pr]
[clock 10:00]
[show yuzuki smile]
[show aoi panic]
Yuzuki [smile]: 来てくれた！　じゃあ、はじめよう。社内報の「新人インタビュー」。  /  "You came! Let's start, then. The in-house paper's 'new staff interview'."  ⚠ 25 chars
Yuzuki [smile]: 天川で、何がしたいの？  /  "What do you want to do at Amakawa?"
CHOICE: Your answer
  1) You: みんなと、いい仕事がしたい。  /  "I want to do good work with everyone."
    Yuzuki [smile]: いいね。まじめな新人くん。  /  "Nice. A serious new hire."
  2) You: 企画室7を守りたい。  /  "I want to protect Planning 7."
    Yuzuki [serious]: 守りたい？　……何から？  /  "Protect it? ...From what?"
    [set saidProtect]
  3) You: 早く帰りたい。  /  "I want to go home early."
    Aoi [grin]: わかる！  /  "Same!"
    Yuzuki [tired]: ……それは書かないね。  /  "...I won't print that one."
CHOICE: Turn it around. Ask Yuzuki the same thing.
  1) You: ユヅキさんは？　何がしたいの？  /  "What about you, Yuzuki? What do you want to do?"
    Yuzuki [serious]: 私？　……ほんとうのことが書きたい。社内報じゃなくて。  /  "Me? ...I want to write things that are true. Not the company paper."
    [set knowsYuzukiDream]
  2) You: ユヅキさんは、何がしたいですか。  /  "And what would you like to do, Ms Yuzuki?" (polite)
    Yuzuki [smile]: なんで急にていねい？　私はいいの、今日はあなたの番。  /  "Why so polite all of a sudden? Never mind me, today's your turn." Among coworkers your age, plain ～たいの？ is the natural way to ask.
IF yuzukiSawDoor:
  Yuzuki [serious]: ねえ。水曜日のエレベーター。ドアが、ひとりでに止まったよね。  /  "Hey. Wednesday, the elevator. The door stopped on its own, didn't it?"  ⚠ 26 chars
  CHOICE: Your reply
    1) You: そう？　古いエレベーターだから。  /  "Did it? It's an old elevator."
      Yuzuki [smile]: ふうん。……そういうことに、しておく。  /  "Hmm. ...I'll leave it at that. For now."
    2) You: 見てたの？  /  "You were watching?"
      Yuzuki [serious]: 見るのが仕事だから。  /  "Watching is my job."
→ day5_photo

## day5_photo
Yuzuki [smile]: じゃあ、写真。アオイさんも、ここに立って。  /  "Photo time. Aoi, stand here too."
Yuzuki [serious]: あ、そうだ。昨日、企画書が消えたって聞いたけど……ほんと？  /  "Oh, right. I heard the proposal got deleted yesterday... Is that true?"
Aoi [panic]: え、あ、あの、あたし……  /  "Uh, um, I..."
(Aoi goes white. Her hands shake. If she says it on the record, it goes in the paper, and then it goes to Sales.)
CHOICE: Aoi is about to fall apart in front of the camera.
  1) You: （言霊を使う）  /  (Use kotodama. Yuzuki is right there, holding a camera: 1 witness)  [kotodama]
    SPELL: Calm Aoi down, for real. (verbs 大丈夫, 待つ; answer 大丈夫だよ)
      cast 大丈夫だよ (works):
        (Your voice is quiet, but Aoi's shoulders drop. Her breathing slows. For some reason, the room feels warmer.)
        Aoi [grin]: ……はい。消しちゃったけど、みんなで直しました！  /  "...Yes. I deleted it, but we all fixed it together!"
        Yuzuki [smile]: いい話。それ、書きたい。  /  "That's a good story. I want to write that."
        [set articleTone]
      cast 大丈夫？ (retry):
        (A question, not a promise. Aoi hears worry in it and starts to cry.)
        [set articleTone]
      cast 待って (retry):
        (Everything in the room stops for half a second, including Yuzuki's camera. The shutter clicks late.)
        [set articleTone]
      cast default (anything else) (retry):
        (The words come out stiff. Nothing changes.)
  2) You: 大丈夫だよ、と普通に言う  /  Just say "it's okay" the normal way
    (It helps a little. Aoi manages a nod.)
    Aoi [panic]: ……ちょっと、消しちゃいました。でも、もう大丈夫です。  /  "...I kind of deleted it. But it's fine now."
    Yuzuki [serious]: 「ちょっと」ね。書いておく。  /  "'Kind of.' Noted."
    [set articleTone]
[everyone leaves the frame]
→ day5_review

## day5_review
[scene: office]
[clock 16:00]
[show emi smile]
Emi [smile]: 一週間、おつかれさま。ちょっと話そう。  /  "Good work this week. Let's talk for a minute."
(Probation review, week one. Emi has a notebook. You can't read what's in it.)
IF helpedAoi:
  Emi [smile]: アオイさんのこと、ありがとう。見てたよ。  /  "Thanks for looking after Aoi. I noticed."
IF lateMeeting:
  Emi [smirk]: 火曜日の会議、遅れたね。来週は気をつけて。  /  "You were late to Tuesday's meeting. Watch that next week."
IF missedDeadline:
  Emi [surprised]: 昨日は、間に合わなかった。でも、あなたのせいじゃない。  /  "We missed yesterday's deadline. But it wasn't your fault."
ELSE:
  Emi [smile]: 昨日は、ほんとうに助かった。  /  "Yesterday, you really saved us."
IF saidProtect:
  Emi [surprised]: ……ユヅキさんに「守りたい」って言ったの？　……そう。  /  "...You told Yuzuki you want to 'protect' us? ...I see."
Emi [smile]: 試用期間は、まだ長い。でも、悪くないよ。  /  "Probation has a long way to go. But you're not doing badly."
[everyone leaves the frame]
→ day5_evening

## day5_evening
[scene: gate]
[clock 18:30]
[message from Mio] 今夜、ゲーム。コントローラー、二つある。  /  Games tonight. I've got two controllers.
CHOICE: Friday night
  1) You: バー　（みんなで飲み）  /  The bar (team drinks)
    → day5_bar
  2) You: ミオの部屋　（ゲーム）  /  Mio's room (games)  [only if mioSaturday]
    IF mio >= 2:
      → day5_mio
    ELSE:
      [message from Mio] ごめん、やっぱり今日はねる。また今度。  /  Sorry, I'm going to sleep after all. Another time.
      → day5_bar

## day5_bar
[scene: bar]
[show jun neutral]
Jun [neutral]: 金曜日だね。ビール？  /  "It's Friday. Beer?"
[free talk with Jun: Tell Jun what you want to do this weekend (use 〜たい).] fallback:
  CHOICE: Your reply
    1) You: ゆっくり休みたい。  /  "I want to rest properly."
      Jun [neutral]: そういう顔してる。  /  "You look like it."
    2) You: 町を見たい。  /  "I want to see the town."
      Jun [neutral]: 日曜日の朝の市場、いいよ。  /  "The Sunday morning market is nice."
(Aoi arrives late and orders the sweetest thing on the menu. Nobody talks about work. It's a good hour.)
[everyone leaves the frame]
→ day5_hook

## day5_mio
[scene: mio_room]
[show mio smirk]
Mio [smirk]: 来たね。土曜日まで寝かせないって、言ったでしょ。  /  "You came. I told you I wouldn't let you sleep till Saturday."
Mio [bored]: 十二時過ぎたら、土曜日。計算、あってる。  /  "After midnight it's Saturday. The maths checks out."
CHOICE: She hands you a controller.
  1) You: どのゲームがしたいの？  /  "Which game do you want to play?"
    Mio [smirk]: これ。負けたほうが、明日の朝ごはんね。  /  "This one. Loser buys tomorrow's breakfast."
  2) You: 勝ちたい。  /  "I want to win."
    Mio [smirk]: 無理。  /  "Not happening."
[clock 01:40]
(You lose four rounds in a row. Somewhere in the fifth, her commentary stops.)
[reward: Mio, asleep on your shoulder, still holding the controller.]
(Her head is on your shoulder. The hoodie has slid off one side. She's breathing slowly and she's warm, and you are not going to move for a while.)
Mio [bored]: ……動かないで。……あと五分。  /  "...Don't move. ...Five more minutes."
[set mioGameNight]
[everyone leaves the frame]
→ day5_hook

## day5_hook
[message from Emi] 月曜日、朝一番に、みんなに話したいことがある。  /  Monday, first thing in the morning, there's something I want to tell everyone.
(You think of the sheet of paper on her desk, face down.)
[end of day summary]
