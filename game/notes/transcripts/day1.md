# Day 1

## monorail
[scene: monorail]
[clock 08:40]
(Your first day at Amakawa. The monorail glides across Tokyo Bay toward the company's island city.)
Announcement: まもなく、天川シティ中央駅です。お出口は右側です。  /  "Arriving shortly at Amakawa City Central Station. The exit is on the right."
CHOICE: The train slows down. Which doors?
  1) You: 右のドア  /  The right-hand doors
    (The right-hand doors slide open onto the platform.)
  2) You: 左のドア  /  The left-hand doors
    (The left doors stay shut. You squeeze across the crowded carriage as the right-hand doors open.)
[message from Emi] おはよう！九時に地下二階の企画室7に来てね。  /  Morning! Come to Planning Office 7, basement level 2, at nine.
→ gate

## gate
[scene: gate]
Ishibashi: ちょっと、止まって。  /  "Hold it. Stop."
Ishibashi: 見ない顔だな。IDカードは？  /  "Don't know your face. ID card?"
CHOICE: What do you do?
  1) You: IDカードを見せる  /  Show your ID card
  2) You: 名刺を出す  /  Hand him a business card
    Ishibashi: 名刺じゃない。ID。  /  "Not a business card. ID."
  3) You: にっこり笑う  /  Smile brightly
    Ishibashi: ……笑ってもダメだ。ID。  /  "...Smiling won't help. ID."
Ishibashi: ……新人か。企画室7？　ああ、地下の連中か。  /  "...A new hire. Planning Office 7? Ah, that basement lot."
Ishibashi: 変なことしたら、すぐわかるからな。  /  "Do anything strange and I'll know right away."
CHOICE: Your reply
  1) You: はい、よろしくお願いします。  /  "Yes, nice to meet you." (polite)
    Ishibashi: ……ん。  /  "...Mm."
  2) You: うん、よろしく。  /  "Yeah, nice to meet you." (casual)
    Ishibashi: ……なれなれしいな。  /  "...Aren't you over-familiar." Casual speech with an older stranger on duty comes across as cheeky.
  3) You: 変なこと？  /  "Something strange?"
    Ishibashi: 気にするな。行け。  /  "Never mind. Go."
→ elevator1

## elevator1
[scene: elevator]
[elevator to B2]
→ office

## office
[scene: office]
Mio: ……誰？  /  "...Who are you?"
CHOICE: Your reply
  1) You: 新人だよ。よろしく。  /  "The new guy. Nice to meet you." (casual)
    Mio: ふーん。……ミオ。今ゲーム中だから、話しかけないで。  /  "Hmm. ...Mio. I'm in the middle of a game, so don't talk to me."
  2) You: 今日からここで働きます。よろしくお願いします。  /  "I start working here today. Nice to meet you." (polite)
    Mio: かたいね。……ミオ。今ゲーム中。  /  "So stiff. ...I'm Mio. In the middle of a game." Between coworkers your age, casual speech is normal.
  3) You: そっちこそ誰？  /  "Who are you, then?"
    Mio: ……ふふ。ミオ。今ゲーム中。話しかけないで。  /  "...Heh. Mio. I'm in a game. Don't talk to me."
IF late after 09:00:
  Emi: 遅刻だよ。まあ、いいけど。  /  "You're late. Whatever."
Emi: 来た来た。君が新人くん？　私はエミ。ここのリーダー……いちおうね。  /  "There you are. You're the new guy? I'm Emi. The leader here... technically."
CHOICE: Your reply
  1) You: よろしくお願いします。  /  "Nice to meet you." (polite)
    Emi: まじめだね。  /  "So serious."
  2) You: うん、よろしく。  /  "Yeah, nice to meet you." (casual)
    Emi: うん、それでいいよ。  /  "Yeah, that's fine." Emi prefers casual.
  3) You: ……いちおう？  /  "...Technically?"
    Emi: そう、いちおう。  /  "Yep. Technically."
Emi: 試用期間は三か月。……まあ、がんばって。  /  "Your probation is three months. ...Well, do your best."
(Emi shows you your desk, the coffee machine that only works if you hit it, and a login that doesn't work at all. An hour and a half disappears.)
[clock 10:35]
Emi: さっそくだけど、お願いがあるの。  /  "Straight to it: I need a favour."
Emi: 三階の営業部に行って、黒田さんから書類をもらってきて。  /  "Go to Sales on the third floor and get the documents from Kuroda."
Emi: 十一時までにね。  /  "Before eleven."
Mio: 黒田レイ？　……がんばって。あの人、こわいよ。  /  "Rei Kuroda? ...Good luck. She's scary."
→ elevator2

## elevator2
[scene: elevator]
[elevator to 3F]
→ sales

## sales
[scene: sales]
IF time after 11:00:
  Rei: もう遅いよ。会議、始まった。  /  "Too late. The meeting's already started."
  (She turns away. Whatever magic you have, it can't fix the clock.)
  → office2
Rei: 企画室7の新人？　……ああ、書類ね。  /  "The new guy from Planning 7? ...Ah, the documents."
Rei: 悪いけど、今忙しいの。午後に来て。  /  "Sorry, but I'm busy right now. Come back this afternoon."
(A salesman at the next desk is watching you over his monitor.)
CHOICE: Emi needs them before eleven.
  1) You: お願い、今もらえない？  /  "Please, can't I have them now?"
    Rei: 聞こえなかった？　午後。  /  "Didn't you hear me? Afternoon."
  2) You: わかった。じゃあ、午後にまた来る。  /  "Fine. I'll come back this afternoon."
  3) You: （言霊を使う）　見ている人：一人  /  (Use kotodama now. One person is watching.)
    SPELL: Make Rei hand over the documents. (answer 渡して)
      success:
        Rei: ……え？　あ、うん。はい、これ。  /  "...Huh? Oh, sure. Here."
        (She hands you a thick folder, then stares at her own empty hand.)
        Rei: ……なんで渡したんだろう。  /  "...Why did I just hand that over?"
        Rei: 君、おもしろいね。  /  "You're interesting."
      if cast 待って:
        Rei: ……？　何？　今、体が止まった……。  /  "...? What? My body just... stopped." The wrong spell. She froze, but she didn't hand anything over.
      if cast default:
        Rei: ……何か言った？  /  "...Did you say something?" The words fizzled: that form doesn't ask anything of anyone.
  4) You: （人がいなくなるまで待つ）  /  (Wait until the salesman leaves. About 15 minutes.)
    (The salesman finally gets up for coffee. It's just you and Rei.)
    IF time after 11:00:
      Rei: まだいるの？　もう遅いよ。会議。  /  "You're still here? It's too late now. I have a meeting."
    ELSE:
      SPELL: Make Rei hand over the documents. (answer 渡して)
        success:
          Rei: ……え？　あ、うん。はい、これ。  /  "...Huh? Oh, sure. Here."
          (She hands you a thick folder, then stares at her own empty hand.)
          Rei: ……なんで渡したんだろう。  /  "...Why did I just hand that over?"
          Rei: 君、おもしろいね。  /  "You're interesting."
        if cast 待って:
          Rei: ……？　何？　今、体が止まった……。  /  "...? What? My body just... stopped." The wrong spell. She froze, but she didn't hand anything over.
        if cast default:
          Rei: ……何か言った？  /  "...Did you say something?" The words fizzled: that form doesn't ask anything of anyone.
→ office2

## office2
[scene: office]
IF gotDocs:
  Emi: え、もう？　はやっ！  /  "What, already? That was fast!"
  Mio: ……どうやったの？　あの黒田さんから。  /  "...How did you pull that off? From Kuroda, of all people."
  CHOICE: Your secret is at stake.
    1) You: 運がよかっただけ。  /  "I just got lucky."
      Mio: ふーん……。  /  "Hmm..."
    2) You: ひみつ。  /  "It's a secret."
      Mio: ……へえ。  /  "...Oh, really." She'll remember that.
    3) You: 黒田さん、やさしかったよ。  /  "Kuroda was nice to me."
      Mio: うそでしょ。  /  "No way."
  Emi: すごいじゃん。じゃあ、お昼にしよう。  /  "Impressive. OK, lunchtime."
ELSE:
  Emi: 午後か……。まあ、初日だしね。お昼にしよう。  /  "This afternoon, huh... Well, it's your first day. Let's get lunch."
[clock 12:05]
CHOICE: Lunch. The signs point two ways.
  1) You: 食堂  /  Canteen
    → canteen
  2) You: 屋上  /  Rooftop
    → rooftop

## canteen
[scene: canteen]
Kaori: いらっしゃい。何にする？  /  "Welcome. What'll it be?"
[menu: カレー 500, ラーメン 600, 日替わり定食 700]
[pay from wallet 1000/500/100/100]
Mio: こっち、こっち。  /  "Over here, over here."
Mio: 新人くん、ゲームする？  /  "New guy, do you play games?"
CHOICE: Your reply
  1) You: する！  /  "I do!"
    Mio: ……じゃあ、今夜、一緒にやる？  /  "...Then want to play together tonight?"
  2) You: あんまりしない。  /  "Not much."
    Mio: ふーん。  /  "Hmm."
→ bar

## rooftop
[scene: rooftop]
Goro: おや、新人さんかい？　トマト、食べる？  /  "Oh, a new face? Want a tomato?"
CHOICE: Your reply
  1) You: 食べる！  /  "Yes please!"
    Goro: うまいだろう。明日も来なさい。  /  "Good, eh? Come again tomorrow."
  2) You: だいじょうぶ。  /  "I'm fine, thanks." (だいじょうぶ also works as a polite no)
    Goro: そうかい。  /  "Is that so."
→ bar

## bar
[scene: bar]
[clock 19:30]
IF casualGuard:
  [scene: gate]
  Ishibashi: また君か。カード。  /  "You again. Card." He remembers how you spoke to him this morning.
  (You show your card. He takes his time reading it.)
  [scene: bar]
(Evening. A small bar tucked behind the dorm blocks.)
Jun: いらっしゃい。初日？　顔に書いてあるよ。  /  "Welcome. First day? It's written all over your face."
Jun: 今日、一番大変だったのは何？  /  "What was the hardest part of today?"
[free talk with Jun: Tell Jun the hardest part of your day. He knows when you make things up.] fallback:
  CHOICE: The hardest part of today?
    1) You: 黒田さん。  /  "Kuroda."
      Jun: ああ、営業部の。……気をつけて。  /  "Ah, the one from Sales. ...Be careful."
    2) You: エレベーター。  /  "The elevator."  [only if wrongFloor]
      Jun: あのビル、迷うよね。  /  "That building is a maze, isn't it."
    3) You: コピー機。  /  "The copier."
      Jun: ……今日、コピー、したっけ？  /  "...Did you even make copies today?" He knows you're making it up.
    4) You: つかれた。全部。  /  "I'm tired. All of it."
      Jun: ほら、これ。サービス。  /  "Here. On the house."
IF gotDocs:
  [message from Rei] 今日の、あれ。何？  /  That thing today. What was it?
ELSE:
  [message from Emi] 今日はおつかれ。明日もよろしくね。  /  Good work today. See you tomorrow.
[end of day summary]
