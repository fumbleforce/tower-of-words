# Day 2

## day2_morning
[scene: dorm]
[clock 07:50]
(Day two. Your phone buzzes before your alarm does.)
[message from Emi] おはよう。十時から二階の会議室で会議。資料を十枚、コピーしてきて。  /  Morning. Meeting at ten in the second-floor meeting room. Make ten copies of the handout.
[message from Mio] 地下一階のコピー機、また壊れてるって。がんばれ。  /  They say the copier on basement level 1 is broken again. Good luck.
[pin: What did Emi ask for? When? → ten o'clock; Where? → the meeting room, 2nd floor; What? → ten copies of the handout]
→ day2_elevator

## day2_elevator
[scene: elevator]
[clock 09:20]
(The copier is on basement level 1, if Mio is right.)
[elevator to B1]
→ day2_copyroom

## day2_copyroom
[scene: copyroom]
Aoi: あ、人だ！　たすけて！　コピー機が動かないの！  /  "Oh, a person! Help me! The copier won't work!"
Aoi: あたし、アオイ。インターン。……もう帰りたい。  /  "I'm Aoi. Intern. ...I already want to go home."
CHOICE: Your reply
  1) You: 何をコピーしたいの？  /  "What do you want to copy?"
    Aoi: 部長の資料！　百枚！　十時まで！  /  "The department head's handouts! A hundred pages! By ten!"
  2) You: 大丈夫？  /  "Are you OK?"
    Aoi: ぜんぜん大丈夫じゃない！  /  "Not OK at all!"
  3) You: 先にいい？　急いでるんだ。  /  "Can I go first? I'm in a hurry."
    Aoi: えー、ひどい！　でも、動かないんだって！  /  "Hey, that's mean! And I told you, it doesn't work!"
(The copier blinks a red light and makes a sad noise. Aoi is watching you.)
CHOICE: How do you deal with the copier?
  1) You: （言霊を使う）  /  (Use kotodama. Aoi is watching: 1 witness)
    SPELL: Get the copier working. (answer 動いて)
      success:
        (The copier coughs, hums, and starts printing. Fast. Faster than it should.)
        Aoi: ……え、動いた！　すごい！　なんで？  /  "...Whoa, it works! Amazing! How?"
        CHOICE: Your reply
          1) You: ボタンを押しただけ。  /  "I just pressed the button."
            Aoi: うそー。あたしも押したよ！  /  "No way. I pressed it too!"
          2) You: コピー機に好かれてるから。  /  "The copier likes me."
            Aoi: なにそれ！　ずるい！  /  "What's that supposed to mean! No fair!"
      if cast 待って:
        (The copier goes completely silent. So does Aoi. The red light stops blinking mid-blink.)
        Aoi: ……え、今、止まった？  /  "...Huh, did it just freeze?"
      if cast default:
        (Nothing happens. The words fall flat: that form doesn't ask anything.)
  2) You: コピー機をけとばす  /  Kick the copier
    (You kick it. Nothing. You kick it again, harder. It wakes up with a groan, ten minutes and one sore foot later.)
    Aoi: あはは！　でも動いた！  /  "Ha ha! But it works!"
CHOICE: Aoi still needs a hundred pages before ten. You need ten.
  1) You: 手伝うよ。  /  "I'll help you."
    Aoi: ほんと？　ありがとう！　この恩は忘れない！  /  "Really? Thank you! I won't forget this!"
  2) You: ごめん、先に行くね。  /  "Sorry, I'll go ahead."
    Aoi: うー、がんばる……。  /  "Ugh, I'll manage..."
→ day2_meeting

## day2_meeting
[scene: meeting]
IF time after 10:00:
  (The meeting has already started. Every head turns when the door opens.)
IF lateMeeting:
  Emi: おそい。……まあ、すわって。  /  "You're late. ...Well, sit down."
IF pin_thing_wrong:
  (You put your stack on the table. It's the wrong thing. Emi quietly slides her own copy across to share.)
Emi: では、企画室7から。「天川シティの夏祭り」の企画です。  /  "Right, Planning 7 first. Our plan for the Amakawa City summer festival."
Rei: 企画室7の企画は、いつもおもしろい。でも、お金にならない。  /  "Planning 7's ideas are always fun. They just never make money."
Emi: 今回はなるよ。  /  "This time they will."
Rei: ふうん。……新人くんは、どう思う？  /  "Hmm. ...What does the new guy think?"
CHOICE: Everyone looks at you.
  1) You: 僕、この企画、やりたい。  /  "I want to do this project."
    Emi: ……うん。  /  "...Yeah."
    Rei: かわいい新人ね。  /  "What a sweet new hire."
  2) You: まだ、よくわからない。  /  "I don't really understand it yet."
    Rei: 正直ね。  /  "Honest, at least."
  3) You: 黒田さんは何がしたいの？  /  "What do you want to do, Kuroda?"
    Rei: 私？　勝ちたい。それだけ。  /  "Me? I want to win. That's all."
(The meeting ends with no decision. On the way out, Emi's smile drops for a second when she thinks nobody is looking.)
→ day2_lunch

## day2_lunch
[clock 12:10]
CHOICE: Lunch. Where do you go?
  1) You: 食堂  /  Canteen
    → day2_canteen
  2) You: 屋上  /  Rooftop
    → day2_rooftop

## day2_canteen
[scene: canteen]
Kaori: いらっしゃい。今日の日替わりは、ハンバーグだよ。  /  "Welcome. Today's daily special is hamburg steak."
[menu: 日替わり（ハンバーグ） 650, カレー 500, うどん 450]
[pay from wallet 1000/500/100/100/100]
IF helpedAoi:
  Aoi: あ、恩人だ！　ここ、すわっていい？  /  "Oh, my saviour! Can I sit here?"
Mio: 新人くん、土曜日、ひま？  /  "New guy, are you free on Saturday?"
CHOICE: Your reply
  1) You: ひまだよ。どうして？  /  "I'm free. Why?"
    Mio: 新しいゲーム、二人でやりたいんだけど。……べつに、いやならいいけど。  /  "There's a new game I want to play with two people. ...It's fine if you don't want to."
    CHOICE: Your reply
      1) You: やりたい！  /  "I want to!"
        Mio: ……じゃあ、金曜の夜から。寝かせないから。  /  "...Then from Friday night. I won't let you sleep."
      2) You: ごめん、土曜日はちょっと。  /  "Sorry, Saturday's a bit difficult."
        Mio: そ。  /  "Kay."
  2) You: 土曜日は寝たい。  /  "On Saturday I want to sleep."
    Mio: わかる。  /  "Relatable."
→ day2_evening

## day2_rooftop
[scene: rooftop]
Goro: おや、いらっしゃい。今日はトマトが元気がない。  /  "Oh, hello there. The tomatoes are feeling low today."
(Goro kneels by a drooping plant and speaks to it quietly.)
Goro: 大丈夫だよ。大丈夫。  /  "It's all right. It's all right."
(You feel the words settle in your chest like a new key. 大丈夫だよ: a plain statement, said with intent, calms whoever hears it.)
[learn spell 大丈夫だよ]
Goro: 植物も人も、言葉を聞いているんだよ。  /  "Plants and people both listen to words, you know."
→ day2_evening

## day2_evening
[clock 18:30]
CHOICE: Evening. Where do you go?
  1) You: バー  /  The bar
    [scene: bar]
    Jun: 二日目か。どこに行きたい？　仕事じゃなくて、人生で。  /  "Day two, huh. Where do you want to go? Not at work. In life."
    [free talk with Jun: Tell Jun something you want to do in Japan (use 〜たい).] fallback:
      CHOICE: Your reply
        1) You: 日本で友達を作りたい。  /  "I want to make friends in Japan."
          Jun: もう、ひとりできたよ。  /  "You've already made one."
        2) You: アニメを字幕なしで見たい。  /  "I want to watch anime without subtitles."
          Jun: いい目標だ。  /  "Good goal."
  2) You: 寮  /  The dorm (rest)
    [scene: dorm]
    (You eat convenience-store onigiri on your bed and read the messages from today again. Some of the words already look friendlier.)
[clock 22:40]
[message from Rei] 明日、ちょっと話がある。  /  We need to talk tomorrow.
(Rei Kuroda. You never gave her your contact.)
[end of day summary]
