# Day 1 draft

Same format as `transcripts/day1.md`. Design and rules are in `day1-design.md`.
Notation added for new mechanics: `[voice -1]` spends a voice mark, `[noise +1]` adds hidden noise, `[time +N]` adds minutes, `[set flag]` sets a flag, `[sus mio +1]` adds suspicion with one person. `SPELL` blocks list what each form does; "→ retry" means the ring comes back (each try costs voice), "→ continue" means the scene moves on.
Lines marked (kept) come from the current day 1 unchanged.

## monorail
[scene: monorail]
[clock 08:40]
(Your first day at Amakawa. The monorail glides across Tokyo Bay toward the company's island city.) (kept)
Announcement: まもなく、天川シティ中央駅です。お出口は右側です。  /  "Arriving shortly at Amakawa City Central Station. The exit is on the right." (kept)
CHOICE: The train slows down. Which doors?
  1) You: 右のドア  /  The right-hand doors
    (The right-hand doors slide open onto the platform.)
  2) You: 左のドア  /  The left-hand doors
    (The left doors stay shut. You squeeze across the crowded carriage as the right-hand doors open.)  [time +2]
[message from Emi] おはよう！九時に地下二階の企画室7に来てね。  /  Morning! Come to Planning Office 7, basement level 2, at nine. (kept)
→ gate

## gate
[scene: gate]
Ishibashi: ちょっと、止まって。  /  "Hold it. Stop." (kept; plants 止まって for the copy room)
Ishibashi: 見ない顔だな。IDカードは？  /  "Don't know your face. ID card?"
CHOICE: What do you do?
  1) You: IDカードを見せる  /  Show your ID card
  2) You: 名刺を出す  /  Hand him a business card
    Ishibashi: 名刺じゃない。ID。  /  "Not a business card. ID."  (back to the choice)
  3) You: にっこり笑う  /  Smile brightly
    Ishibashi: ……笑ってもダメだ。ID。  /  "...Smiling won't help. ID."  (back to the choice)
Ishibashi: ……新人か。企画室7？　ああ、地下の連中か。  /  "...A new hire. Planning Office 7? Ah, that basement lot."
Ishibashi: 変なことしたら、すぐわかるからな。  /  "Do anything strange and I'll know right away."
CHOICE: Your reply
  1) You: はい、よろしくお願いします。  /  "Yes, nice to meet you." (polite)
    Ishibashi: ……ん。  /  "...Mm."
  2) You: うん、よろしく。  /  "Yeah, nice to meet you." (casual)
    Ishibashi: ……なれなれしいな。  /  "...Aren't you over-familiar." Casual speech with an older stranger on duty comes across as cheeky.  [set casualGuard] [sus ishibashi +1]
  3) You: 変なこと？  /  "Something strange?"
    Ishibashi: 気にするな。行け。  /  "Never mind. Go."
→ elevator1

## elevator1
[scene: elevator]
[elevator to B2]  (wrong floors as now; B1 narration: "Boxes, shelves, a flickering light and a copier with a handwritten sign taped to it. Wrong floor.")
→ office

## office
[scene: office]
Mio: ……誰？  /  "...Who are you?"
CHOICE: Your reply
  1) You: 新人だよ。よろしく。  /  "The new guy. Nice to meet you." (casual)
    Mio: ふーん。……ミオ。今ゲーム中だから、話しかけないで。  /  "Hmm. ...Mio. I'm in the middle of a game, so don't talk to me."
  2) You: 今日からここで働きます。よろしくお願いします。  /  "I start working here today. Nice to meet you." (polite)
    Mio: かたいね。……ミオ。今ゲーム中。  /  "So stiff. ...I'm Mio. In the middle of a game."
  3) You: そっちこそ誰？  /  "Who are you, then?"
    Mio: ……ふふ。ミオ。今ゲーム中。話しかけないで。  /  "...Heh. Mio. I'm in a game. Don't talk to me."
IF time after 09:00:
  Emi: 遅刻だよ、新人くん。まあ、いいけど。私はエミ。ここのリーダー……いちおうね。  /  "You're late, new guy. Whatever. I'm Emi. The leader here... technically."
ELSE:
  Emi: 来た来た。君が新人くん？　私はエミ。ここのリーダー……いちおうね。  /  "There you are. You're the new guy? I'm Emi. The leader here... technically."
CHOICE: Your reply
  1) You: よろしくお願いします。  /  "Nice to meet you." (polite)
    Emi: まじめだね。  /  "So serious."
  2) You: うん、よろしく。  /  "Yeah, nice to meet you." (casual)
    Emi: うん、それでいいよ。  /  "Yeah, that's fine."
  3) You: ……いちおう？  /  "...Technically?"
    Emi: そう、いちおう。  /  "Yep. Technically."
Emi: 試用期間は三か月。……まあ、がんばって。  /  "Your probation is three months. ...Well, do your best."
(Emi shows you your desk and a login that doesn't work. On the way back she stops at an old coffee machine in the corner and hits it twice.)
[clock 09:10]
Emi: 動いて。……お願い、動いて。  /  "Work. ...Please, work."
(Nothing.)
Emi: いつもこう。たたくと、たまに動くんだけど。  /  "It's always like this. Sometimes it works if you hit it."
(Her phone buzzes.)
Emi: あ、ごめん。電話。  /  "Oh, sorry. Phone call."
(Emi steps out into the corridor. Mio has her headphones on. It's just you and the coffee machine.)
CHOICE: The coffee machine.
  1) You: たたく  /  Hit it, like Emi did
    (You hit it. Nothing. Not even a hum.)
  2) You: （小さい声で）「動いて」  /  Quietly, like Emi: "Work."
    (The machine shudders, hums, and pours a cup.)
    (You look around. Mio's eyes haven't left her screen. Emi is still talking in the corridor.)
    [set coffeeMagic] [voice -1, not shown yet]
  3) You: （何もしない）  /  Leave it alone
    (First day. No need to break anything.)
(Emi comes back in, still looking at her phone.)
IF coffeeMagic:
  Emi: あれ、コーヒー？　動いたの？  /  "Huh, coffee? It worked?"
  Emi: 私がたたいても、動かないのに。  /  "It never works when I hit it."
  Emi: 新人くん、機械に好かれるタイプ？  /  "Are you the type machines like, new guy?"
  CHOICE: Your reply
    1) You: たまたまだよ。  /  "Just luck."
      Emi: ふーん。  /  "Hmm."
    2) You: うん、けっこう好かれる。  /  "Yeah, they like me a lot."
      Emi: あはは。いいね。  /  "Ha ha. Nice."  [emi +1]
    3) You: たたいたら、動いた。  /  "I hit it and it worked."
      Emi: え、ずるい。  /  "Hey, not fair."
  Emi: じゃあ、ちょうどいい。  /  "Then this is perfect."
ELSE:
  Emi: さっそくだけど、お願いがあるの。  /  "Straight to it: I need a favour."
(She hands you a proposal, four stapled pages.)
Emi: これ、コピーお願い。十部。  /  "Copy this for me, please. Ten sets."
Emi: 十一時の会議で使うの。  /  "It's for the eleven o'clock meeting."
Emi: コピー室は地下一階。  /  "The copy room's on basement level one."
Emi: コピー機、ちょっと古いけど。  /  "The copier's a bit old, though."
Mio: ちょっとじゃない。こわれてる。  /  "Not a bit. It's broken." (She doesn't look up.)
Emi: ……かなり古いけど。がんばって。  /  "...Very old, then. Good luck."
[clock 09:15]
→ elevator_b1

## elevator_b1
[scene: elevator]
[elevator to B1]  (wrong floors as now; B2: "You're already here. The copy room is somewhere else.")
→ copyroom

## copyroom
[scene: copyroom]
(Basement level one. Metal shelves, boxes of paper, a light that can't make up its mind, and a copier older than you. There's a sign taped to it.)
[sign] こわれています。  /  "Out of order." (handwritten)
CHOICE: The copier.
  1) You: ボタンを押す  /  Press the start button
    (Nothing. The screen stays dark.)
  2) You: たたく  /  Hit it, Emi's way
    (One orange light blinks, thinks about it, and goes out.)
  3) You: （コーヒーの時みたいに）  /  Like with the coffee  [only if coffeeMagic]
    (no extra text; straight to the reveal)
IF coffeeMagic:
  (The coffee machine this morning wasn't luck. You knew that when it happened.)
(It has been like this since you were small. Ask for something in Japanese and truly mean it, and the world does it. The old word is 言霊, kotodama.)
(It does what the words say. Exactly what they say, and nothing you only meant.)
(Nobody at Amakawa knows. Better keep it that way.)
[the voice marks appear: 5, or 4 if coffeeMagic]
SPELL: Get the copier running.  (verb 動く; hint: "Ask it the way Emi asked the coffee machine.")  [voice -1 per try]
  動いて:
    (It hums awake. The screen lights up green, as if nothing had ever been wrong.)  → continue
  動け:
    (It wakes with a roar. Every light comes on at once and the fan howls. It works. It's also very loud.)  [noise +1]  → continue
  動く:
    (It shudders once, as if agreeing that copiers do move. Then nothing.)  → retry
  動いた:
    (It does the last thing it did: it prints the sign. こわれています. こわれています. Thirty times. Then it goes back to sleep.)  [time +3]  → retry
  default:
    (Nothing. The words fall flat.)  → retry
[clock advances]
(The screen blinks: 紙づまり. A corner of paper sticks out of a slot in the side.)
CHOICE: Paper jam.
  1) You: （手で紙を出す）  /  Pull it out by hand. About five minutes.
    (Two panels, one lever, and a page that tears into three pieces. Five minutes, and toner on your sleeve.)  [time +5]
  2) You: （言霊を使う）  /  Use kotodama
    SPELL: Clear the jam.  (verb 出す)
      出して:
        (The page slides out by itself and drops into your hand. The copier sighs.)  → continue
      出せ:
        (It spits out the page. Then the whole paper tray. A hundred sheets hit the door like a flock of pigeons.)  [noise +1] [time +3 picking them up]  → continue
      出す:
        (Nothing comes out.)  → retry
      default:
        (Nothing. The words fall flat.)  → retry
(You put Emi's proposal on the glass.)
SPELL: Make the copies Emi asked for.  (count slot: 十部 / 二十部 / 百部 / no count; verb コピーする)
  コピーして + 十部:
    (It starts copying. Slowly.)  [set copies10]  → speed
  コピーして + 二十部:
    (It starts copying. Slowly.)  [set copies20, spareCopies]  → speed
  コピーして + 百部:
    (It takes the number very seriously and starts copying. Slowly.)  [set copies100, spareCopies] [noise +1]  → speed
  コピーして + no count:
    → runaway
  コピーしろ + any count:
    (It copies at three times the speed, rattling like a train.)  [noise +1]  → footsteps (no speed step; no count still → runaway)
  コピーする:
    (It agrees that copying is what it does. It doesn't do any.)  → retry
  default:
    (Nothing. The words fall flat.)  → retry

### speed
(One page every ten seconds. Four pages a set.)
IF copies10: (Ten sets: about seven minutes.)
IF copies20: (Twenty sets: about fourteen minutes.)
IF copies100: (A hundred sets: a little over an hour.)
CHOICE: It's slow.
  1) You: （待つ）  /  Wait
    (You wait. The light flickers. Somewhere a pipe knocks.)  [time +7 / +14 / +70]
  2) You: （言霊を使う）  /  Use kotodama
    SPELL: Speed it up.  (verb 急ぐ)
      急いで:
        (The pages come out in a blur. Done in half a minute. Every page is slightly crooked.)  [set crooked]  → continue
      急げ:
        (It goes so fast it smokes. Done in ten seconds, all crooked, and the room smells of burnt toner.)  [set crooked] [noise +1]  → continue
      急ぐ:
        (It agrees that hurrying is good. It doesn't.)  → back to the choice
      default:
        (Nothing. The words fall flat.)  → back to the choice
→ footsteps

### runaway
(It finishes ten sets. Then twenty. It doesn't stop. You said copy. You never said how many.)
(Paper spills over the tray onto the floor.)
CHOICE (8 seconds): Stop it!
  1) You: （コンセントを抜く）  /  Pull the plug
    (It dies mid-page. Silence, and about sixty copies on the floor.)  [time +3]
  2) You: （言霊を使う）  /  Use kotodama
    SPELL: Stop the copier.  (verbs 止まる, 止める)
      止まって:
        (It stops mid-page and waits, politely. The guard's word from this morning works on copiers too.)  → continue
      止まれ:
        (It stops so hard the whole machine jumps. Then silence. A lot of silence.)  [noise +1]  → continue
      止めて:
        (The paper stops. The rollers don't. They spin on, screaming, feeding nothing.)  [noise +1]  → retry
      default:
        (More paper.)  → retry
  (timer runs out):
    (The pile slides off the tray and across the floor.)  [noise +1]  → the same choice again, no timer
[set spareCopies, pileOnFloor]
→ footsteps

### footsteps
(Footsteps in the corridor. Slow ones. Slippers.)
CHOICE: Someone's coming.
  1) You: （じっとする）  /  Keep still
    IF noise >= 2:
      (The door opens.)
      Mio: ……うるさい。  /  "...Noisy."
      (She looks at the copier. It's on. Then she looks at you.)
      Mio: それ、こわれてなかった？  /  "Wasn't that thing broken?"
      CHOICE: Your reply
        1) You: たたいたら、動いた。  /  "I hit it and it worked."
          Mio: ……エミさんがたたいても、動かないのに。  /  "...It never works when Emi hits it."
        2) You: なおした。  /  "I fixed it."
          Mio: ……へえ。三か月、だれもなおせなかったよ。  /  "...Huh. Nobody could fix it for three months."
        3) You: （何も言わない）  /  Say nothing
          (She waits. You wait. She shrugs.)
      Mio: ……ま、いいけど。  /  "...Whatever."
      (She shuffles off down the corridor, holding her phone up at the ceiling.)
      [set mioSaw] [sus mio +1]
    ELSE:
      (The footsteps stop right outside the door. A sigh.)
      Mio: ……ここも、電波ない。  /  "...No signal here either." (through the door)
      (The slippers shuffle away.)
  2) You: （ドアを開ける）  /  Open the door first
    (Mio is in the corridor, holding her phone above her head like a torch.)
    Mio: ……何。  /  "...What."
    IF noise >= 2:
      Mio: 中、うるさいね。  /  "Noisy in there."  [set mioHeard]
    Mio: ここも、電波ない。イベント、十二時までなのに。  /  "No signal here either. And the event ends at twelve."
    (She shuffles on down the corridor.)
(A warm pile of loose pages. They need to be in sets, in order, and stapled.)
CHOICE: Sorting.
  1) You: （手で分ける）  /  Sort them by hand. About ten minutes.
    (Page one, two, three, four. Again. Again. Again.)  [time +10]
  2) You: （言霊を使う）  /  Use kotodama
    SPELL: Put the pages in order.  (verb 並ぶ)
      並んで:
        (The pages shuffle themselves into neat sets, like people queueing for a train.)  [time +2]  → continue
      並ぶ:
        (They agree that lining up is proper. They stay a pile.)  → retry
      default:
        (Nothing. The words fall flat.)  → retry
(You staple them by hand. The stapler works fine. It's the only thing in this room that does.)
→ elevator_b2

## elevator_b2
[scene: elevator]
[elevator to B2]
→ office2

## office2
[scene: office]
(Mio is back at her desk, phone face down.)
IF time before 09:40:
  Emi: ……もう？  /  "...Already?"
ELSE:
  Emi: おかえり。どうだった？　あのコピー機。  /  "Welcome back. How was that copier?"
(She flips through the stack.)  (first match)
IF crooked:
  Emi: ……ちょっと、まがってない？  /  "...Aren't these a bit crooked?"
  Emi: ……まあ、読めるから、いいか。  /  "...Well, they're readable. Fine."
ELSE IF copies100:
  Emi: 百部？　だれが読むの。  /  "A hundred? Who's going to read them all?"
ELSE IF pileOnFloor:
  Emi: ……なんか、多くない？  /  "...Isn't this, like, a lot?"
ELSE IF copies20:
  Emi: 二十部？　……まあ、多いほうがいいか。  /  "Twenty? ...Well, better too many than too few."
ELSE:
  Emi: うそ。あのコピー機で？  /  "No way. With that copier?"
  IF time before 09:36 and noise = 0 and voice spent in copy room <= 3:
    Emi: ……新人くん、何者？  /  "...New guy, what are you?"  [set cleanRun]
IF mioSaw:
  (Mio looks at you over her screen, one second longer than she needs to.)
ELSE IF mioHeard:
  Mio: ……さっき、下、うるさかった。  /  "...It was noisy downstairs earlier."
Emi: じゃあ、もう一つ、いい？  /  "OK then. One more thing?"
Emi: 三階の営業部に行って。  /  "Go up to Sales, third floor."
Emi: 黒田さんから、去年の数字をもらってきて。  /  "Get last year's numbers from Kuroda."
Emi: チャットで二回聞いたけど、返事ないの。  /  "I asked her twice on chat. No reply."
Emi: 十時半までにね。スライドに入れたいから。  /  "By ten thirty. I want them in the slides."
Mio: 黒田レイ？　……がんばって。あの人、こわいよ。  /  "Rei Kuroda? ...Good luck. She's scary." (kept)
[save point]
→ elevator3

## elevator3
[scene: elevator]
[elevator to 3F]  (wrong floors as now; 3F is correct here)
→ sales

## sales
[scene: sales]
IF time after 10:45:
  (Rei's desk is empty. A note on her monitor says 会議中: in a meeting.)
  [set noDocs]
  → office3
Rei: 企画室7の新人？　……ああ、数字ね。  /  "The new guy from Planning 7? ...Ah, the numbers."
Rei: 悪いけど、今忙しいの。午後に来て。  /  "Sorry, I'm busy right now. Come back this afternoon."
(A salesman at the next desk is watching you over his monitor.)
CHOICE: Emi needs them by ten thirty.  (the choice comes back after options 1, 2 and a failed spell)
  1) You: お願い、今もらえない？  /  "Please, can't I have them now?"
    Rei: 聞こえなかった？　午後。  /  "Didn't you hear me? Afternoon."
  2) You: 会議のあとじゃ、おそいよ。  /  "After the meeting is too late."
    Rei: 知ってる。  /  "I know."
    (She doesn't look up.)  [set reiStalling]
  3) You: わかった。じゃあ、午後にまた来る。  /  "Fine. I'll come back this afternoon."
    [set noDocs]  → office3
  4) You: これ、会議の資料。先に見る？  /  "This is the handout for the meeting. Want an early look?"
    Rei: ……へえ。  /  "...Well, well."
    (She takes a copy and turns the pages fast. Very fast.)
    Rei: 交換ね。  /  "A trade, then."
    (She pulls a folder from her drawer and slides it across the desk without looking at it.)
    IF !spareCopies: [set shortCopy]  (that was one of Emi's ten)
    [set gotDocs, traded]  → office3
  5) You: （言霊を使う）　見ている人：一人  /  Use kotodama now. One person is watching.  (disabled if no voice left)
    SPELL: Make Rei hand over the numbers.  (verbs 渡す, 待つ; witnesses 1)
      渡して:
        Rei: ……え？　あ、うん。はい、これ。  /  "...Huh? Oh, sure. Here."
        (She hands you a folder, then stares at her own empty hand.)
        Rei: ……なんで渡したんだろう。  /  "...Why did I just hand that over?"
        Rei: 君、おもしろいね。  /  "You're interesting."
        [set gotDocs, reiMagic] [sus rei +1]  → office3
      渡せ:
        Rei: ……っ。  /  "...!"
        (Her hand slaps the folder down on the desk in front of you. She looks at her hand, then at you.)
        Rei: ……今、私に命令した？  /  "...Did you just give me an order?"
        (The salesman at the next desk has stopped typing.)
        [set gotDocs, reiMagic, reiCommanded] [sus rei +2]  → office3
      待って:
        Rei: ……？　何？　今、体が止まった……。  /  "...? What? My body just... stopped."
        [set waitBackfire] [sus rei +1]  → back to the choice
      default:
        Rei: ……何か言った？  /  "...Did you say something?"  → back to the choice
  6) You: （人がいなくなるまで待つ）  /  Wait until the salesman leaves. About 15 minutes.
    [time +15]
    IF time after 10:45:
      Rei: まだいるの？　もう会議。  /  "You're still here? I've got a meeting now."
      (She picks up her laptop and walks past you.)
      [set noDocs]  → office3
    ELSE:
      (The salesman finally gets up for coffee. It's just you and Rei.)
      SPELL: the same as option 5, with no witness (渡せ without the salesman line; sus rei +1 instead of +2)
IF gotDocs and reiMagic:
  (At the elevator you look back. She's still watching you.)
→ office3

## office3
[scene: elevator]
(You ride the elevator back down to basement level two.)
[scene: office]
IF gotDocs:
  IF time after 10:30:
    Emi: スライドは、もう無理か。……まあ、口で言う。  /  "Too late for the slides. ...I'll just say them out loud."  [set docsLate]
  Emi: 黒田さんから？　……本当に？  /  "From Kuroda? ...Really?"
  Mio: ……どうやったの？　あの黒田さんから。  /  "...How did you pull that off? From Kuroda, of all people." (kept)
  CHOICE: Your secret is at stake.
    1) You: 運がよかっただけ。  /  "I just got lucky."
      Mio: ふーん……。  /  "Hmm..."
    2) You: ひみつ。  /  "It's a secret."
      Mio: ……へえ。  /  "...Oh, really."  [mio +1] [sus mio +1]
    3) You: 黒田さん、やさしかったよ。  /  "Kuroda was nice to me."
      Mio: うそでしょ。  /  "No way."
    4) You: 資料を見せた。  /  "I showed her the handout."  [only if traded]
      Emi: ……え。  /  "...Huh."
      (Emi's smile stays on. Her eyes don't.)
      Emi: ……そっか。まあ、しかたない。  /  "...I see. Well, can't be helped."  [set emiKnowsTrade]
  IF shortCopy:
    Emi: あれ、九部？　……まあ、私のなしでいいか。  /  "Huh, nine? ...Fine, I'll go without mine."
  Emi: ありがとう。じゃあ、行ってくる。  /  "Thanks. OK, I'm off."
ELSE:
  Emi: 午後か……。まあ、初日だしね。  /  "This afternoon, huh... Well, it's your first day." (kept, shortened)
  Emi: 数字なしで、なんとかする。行ってくる。  /  "I'll manage without the numbers. I'm off."
(Emi takes the copies and goes. It's quiet: the fan, Mio's keyboard.)
IF mioSaw:
  Mio: ……さっきの、コピー室。  /  "...The copy room, earlier."
  Mio: だれにも言わない。……今は。  /  "I won't tell anyone. ...For now."
ELSE:
  Mio: ……あのコピー機、三か月こわれてた。  /  "...That copier was broken for three months."
  Mio: ……ま、いいけど。  /  "...Whatever."
(She puts her headphones back on.)
IF coffeeMagic:
  (A little later Mio takes your coffee without asking, drinks it, and says nothing. You decide that's a compliment.)
→ afternoon

## afternoon
[clock 14:00]
IF noDocs:
  (At two you go back up to Sales. Rei hands over the folder without looking up from her screen. The meeting was at eleven.)
(The afternoon disappears into a login that still doesn't work.)
[clock 17:40]
Mio: ……おつ。  /  "...Later." (short for おつかれ)
(Mio leaves at 17:40 exactly, her game already loading on her phone.)
→ evening

## evening
[scene: office]
[clock 18:10]
(Emi comes back from the meeting and sinks into her chair.)
(first match)
IF traded:
  Emi: 黒田さん、資料、全部読んでた。  /  "Kuroda had read the whole handout."
  Emi: 質問も、全部用意してた。……なんでだろうね。  /  "She had every question ready. ...Wonder why."
  (She doesn't look at you when she says it.)
ELSE IF gotDocs and !docsLate:
  Emi: 会議、けっこううまくいった。  /  "The meeting went pretty well."
  Emi: 黒田さん、ちょっとびっくりしてた。  /  "Kuroda looked a bit surprised."
ELSE IF docsLate:
  Emi: スライドはなかったけど、まあまあ。  /  "No slides, but it went OK."
ELSE:
  Emi: 数字がなくて、ちょっと大変だった。  /  "Without the numbers it was a bit rough."
  Emi: ……まあ、次。  /  "...Well. Next time."
IF crooked:
  (She tilts her head to one side, the way everyone in the meeting did when they opened your copies.)
IF copies100:
  Emi: あと、残りの九十部、どうする？  /  "Also, what do we do with the other ninety?"
Emi: で、初日、どうだった？  /  "So. How was your first day?"
[free talk with Emi, 2 turns: Tell Emi how your first day went. Facts passed: copies (speed, crooked, count), how the numbers were got (magic, trade, none), whether Mio saw, the meeting result. She never confirms magic; if you mention 言霊 or 魔法 she treats it as a joke: 「はいはい。」] fallback:
  CHOICE: Your first day?
    1) You: たのしかった。  /  "It was fun."
      Emi: よかった。明日もたのしいよ、たぶん。  /  "Good. Tomorrow will be fun too. Probably."
    2) You: つかれた。  /  "I'm tired."
      Emi: だよね。初日だもん。  /  "I bet. It's your first day."
    3) You: コピー機と、なかよくなった。  /  "I made friends with the copier."
      IF coffeeMagic:
        Emi: やっぱり。機械に好かれるタイプだ。  /  "Knew it. Machines like you."
      ELSE:
        Emi: あはは。それ、すごいことだよ。  /  "Ha ha. That's an achievement."
    4) You: 黒田さん、こわかった。  /  "Kuroda was scary."
      IF gotDocs:
        Emi: でしょ。でも、今日は勝ったね。  /  "Right? But you won today."
      ELSE:
        Emi: でしょ。私も、ちょっとこわい。  /  "Right? She scares me a bit too."
Emi: 明日もよろしくね。  /  "See you tomorrow."
IF coffeeMagic:
  Emi: ……あ、明日も、コーヒーお願い。  /  "...Oh, and coffee again tomorrow, please."
→ leaving

## leaving
IF casualGuard:
  [scene: gate]
  (On your way out, the gate.)
  Ishibashi: また君か。カード。  /  "You again. Card." (kept)
  (You show your card. He takes his time reading it.)  [time +5]
IF reiMagic:
  [message from Rei] 今日の、あれ。何？  /  That thing today. What was it? (kept)
ELSE IF traded:
  [message from Rei] 資料、ありがとう。おもしろかった。  /  Thanks for the handout. It was interesting.
ELSE:
  [message from Emi] 今日はおつかれ。ゆっくり寝てね。  /  Good work today. Get some sleep.
[end of day summary]

---

## Player read-through: what I found and changed

I read every branch as a player (coffee yes/no × noise low/high × Mio door or still × each count × each Rei route × LLM on/off) and ran the dialogue and story-analysis checks.

Fixed during revision:
1. **Double spell for the first cast.** The first version had a 「動いて」 choice option followed by the spell ring asking for 動いて again. Now manual tries fail first, then the reveal, then one ring. Coffee players get a direct option.
2. **The goal text gave away the count.** "Make ten copies" in the ring made the listening check pointless. Changed to "Make the copies Emi asked for."
3. **「……もう？」 after a slow run.** A player who did everything by hand came back at 9:45 to "Already?". Split by time: slow players get 「おかえり。どうだった？」.
4. **The trade was only possible with spare copies,** which made it invisible to most players. It's now always offered. With exactly ten you give away one of Emi's, and she ends up without her own copy (「あれ、九部？」). That's a consequence players can see, and it says something about Emi.
5. **Crooked copies were mentioned twice with the same words** (office and evening). The evening now has a silent callback (her head tilt).
6. **Emi said 「明日もよろしくね」 in person and then again in the night message.** The message now says 「ゆっくり寝てね。」
7. **Mio's corridor walk had no reason.** The footsteps were only there for the player's benefit. Mio now has her own errand (signal for a game event ending at noon), and she says so only when you meet her.
8. **A failed spell at Sales ended the scene** (old engine behaviour). The draft returns to the choice, so a player who fizzles can still trade or leave.
9. **Hundred copies with waiting took 70 minutes** and made Sales impossible without any warning. That's kept on purpose, but the speed step now states the time ("a little over an hour") before you choose.
10. **Voice check (tags covered)**: Emi's lines all had the same shape (statement + ね). Varied: 「え、ずるい。」, 「だよね。初日だもん。」, 「……まあ、次。」. Mio never uses ！ or more than two short clauses. Rei never explains herself; her longest line is Ishibashi-short.

Still open or worth watching:
- Office has two register replies in a row (Mio, Emi). They read fine, but if it drags, cut Emi's reply choice.
- The copy room is the longest scene (about 8-12 screens). If playtesting shows fatigue, drop the sort step first and move it to day 2's copier return.
- 電波 and 交換 are above N4. Both are on screen with ruby or in kana, and neither is needed to act.
- The LLM persona needs the new day-1 facts (`dayFacts` still says "did NOT use the copier today").
