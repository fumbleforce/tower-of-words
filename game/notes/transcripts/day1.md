# Day 1

## monorail
[scene: monorail]
[clock 08:40]
(The Amakawa monorail runs out across Tokyo Bay to the company's island. At this hour the carriage is empty.)
(Your boxes went ahead last week. You have a backpack, and a company phone that buzzed the moment you sat down.)
[phone: new-hire app: welcome, name for the ID card, island map, room 203, ID card, then the Japanese check or a preset]
Announcement: まもなく、天川シティ中央駅です。お出口は右側です。  /  "Arriving shortly at Amakawa City Central Station. The exit is on the right."
CHOICE: The train slows down. Which doors?
  1) You: 右のドア  /  The right-hand doors
    (The right-hand doors slide open onto the platform.)
  2) You: 左のドア  /  The left-hand doors
    (The left-hand doors stay shut. The right-hand ones open behind you, and you cross the empty carriage.)
    [time +1]
[message from Emi] おはよう！九時に地下二階に来てね。  /  Morning! Come to basement level 2 at nine.
[task: 地下二階・企画室7]
→ gate

## gate
[scene: gate]
[clock 08:48]
(Amakawa Tower. A row of glass gates, and nobody at the security desk.)
(You hold your phone to the reader. The gate beeps and stays shut. It doesn't know your new ID yet.)
Ishibashi (voice only): ちょっと、止まって。  /  "Hold it. Stop."
(A man's voice, from a speaker above the gates. Somewhere, a camera is pointed at you.)
Ishibashi (voice only): 見ない顔だな。  /  "Don't know your face."
Ishibashi (voice only): IDカード、カメラに見せて。  /  "Show your ID card to the camera."
CHOICE: What do you do?
  1) You: IDをカメラに見せる  /  Show your ID to the camera
  2) You: 笑う  /  Smile at the camera  [back to the choice]
    Ishibashi (voice only): ……いや、ID。  /  "...No. ID."
  3) You: （何もしない）  /  Do nothing  [back to the choice]
    Ishibashi (voice only): ……ID。  /  "...ID."
(You hold the ID on your phone up to the camera.)
Ishibashi (voice only): ……新人か。  /  "...A new hire."
Ishibashi (voice only): 企画室7？　地下の連中か。  /  "Planning Office 7? That basement lot."
Ishibashi (voice only): ……カメラで、見てる。  /  "...I'm watching. On camera."
CHOICE: Your reply
  1) You: はい、よろしくお願いします。  /  "Yes. Nice to meet you." (polite)
    Ishibashi (voice only): ……ん。  /  "...Mm."
  2) You: うん、よろしく。  /  "Yeah, nice to meet you." (casual)
    Ishibashi (voice only): ……なれなれしいな。  /  "...Bit familiar, aren't you." Casual speech with an older stranger on duty comes across as cheeky.
    [set casualGuard]
    [suspicion ishibashi +1]
  3) You: ……いつも？  /  "...Always?"
    Ishibashi (voice only): ……いつも。  /  "...Always."
(The gate turns green.)
→ elevator_b2

## elevator_b2
[scene: lift]
[elevator to B2]
→ office

## office
[scene: office]
(Basement level two. Pipes along the ceiling, cup noodles on the desks, no windows.)
[show mio bored]
Mio [bored]: ……誰？  /  "...Who are you?"
CHOICE: Your reply
  1) You: 新人だよ。よろしく。  /  "The new guy. Nice to meet you." (casual)
    Mio [bored]: ふーん。……ミオ。  /  "Hmm. ...Mio."
  2) You: 今日からここで働きます。よろしくお願いします。  /  "I start here today. Nice to meet you." (polite)
    Mio [smirk]: かたいね。……ミオ。  /  "So stiff. ...Mio." Between coworkers your age, casual speech is normal.
  3) You: そっちこそ誰？  /  "Who are you, then?"
    Mio [smirk]: ……ふふ。ミオ。  /  "...Heh. Mio."
Mio [bored]: 今、ゲーム中。  /  "In the middle of a game."
(She tilts her phone away from you.)
(Someone gets up from the desk by the whiteboard.)
[show emi smile]
IF time after 09:00:
  Emi [teasing]: 遅刻だよ、新人くん。  /  "You're late, new guy."
ELSE:
  Emi [smile]: あ、新人くん？  /  "Oh, the new guy?"
Emi [smile]: 私はエミ。ここのリーダー。  /  "I'm Emi. The leader here."
Emi [teasing]: ……いちおうね。  /  "...Technically."
CHOICE: Your reply
  1) You: よろしくお願いします。  /  "Nice to meet you." (polite)
    Emi [smile]: まじめだね。  /  "So serious."
  2) You: うん、よろしく。  /  "Yeah, nice to meet you." (casual)
    Emi [smile]: うん、それでいいよ。  /  "Yeah, that's fine." Emi prefers casual.
  3) You: ……いちおう？  /  "...Technically?"
    Emi [teasing]: そう、いちおう。  /  "Yep. Technically."
(Emi shows you your desk. The computer wants a password nobody has given you.)
Emi [smile]: さっそく、お願い。  /  "Straight to it: a favour."
(She hands you a proposal: four pages, stapled.)
Emi [smile]: これ、コピーして。十部。  /  "Copy this for me. Ten sets."
Emi [smile]: 十一時の会議で、使う。  /  "It's for the eleven o'clock meeting."
Emi [smile]: コピー室は、地下一階。  /  "The copy room's on basement level one."
Emi [teasing]: コピー機、ちょっと古いよ。  /  "The copier's a little old."
Mio [bored]: ちょっとじゃない。  /  "Not a little." She doesn't look up.
Mio [bored]: こわれてる。  /  "It's broken."
Emi [teasing]: ……かなり、古いね。  /  "...Very old, then."
Mio [bored]: ……また、つながらない。  /  "...Lost the connection again."
(Mio gets up, holds her phone at the ceiling, and shuffles out into the corridor in her slippers.)
[everyone leaves the frame]
[task: コピー]
→ elevator_b1

## elevator_b1
[scene: lift]
[elevator to B1]
→ copyroom

## copyroom
[scene: copyroom]
[clock 09:15]
[stamp copy]
(Basement level one. Shelves of toner, a desk with a stapler, and a copier older than you. You shut the door behind you.)
[printed] こわれています  /  "Out of order." A printout, taped to the lid.
CHOICE: The copier.
  1) You: ボタンを押す  /  Press the start button
    (The screen flickers on long enough to show one word, 紙づまり, and goes dark.)
  2) You: パネルを開ける  /  Open the side panel
    (A page is caught deep in the rollers. You pull. It tears, and most of it stays in there.)
  3) You: たたく  /  Hit it
    (One orange light blinks, thinks about it, and goes out.)
(There's one more thing you could try. You check the door. Still shut.)
(Ever since you started learning Japanese, when you ask for something and truly mean it, it happens. You never found out why.)
(There's a word for it: 言霊, kotodama. Nobody at Amakawa knows you can do it, and you'd like to keep it that way.)
(Five times a day, more or less. After that your voice just gives out.)
[set knowsMagic]
SPELL: Get the stuck page out. (verbs 出す; answer 出して)
  hints: Ask it, the way you'd ask a person. → The way Emi asked you. → The way Emi asked you: これ、コピーして.
  cast 出して (works):
    (The torn page slides out by itself and drops into your hand. The copier sighs, and its screen lights up green.)
  cast 出せ (works, overdone):
    (It spits out the page. Then the whole paper tray. A hundred sheets hit the door like startled pigeons.)
    [noise +1]
    (The screen lights up green. You spend a few minutes picking up paper.)
    [time +3]
  cast 出す (retry):
    (The copier hums, as if agreeing that paper does come out of copiers. Nothing comes out.)
  cast 出した (retry):
    (It prints the last thing it ever printed: a sheet that says こわれています. So that's where the sign came from. Then it jams again.)
  cast 出て (retry):
    (The torn page wriggles halfway out, the way you'd step out of a door, and stops there.)
  cast 出てきて (retry):
    (The torn page wriggles halfway out, the way you'd step out of a door, and stops there.)
  cast default (anything else) (retry):
    (The words come out wrong. Nothing happens.)
  stop, or out of voice:
    (You fish the rest of the page out with a ruler, one strip at a time. Twenty minutes later the screen lights up green.)
    [time +20]
→ copy_count

## copy_count
[lcd] 部数？  /  The screen asks how many copies.
CHOICE: 部数
  1) You: 10  /  10
    [set copies10]
  2) You: 11  /  11
    [set copies11]
  3) You: 20  /  20
    [set copies20]
  4) You: 100  /  100
    [set copies100]
(You press start. One page every ten seconds.)
IF copies100:
  (Four hundred pages. That's more than an hour.)
ELSE:
  IF copies20:
    (Eighty pages. About fourteen minutes.)
  ELSE:
    (About forty pages. Seven minutes, give or take.)
CHOICE: It's slow.
  1) You: （待つ）  /  Wait
    (You wait. The light flickers. Somewhere a pipe knocks.)
    IF copies100:
      (After ten sets you hit stop. Ten is plenty.)
      [set copies10]
      [unset copies100]
      [time +7]
    ELSE:
      IF copies20:
        [time +14]
      ELSE:
        [time +7]
  2) You: （言霊を使う）  /  Use kotodama  [kotodama]
    SPELL: Make it go faster. (verbs 急ぐ; answer 急いで)
      cast 急いで (works):
        IF copies100:
          (Four hundred pages in a minute. The tray overflows and paper slides across the floor.)
          [noise +1]
          [time +1]
        ELSE:
          (The pages come out in a blur. Thirty seconds, and every sheet is neat.)
      cast 急げ (works, overdone):
        (It goes so fast the whole machine shakes. Ten seconds, a smell of hot toner, and half the pages come out crooked.)
        [noise +1]
        [set crooked]
      cast 急ぐ (retry):
        (It agrees that hurrying is good. It doesn't hurry.)
      cast 急いだ (retry):
        (It repeats the last thing it did: it prints the last page again, once, at the same crawl.)
      cast default (anything else) (retry):
        (The words come out wrong. Nothing happens.)
      stop, or out of voice:
        (You wait. The light flickers. Somewhere a pipe knocks.)
        IF copies100:
          (After ten sets you hit stop. Ten is plenty.)
          [set copies10]
          [unset copies100]
          [time +7]
        ELSE:
          IF copies20:
            [time +14]
          ELSE:
            [time +7]
→ copy_sort

## copy_sort
IF copies100:
  (The old copier doesn't sort. A hundred of page one, a hundred of page two, and so on, in one leaning tower.)
ELSE:
  IF copies20:
    (The old copier doesn't sort. Twenty of page one, twenty of page two, and so on, in one loose pile.)
  ELSE:
    (The old copier doesn't sort. Ten of page one, ten of page two, and so on, in one loose pile.)
CHOICE: Sorting.
  1) You: （手で分ける）  /  Sort them by hand. About ten minutes.
    (Page one, two, three, four. Again. Again.)
    IF copies100:
      [time +50]
    ELSE:
      IF copies20:
        [time +20]
      ELSE:
        [time +10]
  2) You: （言霊を使う）  /  Use kotodama  [kotodama]
    SPELL: Put the pages in order. (verbs 並ぶ; answer 並んで)
      cast 並んで (works):
        (The pages lift off the tray and line up along the desk, one, two, three, four, one, two, three, four, like people queueing for a train. You only have to pick them up.)
        [time +2]
      cast 並べ (works, overdone):
        (The pages snap into line so hard the desk rattles and the stapler falls off.)
        [noise +1]
        [set staplerFell]
        [time +2]
      cast 並ぶ (retry):
        (They agree that lining up is proper. They stay a pile.)
      cast 並んだ (retry):
        (They repeat their last move: they slide off the tray onto the floor.)
      cast 並べて (retry):
        (The pages look around for something to arrange. The toner boxes on the shelf shuffle into a neat row.)
      cast default (anything else) (retry):
        (The words come out wrong. Nothing happens.)
      stop, or out of voice:
        (Page one, two, three, four. Again. Again.)
        IF copies100:
          [time +50]
        ELSE:
          IF copies20:
            [time +20]
          ELSE:
            [time +10]
→ copy_steps

## copy_steps
(Footsteps in the corridor. Slow ones, in slippers.)
CHOICE: Someone's coming.
  1) You: （じっとする）  /  Keep still
    IF noise >= 1:
      (The door opens.)
      [show mio bored]
      Mio [bored]: ……うるさい。  /  "...Noisy."
      (She looks at the copier, humming and green. Then at you.)
      Mio [suspicious]: それ、こわれてなかった？  /  "Wasn't that thing broken?"
      CHOICE: Your reply
        1) You: たたいた。  /  "I hit it."
          Mio [suspicious]: ……エミさんも、たたいてた。  /  "...Emi used to hit it too." It never worked for her.
        2) You: なおした。  /  "I fixed it."
          Mio [suspicious]: ……へえ。三か月、こわれてたよ。  /  "...Huh. It was broken for three months."
        3) You: （何も言わない）  /  Say nothing
          (She waits. You wait. She shrugs.)
      Mio [bored]: ……ま、いいけど。  /  "...Whatever."
      (She shuffles off down the corridor, phone held up at the ceiling.)
      [set mioSaw]
      [suspicion mio +1]
    ELSE:
      (The footsteps stop right outside the door. A sigh.)
      Mio (voice only): ……ここも、つながらない。  /  "...No signal here either." Through the door.
      (The slippers shuffle away.)
  2) You: （ドアを開ける）  /  Open the door first
    (Mio is in the corridor, holding her phone above her head like a torch.)
    [show mio bored]
    Mio [bored]: ……何。  /  "...What."
    IF noise >= 1:
      Mio [suspicious]: 中、うるさいね。  /  "Noisy in there."
      [set mioHeard]
    Mio [bored]: ここも、つながらない。  /  "No signal here either."
    Mio [bored]: イベント、十二時まで。  /  "The event ends at twelve."
    (She shuffles on down the corridor.)
IF staplerFell:
  (You pick the stapler up off the floor and staple the sets by hand. It works on the first try.)
ELSE:
  (You staple the sets by hand. The stapler, at least, has never been broken.)
→ elevator_back

## elevator_back
[scene: lift]
[elevator to B2]
→ office2

## office2
[scene: office]
(Mio is back at her desk, phone face down.)
[show mio bored]
[show emi smile]
IF back within 12 min of copy:
  [set fastBack]
  Emi [surprised]: ……もう？  /  "...Already?"
ELSE:
  Emi [surprised]: おかえり。……え、できた？  /  "Welcome back. ...Wait, you actually did it?"
(She flips through the stack.)
IF crooked:
  Emi [surprised]: ……ちょっと、まがってない？  /  "...Aren't these a bit crooked?"
  Emi [teasing]: ……セーフ。  /  "...Close enough."
ELSE:
  IF copies100:
    Emi [surprised]: 百部？　だれが読むの。  /  "A hundred? Who's going to read them all?"
  ELSE:
    IF copies20:
      Emi [smile]: 二十部？　……多いほうが、いいか。  /  "Twenty? ...Better too many than too few."
    ELSE:
      IF copies11:
        Emi [teasing]: 十一部？　一つ、多いね。  /  "Eleven? One too many."
      ELSE:
        IF fastBack:
          Emi [surprised]: うそ。あのコピー機で？  /  "No way. With that copier?"
          IF casts so far <= 3:
            IF noise >= 1:
            ELSE:
              Emi [teasing]: ……新人くん、何者？  /  "...New guy, what are you?"
              [set cleanRun]
        ELSE:
          Emi [smile]: ありがとう。助かる。  /  "Thanks. That helps."
IF mioSaw:
  (Mio looks at you over her screen, one second longer than she needs to.)
ELSE:
  IF mioHeard:
    Mio [suspicious]: ……コピー室、うるさかったね。  /  "...Noisy in the copy room, wasn't it."
Emi [smile]: じゃあ、もう一つ、いい？  /  "OK then. One more thing?"
Emi [smile]: 三階の営業部に行って。  /  "Go up to Sales, third floor."
Emi [smile]: 黒田さんの数字が、ほしい。  /  "I need Kuroda's numbers."
Emi [worried]: 二回、聞いた。  /  "I've asked her twice." No reply, clearly.
Emi [smile]: 会議の前に、ね。  /  "Before the meeting, OK?"
Mio [smirk]: 黒田レイ？　……がんばって。  /  "Rei Kuroda? ...Good luck."
Mio [bored]: あの人、こわいよ。  /  "She's scary."
Emi [teasing]: こわくないよ。……ちょっとしか。  /  "She's not scary. ...Only a little."
[everyone leaves the frame]
[task: 黒田さん・数字]
→ elevator_3f

## elevator_3f
[scene: lift]
[elevator to 3F]
→ sales

## sales
[scene: sales]
(Third floor, Sales. Phones ringing, fast keyboards, and nobody looks up.)
(At the window desk, a woman with a silver ponytail is typing. The nameplate says 黒田.)
(You tell her you're from Planning 7, and that Emi sent you.)
[show rei cold]
Rei [cold]: 企画室7の新人？　……ああ、数字ね。  /  "The new guy from Planning 7? ...Ah, the numbers."
Rei [cold]: 今、忙しい。午後に来て。  /  "I'm busy. Come back this afternoon."
(The man at the next desk is watching you over his monitor.)
CHOICE (comes back until gotDocs): Rei won't look up.
  1) You: お願い。今、ほしい。  /  "Please. I need them now."  [back to the choice]
    Rei [cold]: 聞こえなかった？　午後。  /  "Didn't you hear me? Afternoon."
  2) You: 会議の前に、ほしい。  /  "I need them before the meeting."  [back to the choice]
    Rei [smirk]: 知ってる。  /  "I know."
    (She doesn't look up.)
  3) You: わかった。じゃあ、午後にまた来る。  /  "Fine. I'll come back this afternoon."
    [set noDocs]
  4) You: （言霊）　見ている人：一人  /  Use kotodama now. One person is watching.  [only if !witnessGone]  [kotodama]  [back to the choice]
    SPELL: Get Rei to give you the numbers. (verbs 渡す, 見せる; answer 渡して; witnesses 1)
      cast 渡して (works):
        Rei [confused]: ……え？　あ、うん。はい、これ。  /  "...Huh? Oh, sure. Here."
        (She hands you a thick folder, then stares at her own empty hand.)
        Rei [confused]: ……あれ？　なんで？  /  "...Huh? Why did I...?"
        Rei [cold]: ……午後、なのに。  /  "...And I said this afternoon."
        IF !witnessGone:
          (The man at the next desk looks from Rei's empty hand to you, then back to his screen.)
        IF !witnessGone:
          [set salesWitness]
        [set gotDocs, reiMagic]
        [suspicion rei +1]
      cast 渡せ (works, overdone):
        Rei [confused]: ……っ。  /  A sharp breath.
        (Her hand slaps the folder down on the desk in front of you. She looks at her hand, then at you.)
        IF reiCommanded:
          Rei [cold]: ……また？  /  "...Again?"
        ELSE:
          Rei [cold]: ……今、私に命令した？  /  "...Did you just give me an order?"
        IF !witnessGone:
          (The man at the next desk has stopped typing.)
        IF !witnessGone:
          [set salesWitness]
        [set gotDocs, reiMagic, reiCommanded]
        [suspicion rei +2]
      cast 見せて (back to the choice):
        (She opens the folder and holds it up for you. Rows of numbers. Then she snaps it shut.)
        Rei [confused]: ……見た？  /  "...Did you see that?"
        (You saw rows of numbers, too fast to keep.)
        IF !witnessGone:
          (The man at the next desk glances over, then back at his screen.)
        IF !witnessGone:
          [set salesWitness]
        [set reiShowed, reiMagic]
        [suspicion rei +1]
      cast 見せろ (back to the choice):
        (She shoves the open folder at your face, pages flapping, and pulls it back.)
        IF reiCommanded:
          Rei [cold]: ……また？  /  "...Again?"
        ELSE:
          Rei [cold]: ……今、私に命令した？  /  "...Did you just give me an order?"
        IF !witnessGone:
          (The man at the next desk has stopped typing.)
        IF !witnessGone:
          [set salesWitness]
        [set reiCommanded, reiMagic]
        [suspicion rei +2]
      cast 渡す (back to the choice):
        Rei [cold]: うん、渡すよ。午後に。  /  "Sure, I'll hand them over. This afternoon."
      cast 見せる (back to the choice):
        Rei [cold]: うん、午後にね。  /  "Sure. This afternoon."
      cast 渡した (back to the choice):
        (She does the last thing she was doing: she types. A little faster.)
      cast 見せた (back to the choice):
        (She does the last thing she was doing: she types. A little faster.)
      cast default (anything else) (back to the choice):
        IF reiHeardNothing:
          Rei [cold]: ……何？  /  "...What?"
        ELSE:
          Rei [cold]: ……何か言った？  /  "...Did you say something?"
          [set reiHeardNothing]
  5) You: （待つ）  /  Wait until the man at the next desk leaves.  [only if !witnessGone]  [back to the choice]
    [time +20]
    (Twenty minutes later he takes a call and walks off toward the elevators. Rei hasn't moved. Neither have you.)
    [set witnessGone]
    Rei [cold]: ……まだいるの？  /  "...You're still here?"
  6) You: （言霊）　見ている人：なし  /  Use kotodama. Nobody else is watching now.  [only if witnessGone]  [kotodama]  [back to the choice]
    SPELL: Get Rei to give you the numbers. (verbs 渡す, 見せる; answer 渡して; witnesses 0)
      cast 渡して (works):
        Rei [confused]: ……え？　あ、うん。はい、これ。  /  "...Huh? Oh, sure. Here."
        (She hands you a thick folder, then stares at her own empty hand.)
        Rei [confused]: ……あれ？　なんで？  /  "...Huh? Why did I...?"
        Rei [cold]: ……午後、なのに。  /  "...And I said this afternoon."
        IF !witnessGone:
          (The man at the next desk looks from Rei's empty hand to you, then back to his screen.)
        IF !witnessGone:
          [set salesWitness]
        [set gotDocs, reiMagic]
        [suspicion rei +1]
      cast 渡せ (works, overdone):
        Rei [confused]: ……っ。  /  A sharp breath.
        (Her hand slaps the folder down on the desk in front of you. She looks at her hand, then at you.)
        IF reiCommanded:
          Rei [cold]: ……また？  /  "...Again?"
        ELSE:
          Rei [cold]: ……今、私に命令した？  /  "...Did you just give me an order?"
        IF !witnessGone:
          (The man at the next desk has stopped typing.)
        IF !witnessGone:
          [set salesWitness]
        [set gotDocs, reiMagic, reiCommanded]
        [suspicion rei +2]
      cast 見せて (back to the choice):
        (She opens the folder and holds it up for you. Rows of numbers. Then she snaps it shut.)
        Rei [confused]: ……見た？  /  "...Did you see that?"
        (You saw rows of numbers, too fast to keep.)
        IF !witnessGone:
          (The man at the next desk glances over, then back at his screen.)
        IF !witnessGone:
          [set salesWitness]
        [set reiShowed, reiMagic]
        [suspicion rei +1]
      cast 見せろ (back to the choice):
        (She shoves the open folder at your face, pages flapping, and pulls it back.)
        IF reiCommanded:
          Rei [cold]: ……また？  /  "...Again?"
        ELSE:
          Rei [cold]: ……今、私に命令した？  /  "...Did you just give me an order?"
        IF !witnessGone:
          (The man at the next desk has stopped typing.)
        IF !witnessGone:
          [set salesWitness]
        [set reiCommanded, reiMagic]
        [suspicion rei +2]
      cast 渡す (back to the choice):
        Rei [cold]: うん、渡すよ。午後に。  /  "Sure, I'll hand them over. This afternoon."
      cast 見せる (back to the choice):
        Rei [cold]: うん、午後にね。  /  "Sure. This afternoon."
      cast 渡した (back to the choice):
        (She does the last thing she was doing: she types. A little faster.)
      cast 見せた (back to the choice):
        (She does the last thing she was doing: she types. A little faster.)
      cast default (anything else) (back to the choice):
        IF reiHeardNothing:
          Rei [cold]: ……何？  /  "...What?"
        ELSE:
          Rei [cold]: ……何か言った？  /  "...Did you say something?"
          [set reiHeardNothing]
IF gotDocs:
  IF reiMagic:
    (At the elevator you look back. She's still watching you.)
[everyone leaves the frame]
→ office3

## office3
[scene: lift]
(You ride the elevator back down to basement level two.)
[scene: office]
[time +3]
[show mio bored]
[show emi smile]
IF gotDocs:
  Emi [surprised]: 黒田さんから？　……本当に？  /  "From Kuroda? ...Really?"
  Mio [suspicious]: ……どうやったの？  /  "...How did you do that?"
  CHOICE: Your secret is at stake.
    1) You: わからない。  /  "No idea."
      Mio [suspicious]: ふーん……。  /  "Hmm..."
    2) You: ひみつ。  /  "It's a secret."
      [suspicion mio +1]
      Mio [smirk]: ……へえ。  /  "...Huh."
    3) You: 黒田さん、やさしかったよ。  /  "Kuroda was nice to me."
      Mio [smirk]: うそでしょ。  /  "No way."
  Emi [smile]: ありがとう。じゃあ、行ってくる。  /  "Thanks. OK, I'm off."
ELSE:
  (You tell Emi what Rei said.)
  Emi [worried]: 午後か……。  /  "This afternoon, huh..."
  Emi [smile]: 数字なしで、なんとかする。行ってくる。  /  "I'll manage without the numbers. I'm off."
(Emi takes the copies and goes. It's quiet: the fan, Mio's keyboard.)
IF mioSaw:
  Mio [bored]: ……さっきの、コピー室。  /  "...The copy room, earlier."
  Mio [smirk]: 私のゲーム機も、見て。  /  "Take a look at my game console too."
ELSE:
  Mio [bored]: ……あのコピー機、三か月こわれてた。  /  "...That copier was broken for three months."
  Mio [bored]: ……ま、いいけど。  /  "...Whatever."
(She puts her headphones back on.)
[everyone leaves the frame]
→ afternoon

## afternoon
[clock 14:00]
IF noDocs:
  (At two you go back up to Sales. Rei hands over the folder without looking up from her screen.)
(At four, IT sends you a password. It doesn't work either.)
[clock 17:30]
[show mio bored]
Mio [bored]: ……おつ。  /  "...Later." Short for おつかれ, "good work".
(Mio leaves at half past five on the dot, her game already loading.)
→ evening

## evening
[clock 17:50]
(Emi comes back from her meetings and drops into her chair.)
[show emi smile]
IF gotDocs:
  Emi [smile]: 会議、けっこううまくいった。  /  "The meeting went pretty well."
  Emi [teasing]: 黒田さん、ちょっとびっくりしてた。  /  "Kuroda looked a bit surprised."
ELSE:
  Emi [worried]: 数字がなくて、ちょっと大変だった。  /  "Without the numbers it was a bit rough."
  Emi [smile]: ……次は、勝つ。  /  "...Next time, I win."
IF crooked:
  Emi [teasing]: コピー、みんなにわらわれた。  /  "Everyone laughed at the copies."
IF copies100:
  Emi [teasing]: あと、のこりの九十部、どうする？  /  "Also, what do we do with the other ninety?"
Emi [smile]: 今日は、もう帰っていいよ。  /  "You can go home for today."
Emi [smile]: 寮、わかる？  /  "Do you know where the dorm is?"
CHOICE: Your reply
  1) You: うん、アプリで見た。  /  "Yeah, I saw it in the app."
    Emi [teasing]: えらい。じゃあ、おつかれ。  /  "Look at you. OK, good work today."
  2) You: ……たぶん。  /  "...Probably."
    Emi [smile]: 駅のとなり。……電話、してね。  /  "Next to the station. ...Call me, OK?"
[everyone leaves the frame]
IF casualGuard:
  [scene: gate]
  (On your way out, the gates.)
  Ishibashi (voice only): また君か。  /  "You again." He remembers how you spoke to him this morning.
  Ishibashi (voice only): ……ID。  /  "...ID."
  (You hold your phone up to the camera. He takes his time.)
  [time +5]
[task: 寮]
→ dorm

## dorm
[scene: dorm]
[clock 18:30]
(Dorm A, room 203. Second floor. Your phone opens the door on the second try.)
(Your boxes are stacked by the window. The window looks straight at a concrete wall, about two metres away.)
(Somewhere on this island there are sea views.)
[message from Emi] おつかれ！部屋、どう？  /  Good work today! How's the room?
[free talk with Emi: Reply to Emi. The room, your day, anything.] fallback:
  CHOICE (chat): Reply to Emi.
    1) You: かべ、近い。  /  "The wall's close."
      [message from Emi] あはは。新人の部屋だね、それ。  /  Ha ha. That's the new-hire room, then.
    2) You: いい部屋だよ。  /  "It's a nice room."
      [message from Emi] ほんとに？　やさしいね。  /  Really? That's kind of you.
    3) You: 今日、大変だった。  /  "Today was a lot."
      [message from Emi] だよね。初日だもん。  /  I bet. It's your first day.
    4) You: 黒田さん、こわかった。  /  "Kuroda was scary."
      IF gotDocs:
        [message from Emi] でしょ。でも、今日は勝ったね。  /  Right? But you won today.
      ELSE:
        [message from Emi] でしょ。私も、ちょっとこわい。  /  Right? She scares me a bit too.
[message from Emi] ゆっくり寝てね。また明日。  /  Get some sleep. See you tomorrow.
IF reiMagic:
  [message from Rei] 今日の、あれ。何？  /  That thing today. What was it?
  (You read it three times. You don't answer.)
(You find the box with the sheets, make the bed, and lie down facing the wall.)
[end of day summary]
