# Day 1 draft

Revised 2026-09-25 (train opening added the same day). Same format as `transcripts/day1.md`. Design and rules are in `day1-design.md`.
Notation: `[voice -1]` spends a voice mark, `[noise +1]` adds hidden noise, `[time +N]` moves the clock N minutes, `[set flag]` sets a flag, `[sus mio +1]` adds suspicion with one person. `SPELL` blocks list what each form does. "→ retry" means the ring comes back (each try costs a mark), "→ works" means the scene moves on. Lines marked (kept) are unchanged from the old day 1, so their voice files still match.

## train (the opening; spec: train-opening-script.md, approved 2026-09-25)
New Game starts here: no name entry, level check or onboarding app. Placeholder art for the carriage, the island reveal, the doors and the platform (TODO.md lists the shots). Rei is labelled "Woman" until she says her name. Tap help: a kanji word once for the reading above, again for the meaning below; kana words go straight to the meaning. Cues: "Tap a word for help." on ありがとう, "Tap again for the meaning." after the first tap on 初日 (cue-prompted taps don't count as evidence). "Supported" lines replace later ones once the player has needed help on three different lines.
[scene: carriage, placeholder art]
[clock 08:40]
[set reiNamed = false]
[prop on screen: seat]
[sound: keys]
[sound: clack]
(A monorail carriage. The woman beside the empty seat is typing. Her coffee cup tips toward her laptop.)
Woman (voice only): あ。  /  "Ah."
CHOICE: The cup is tipping.
  1) [Catch the cup]
    [prop on screen: seat-caught]
    (You steady the cup. She catches her folder with her free hand.)
  2) [Warn her]
    You: あ、コーヒー。  /  "Ah, coffee!"
    [prop on screen: seat-saved]
    (She catches the cup and shuts the laptop with her other hand.)
[prop closes]
[show rei cold]
(She checks the lid, then looks at you properly.)
Woman [cold]: ありがとう。  /  "Thanks."  [tap cue: "Tap a word for help."]
(She puts the laptop away, stacks the folder on her lap and pats the seat she just cleared.)
Woman [cold]: どうぞ。  /  "Go ahead."
CHOICE: 
  1) [Sit]
    (You sit and put your backpack between your feet. Sea and sky slide past the window.)
[prop on screen: badge]
[clock 08:43]
(You take your new company badge out of its sleeve. The protective film is still on it.)
(She glances at the badge, then at you.)
Woman [cold]: 初日？  /  "First day?"  [tap cue: "Tap again for the meaning." after the first tap]
CHOICE: 
  1) You: うん。  /  "Yeah."
  2) [Nod]
    (You nod.)
(She gives a small nod back.)
[prop closes]
CHOICE: Ask her something, or let it be.
  1) You: そっちは？  /  "And you?"
    (She presses down a worn corner of her own badge sleeve with her thumb.)
    Woman [cold]: 三年目。  /  "Third year."
  2) [Say nothing]
[everyone leaves the frame]
[scene: reveal, placeholder art]
(Outside, the line runs across the water to an island of towers.)
Woman (voice only): 全部、会社。  /  "All of it's the company."
[scene: carriage, placeholder art]
[show rei cold]
CHOICE: The island is getting close.
  1) You: 全部？  /  "All of it?"
    Woman [cold]: うん。  /  "Yeah."
  2) You: すごいね。  /  "That's impressive."  (supported: 大きいね。 / "It's big.", only if 大きい is known)
    IF the player needed help on 3+ lines (supported version):
      Woman [cold]: うん。  /  "Yeah."
    ELSE:
      Woman [cold]: 最初はね。  /  "At first."
  3) [Keep looking]
    [everyone leaves the frame]
    [scene: reveal, placeholder art]
    (She leaves you to it. The towers get closer.)
    [scene: carriage, placeholder art]
    [show rei cold]
[prop on screen: dorm]
(You put the badge back in your backpack. Another card is in there with it.)
(She notices the card.)
Woman [cold]: 寮？  /  "The dorm?"
CHOICE: 
  1) You: うん。  /  "Yeah."
  2) [Nod]
[prop closes]
[your phone: housing]
(You open the housing app on your phone to show her. It has a delivery photo of your boxes at door 203.)
Woman [cold]: 今日から？  /  "Starting today?"
You: うん。  /  "Yeah."
[phone closes]
(She shifts along the bench to give you a little more room.)
[clock 08:46]
[sound: buzz]
[your phone: voicemail (tap Play)]
Emi (voice message): おはよう！  /  "Morning!"
Emi (voice message): もうすぐ？  /  "Nearly here?"
CHOICE: 
  1) You (voice reply): もうすぐ。  /  "Nearly there."
    [your phone: recording]
    Emi (voice message): わかった。  /  "Got it."
  2) You (voice reply): ちょっと、緊張してる。  /  "I'm a little nervous."
    [your phone: recording]
    Emi (voice message): 大丈夫。  /  "You'll be fine."
IF the player needed help on 3+ lines (supported version):
  Emi (voice message): 待ってるね。  /  "I'll be waiting."
ELSE:
  Emi (voice message): 会社で待ってるね。  /  "I'll be waiting at the office."
[phone closes]
(She recognised the voice. She looks from your phone to your badge.)
Woman [cold]: 上司、エミ？  /  "Emi's your boss?"
CHOICE: 
  1) You: うん。  /  "Yeah."
  2) [Nod]
(She looks as if she might say something, then takes a sip of coffee instead.)
[prop on screen: folder]
(She opens her folder again: a short table of figures.)
CHOICE: Talk, or let her work?
  1) You: エミ、どんな人？  /  "What's Emi like?"
    [set askedAboutEmi]
    Woman [cold]: 優しいよ。  /  "She's nice."
    IF the player needed help on 3+ lines (supported version):
      (She puts one sheet back into the folder.)
      Woman [cold]: 仕事、多いよ。  /  "There's a lot of work."
    ELSE:
      (She puts one sheet back into the folder.)
      Woman [cold]: 頼みごと、多いけど。  /  "Asks a lot of favours, though."
  2) [Let her work]
    (A few quiet seconds. She crosses out one line, checks another, and closes the folder.)
[prop closes]
[sound: buzz]
[prop on screen: caller]
(Her phone lights up. She sees the name and silences it.)
[set sawReiSilenceEmi]
[prop closes]
IF askedAboutEmi:
  (She catches you looking.)
  Woman [cold]: あとで。  /  "Later."
ELSE:
  (She puts the phone away.)
[clock 08:49]
[sound: chime]
(The train slows into a station and stops.)
Announcement: 天川シティ、天川シティです。  /  "Amakawa City. Amakawa City."
[sound: door]
[everyone leaves the frame]
[scene: doors, placeholder art]
(The doors open. People further along the carriage stand up. You pick up your backpack.)
[show rei cold]
[prop on screen: reibadge]
(She tucks the folder under her arm. Her badge turns face out as she stands.)
[set reiNamed]
(She points at herself with the hand holding the cup.)
Rei [cold]: レイ。営業。  /  "Rei. Sales."
CHOICE: 
  1) You: よろしく。  /  "Nice to meet you."
  2) [Smile and nod]
[prop closes]
(She nods back.)
Rei [cold]: エミによろしく。  /  "Say hi to Emi."
(At the open door she steps aside to let you out first.)
Rei [cold]: どうぞ。  /  "Go ahead."
CHOICE: 
  1) [Step onto the platform]
[everyone leaves the frame]
[scene: platform, placeholder art]
(You step out first. Rei follows, heads for the stairs, and looks back once to check you're coming. Then she's gone into the crowd.)
[sound: buzz]
[your phone: photo from Emi: 入口は、ここ。  /  "Here's the entrance."  → Keep this photo]
[phone closes]
[autosave]
→ gate

## gate
[scene: gate]
[clock 08:52]
(Down the station steps and across a square, into a tall glass lobby.)
[Emi's photo shown; tap the matching entrance: Find the entrance from Emi's photo. Tap it.]
(The same gates as in Emi's photo. Nobody else around.)
(You hold your new badge to a reader. It beeps. The gate doesn't open.)
(A man's voice, from a speaker above the gates. Somewhere, a camera is pointed at you.)
Ishibashi (voice only): ちょっと、止まって。  /  "Hold it. Stop."
Ishibashi (voice only): 見ない顔だな。  /  "Don't know your face."
Ishibashi (voice only): IDカード、カメラに見せて。  /  "Show your ID card to the camera."
CHOICE: What do you do?
  1) You: IDをカメラに見せる  /  Show your ID to the camera
  2) You: 笑う  /  Smile at the camera  [back to the choice]
    Ishibashi (voice only): ……いや、ID。  /  "...No. ID."
  3) You: （何もしない）  /  Do nothing  [back to the choice]
    Ishibashi (voice only): ……ID。  /  "...ID."
(You hold your badge up to the camera.)
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
(The light turns green and the gate lets you through.)
[task: 企画室7]
→ elevator_b2

## elevator_b2
(Past the gates, a lift. Your team is somewhere in this building.)
[floor panel over the lift backdrop] target: 地下二階 企画室7  (panel hint: "Your badge says 企画室7. Press the round button next to your floor.")
Wrong floors (each costs a couple of minutes, nothing else):
  (day-1 labels, one new word each at most: 屋上 · 五階 役員室 · 三階 営業部 · 二階 会議室 · 一階 ロビー · 地下一階 コピー室 · 地下二階 企画室7)
  屋上: (Wind, and rows of tomato plants. Wrong floor.)
  五階 役員室: (Thick carpet and silent corridors. Definitely the wrong floor.)
  三階 営業部: (Rows of desks, phones ringing, people in sharp suits. Wrong floor.)
  二階 会議室: (Meeting rooms, every door shut. Wrong floor.)
  一階 ロビー: (The lobby again.)
  地下一階 コピー室: (Boxes, shelves, a flickering light, and a copier with a handwritten sign taped to it. Wrong floor.)
→ office

## office
[scene: office] [music: office]
(Basement level two. Pipes along the ceiling, cup noodles on the desks, no windows.)
Mio (bored, labelled "Woman with headphones" until she says her name): ……誰？  /  "...Who are you?" (kept)
CHOICE: Your reply
  1) 新人だよ。よろしく。  /  "The new guy. Nice to meet you." (casual)  [mio +1]
    Mio: ふーん。……ミオ。  /  "Hmm. ...Mio." 
  2) 今日からここで働きます。よろしくお願いします。  /  "I start here today. Nice to meet you." (polite)
    Mio: かたいね。……ミオ。  /  "So stiff. ...Mio." 
  3) そっちこそ誰？  /  "Who are you, then?"  [mio +1]
    Mio: ……ふふ。ミオ。  /  "...Heh. Mio."
Mio: 今、ゲーム中。  /  "In the middle of a game."
(She tilts her phone away from you.)
(Someone gets up from the desk by the whiteboard.)
IF you reach the office after 09:00:
  Emi (teasing): 遅刻だよ、新人くん。  /  "You're late, new guy."
ELSE:
  Emi (smile): あ、新人くん？  /  "Oh, the new guy?"
Emi (smile): 私はエミ。ここのリーダー。  /  "I'm Emi. The leader here."
Emi (teasing): ……いちおうね。  /  "...Technically." 
CHOICE: Your reply
  1) よろしくお願いします。  /  "Nice to meet you." (polite)
    Emi: まじめだね。  /  "So serious." (kept)
  2) うん、よろしく。  /  "Yeah, nice to meet you." (casual)  [emi +1]
    Emi: うん、それでいいよ。  /  "Yeah, that's fine." (kept)
  3) ……いちおう？  /  "...Technically?"  [emi +1]
    Emi (teasing): そう、いちおう。  /  "Yep. Technically." (kept)
(Emi shows you your desk. The computer wants a password nobody has given you.)
Emi: さっそく、お願い。  /  "Straight to it: a favour." 
(She hands you a proposal: four pages, stapled.)
Emi: これ、コピーして。十部。  /  "Copy this for me. Ten sets."
Emi: 十一時の会議で、使う。  /  "It's for the eleven o'clock meeting."
Emi: コピー室は、地下一階。  /  "The copy room's on basement level one."
Emi (teasing): コピー機、ちょっと古いよ。  /  "The copier's a little old."
Mio (not looking up): ちょっとじゃない。  /  "Not a little."
Mio: こわれてる。  /  "It's broken."
Emi (teasing): ……かなり、古いね。  /  "...Very old, then."
Mio: ……また、つながらない。  /  "...Lost the connection again."
(Mio gets up, holds her phone at the ceiling, and shuffles out into the corridor in her slippers.)
→ elevator_b1

## elevator_b1
[floor panel] target: 地下一階 コピー室  (hint: "Emi said: コピー室は、地下一階。")
  地下二階: (The office again. The copy room is somewhere else.)
  others: as above
→ copyroom

## copyroom
[scene: copyroom]
(Basement level one. Shelves of toner, a desk with a stapler, and a copier older than you. You shut the door behind you.)
[sign taped to the copier, a printout] こわれています。  /  "Out of order."
CHOICE: The copier.
  1) ボタンを押す  /  Press the start button
    (The screen flickers on long enough to show one word, 紙づまり, and goes dark.)
  2) パネルを開ける  /  Open the side panel
    (A page is caught deep in the rollers. You pull. It tears, and most of it stays in there.)
  3) たたく  /  Hit it
    (One orange light blinks, thinks about it, and goes out.)
(There's one more thing you could try. You check the door. Still shut.)
(Ever since you started learning Japanese, when you ask for something and truly mean it, it happens. You never found out why.)
(There's a word for it: 言霊, kotodama. Nobody at Amakawa knows you can do it, and you'd like to keep it that way.)
(Five times a day, more or less. After that your voice just gives out.)
[the voice marks appear next to the clock: ◆◆◆◆◆]
SPELL: Get the stuck page out.  (verb 出す; hint: "Ask it, the way you'd ask a person." After one misfire: "The way Emi asked you." After two: the て tile is marked. "Stop" is offered only after two casts.)
  出して:  → works
    (The torn page slides out by itself and drops into your hand. The copier sighs, and its screen lights up green.)
  出せ:  → works  [noise +1] [time +3]
    (It spits out the page. Then the whole paper tray. A hundred sheets hit the door like startled pigeons.)
    (The screen lights up green. You spend a few minutes picking up paper.)
  出す:  → retry
    (The copier hums, as if agreeing that paper does come out of copiers. Nothing comes out.)
  出した:  → retry
    (It prints the last thing it ever printed: a sheet that says こわれています. So that's where the sign came from. Then it jams again.)
  出て (typed only):  → retry
    (The torn page wriggles halfway out, the way you'd step out of a door, and stops there.)
  any other ending:  → retry
    (The words come out wrong. Nothing happens.)
  stop (after two casts), or out of voice:  → continues anyway  [time +20]
    (You fish the rest of the page out with a ruler, one strip at a time. Twenty minutes later the screen lights up green.)

### count
[the copier's screen] 部数？  (keypad: 10 / 11 / 20 / 100; the Japanese is Emi's 十部, heard once, in the backlog)
  10 [set copies10] · 11 [set copies11] · 20 [set copies20] · 100 [set copies100]
(You press start. One page every ten seconds.)
IF copies100: (Four hundred pages. That's more than an hour.)  (waiting: "After ten sets you hit stop. Ten is plenty." and the count becomes ten)
ELSE IF copies20: (Eighty pages. About fourteen minutes.)
ELSE: (About forty pages. Seven minutes, give or take.)
CHOICE: It's slow.
  1) （待つ）  /  Wait
    (You wait. The light flickers. Somewhere a pipe knocks.)  [time +7, +14 for 20]
    IF copies100: (After ten sets you hit stop. Ten is plenty.)  [set copies10, unset copies100]
  2) （言霊を使う）  /  Use kotodama  (greyed out with no voice left)
    SPELL: Make it go faster.  (verb 急ぐ)
      急いで:  → works
        IF copies100: (Four hundred pages in a minute. The tray overflows and paper slides across the floor.)  [noise +1]
        ELSE: (The pages come out in a blur. Thirty seconds, and every sheet is neat.)
      急げ:  → works  [noise +1] [set crooked]
        (It goes so fast the whole machine shakes. Ten seconds, a smell of hot toner, and half the pages come out crooked.)
      急ぐ:  → retry
        (It agrees that hurrying is good. It doesn't hurry.)
      急いだ:  → retry
        (It repeats the last thing it did: prints the last page again, once, at the same crawl.)
      any other ending:  → retry
        (The words come out wrong. Nothing happens.)
      give up, or out of voice:  → you wait instead  [time as option 1]
        (You wait. The light flickers. Somewhere a pipe knocks.)

### sort
(The old copier doesn't sort. Ten of page one, ten of page two, and so on, in one loose pile.)  (the numbers follow the count)
CHOICE: Sorting.
  1) （手で分ける）  /  Sort them by hand. About ten minutes.
    (Page one, two, three, four. Again. Again.)  [time +10, +20 for 20, +50 for 100 (100 only after the fast copy)]
  2) （言霊を使う）  /  Use kotodama  (greyed out with no voice left)
    SPELL: Put the pages in order.  (verb 並ぶ)
      並んで:  → works  [time +2]
        (The pages lift off the tray and line up along the desk, one, two, three, four, one, two, three, four, like people queueing for a train. You only have to pick them up.)
      並べ:  → works  [noise +1]
        (The pages snap into line so hard the desk rattles and the stapler falls off.)
      並ぶ:  → retry
        (They agree that lining up is proper. They stay a pile.)
      並んだ:  → retry
        (They repeat their last move: they slide off the tray onto the floor.)
      並べて (typed only):  → retry
        (The pages look around for something to arrange. The toner boxes on the shelf shuffle into a neat row.)
      any other ending:  → retry
        (The words come out wrong. Nothing happens.)
      give up, or out of voice:  → by hand  [time as option 1]
        (Page one, two, three, four. Again. Again.)

### footsteps
(Footsteps in the corridor. Slow ones, in slippers.)
CHOICE: Someone's coming.
  1) （じっとする）  /  Keep still
    IF noise >= 1:
      (The door opens.)
      Mio: ……うるさい。  /  "...Noisy."
      (She looks at the copier, humming and green. Then at you.)
      Mio: それ、こわれてなかった？  /  "Wasn't that thing broken?"
      CHOICE: Your reply
        1) たたいた。  /  "I hit it."
          Mio: ……エミさんも、たたいてた。  /  "...Emi used to hit it too." (It never worked for her.)
        2) なおした。  /  "I fixed it."
          Mio: ……へえ。三か月、こわれてたよ。  /  "...Huh. It was broken for three months."
        3) （何も言わない）  /  Say nothing
          (She waits. You wait. She shrugs.)
      Mio: ……ま、いいけど。  /  "...Whatever."
      (She shuffles off down the corridor, phone held up at the ceiling.)  [set mioSaw] [sus mio +1]
    ELSE:
      (The footsteps stop right outside the door. A sigh.)
      Mio (through the door): ……ここも、つながらない。  /  "...No signal here either."
      (The slippers shuffle away.)
  2) （ドアを開ける）  /  Open the door first
    (Mio is in the corridor, holding her phone above her head like a torch.)
    Mio: ……何。  /  "...What."
    IF noise >= 1:
      Mio: 中、うるさいね。  /  "Noisy in there."  [set mioHeard]
    Mio: ここも、つながらない。  /  "No signal here either."
    Mio: イベント、十二時まで。  /  "The event ends at twelve."
    (She shuffles on down the corridor.)
IF the stapler fell (並べ): (You pick the stapler up off the floor and staple the sets by hand. It works on the first try.)
ELSE: (You staple the sets by hand. The stapler, at least, has never been broken.)
→ elevator_back

## elevator_back
[floor panel] target: 地下二階 企画室7  (地下一階: "You're already here."; hint: "Back to your office: 企画室7.")
→ office2

## office2
[scene: office]
(Mio is back at her desk, phone face down.)
IF back within 12 minutes of entering the copy room:  [set fastBack]
  Emi (surprised): ……もう？  /  "...Already?"
ELSE:
  Emi (surprised): おかえり。……え、できた？  /  "Welcome back. ...Wait, you actually did it?"
(She flips through the stack.)
first match:
  IF crooked:
    Emi: ……ちょっと、まがってない？  /  "...Aren't these a bit crooked?"
    Emi (teasing): ……セーフ。  /  "...Close enough."
  IF copies100:
    Emi (surprised): 百部？　だれが読むの。  /  "A hundred? Who's going to read them all?"
  IF copies20:
    Emi: 二十部？　……多いほうが、いいか。  /  "Twenty? ...Better too many than too few."
  IF copies11:
    Emi (teasing): 十一部？　一つ、多いね。  /  "Eleven? One too many."
  ELSE IF fastBack:
    Emi (surprised): うそ。あのコピー機で？  /  "No way. With that copier?"
    IF no noise and at most 3 casts so far:
      Emi (teasing): ……新人くん、何者？  /  "...New guy, what are you?"  [set cleanRun]
  ELSE:
    Emi (smile): ありがとう。助かる。  /  "Thanks. That helps."
IF mioSaw:
  (Mio looks at you over her screen, one second longer than she needs to.)
ELSE IF mioHeard:
  Mio: ……コピー室、うるさかったね。  /  "...Noisy in the copy room, wasn't it."
Emi: じゃあ、もう一つ、いい？  /  "OK then. One more thing?"
Emi: 三階の営業部に行って。  /  "Go up to Sales, third floor."
Emi: 黒田さんの数字が、ほしい。  /  "I need Kuroda's numbers."
Emi (worried): 二回、聞いた。  /  "I've asked her twice." (No reply, clearly.)
Emi: 会議の前に、ね。  /  "Before the meeting, OK?"
Mio: 黒田レイ？　……がんばって。  /  "Rei Kuroda? ...Good luck."
Mio: あの人、こわいよ。  /  "She's scary." 
Emi (teasing): こわくないよ。……ちょっとしか。  /  "She's not scary. ...Only a little."
(Kuroda Rei. The woman from the train.)
→ elevator_3f

## elevator_3f
[floor panel] target: 三階 営業部  (hint: "Emi said: 三階の営業部。"; wrong floors as above; 地下二階: "The office again.")
→ sales

## sales
[scene: sales, placeholder image]
(Third floor, Sales. Phones ringing, fast keyboards, and nobody looks up.)
(At the window desk, Rei from the train is typing. The nameplate says 黒田.)
(You tell her Emi sent you.)
Rei (cold): あ、電車の。  /  "Oh. The one from the train." (she met him on the monorail)
Rei (cold): ……エミの数字ね。  /  "...Emi's numbers, right."
Rei (cold): 今、忙しい。午後に来て。  /  "I'm busy. Come back this afternoon." 
(The man at the next desk is watching you over his monitor.)
CHOICE: Rei won't look up.  (comes back after 1, 2, 5 and after any spell that didn't get the folder; options 1, 2 and 5 go away once used)
  1) お願い。今、ほしい。  /  "Please. I need them now."
    Rei (cold): 聞こえなかった？　午後。  /  "Didn't you hear me? Afternoon." (kept)
  2) 会議の前に、ほしい。  /  "I need them before the meeting."
    Rei (smirk): 知ってる。  /  "I know."
    (She doesn't look up.)  [set reiStalling]
  3) わかった。じゃあ、午後にまた来る。  /  "Fine. I'll come back this afternoon." (kept)
    [set noDocs]  → office3
  4) （言霊）　見ている人：一人  /  Use kotodama now. One person is watching.  [only while he's there]
    SPELL rei, 1 witness
  5) （待つ）  /  Wait until the man at the next desk leaves  [only while he's there]
    (Twenty minutes later he takes a call and walks off toward the elevators. Rei hasn't moved. Neither have you.)  [time +20] [set witnessGone]
    Rei (cold): ……まだいるの？  /  "...You're still here?"
  6) （言霊）　見ている人：なし  /  Use kotodama. Nobody else is watching.  [only after he left]
    SPELL rei, no witness
  (magic options are greyed out with no voice left)

SPELL rei: Get Rei to give you the numbers.  (verbs 渡す hand over, 見せる show)
  渡して:  → got it
    Rei (confused): ……え？　あ、うん。はい、これ。  /  "...Huh? Oh, sure. Here." (kept)
    (She hands you a thick folder, then stares at her own empty hand.)
    Rei (confused): ……あれ？　なんで？  /  "...Huh? Why did I...?" 
    Rei (cold): ……午後、なのに。  /  "...And I said this afternoon."
    IF witness: (The man at the next desk looks from Rei's empty hand to you, then back to his screen.)
    [set gotDocs, reiMagic] [sus rei +1] [rei +1]
  渡せ:  → got it
    Rei (confused): ……っ。  /  (a sharp breath)
    (Her hand slaps the folder down on the desk in front of you. She looks at her hand, then at you.)
    Rei (cold): ……今、私に命令した？  /  "...Did you just give me an order?"  (if she already asked this after 見せろ: 「……また？」 "...Again?")
    IF witness: (The man at the next desk has stopped typing.)
    [set gotDocs, reiMagic, reiCommanded] [sus rei +2]
  見せて:  → back to the choice
    (She opens the folder and holds it up for you. Rows of numbers. Then she snaps it shut.)
    Rei (confused): ……見た？  /  "...Did you see that?"
    (You saw rows of numbers, too fast to keep.)
    IF witness: (The man at the next desk glances over, then back at his screen.)
    [set reiShowed, reiMagic] [sus rei +1]
  見せろ:  → back to the choice
    (She shoves the open folder at your face, pages flapping, and pulls it back.)
    Rei (cold): ……今、私に命令した？  /  "...Did you just give me an order?"
    IF witness: (The man at the next desk has stopped typing.)
    [set reiCommanded, reiMagic] [sus rei +2]
  渡す:  → back to the choice
    Rei (cold): うん、渡すよ。午後に。  /  "Sure, I'll hand them over. This afternoon."
  見せる:  → back to the choice
    Rei (cold): うん、午後にね。  /  "Sure. This afternoon."
  渡した, 見せた:  → back to the choice
    (She does the last thing she was doing: she types. A little faster.)
  nonsense endings:  → back to the choice
    Rei (cold): ……何か言った？  /  "...Did you say something?" (kept)  (second time: 「……何？」 "...What?")
  any cast that moved her while the man at the next desk was there: [set salesWitness]
IF gotDocs and the folder came by magic:
  (At the elevator you look back. She's still watching you.)
→ office3

## office3
[floor panel ride down, then scene: office]
IF gotDocs:
  Emi (surprised): 黒田さんから？　……本当に？  /  "From Kuroda? ...Really?"
  Mio (suspicious): ……どうやったの？  /  "...How did you do that?" 
  CHOICE: Your secret is at stake.
    1) わからない。  /  "No idea."
      Mio (suspicious): ふーん……。  /  "Hmm..." 
    2) ひみつ。  /  "It's a secret."  [mio +1] [sus mio +1]
      Mio (smirk): ……へえ。  /  "...Huh." (kept)
    3) 黒田さん、やさしかったよ。  /  "Kuroda was nice to me."
      Mio (smirk): うそでしょ。  /  "No way." (kept)
  Emi (smile): ありがとう。じゃあ、行ってくる。  /  "Thanks. OK, I'm off."
ELSE:
  (You tell Emi what Rei said.)
  Emi (worried): 午後か……。  /  "This afternoon, huh..."
  Emi: 数字なしで、なんとかする。行ってくる。  /  "I'll manage without the numbers. I'm off."
(Emi takes the copies and goes. It's quiet: the fan, Mio's keyboard.)
IF mioSaw:
  Mio: ……さっきの、コピー室。  /  "...The copy room, earlier."
  Mio (smirk): 私のゲーム機も、見て。  /  "Take a look at my game console too."
ELSE:
  Mio: ……あのコピー機、三か月こわれてた。  /  "...That copier was broken for three months."
  Mio (bored): ……ま、いいけど。  /  "...Whatever."
(She puts her headphones back on.)
→ afternoon

## afternoon
[clock 14:00]
IF noDocs:
  (At two you go back up to Sales. Rei hands over the folder without looking up from her screen.)
(At four, IT sends you a password. It doesn't work either.)
[clock 17:30]
Mio: ……おつ。  /  "...Later." (short for おつかれ)
(Mio leaves at half past five on the dot, her game already loading.)
→ evening

## evening
[scene: office] [clock 17:50]
(Emi comes back from her meetings and drops into her chair.)
IF gotDocs:
  Emi (smile): 会議、けっこううまくいった。  /  "The meeting went pretty well."
  Emi (teasing): 黒田さん、ちょっとびっくりしてた。  /  "Kuroda looked a bit surprised."
ELSE:
  Emi (worried): 数字がなくて、ちょっと大変だった。  /  "Without the numbers it was a bit rough."
  Emi: ……次は、勝つ。  /  "...Next time, I win."
IF crooked:
  Emi (teasing): コピー、みんなにわらわれた。  /  "Everyone laughed at the copies." 
IF copies100:
  Emi (teasing): あと、のこりの九十部、どうする？  /  "Also, what do we do with the other ninety?"
Emi (smile): 今日は、もう帰っていいよ。  /  "You can go home for today."
Emi: 寮、わかる？  /  "Do you know where the dorm is?"
CHOICE: Your reply
  1) うん、203。  /  "Yeah. Room 203."
    Emi (teasing): えらい。じゃあ、おつかれ。  /  "Look at you. OK, good work today."
  2) ……たぶん。  /  "...Probably."
    Emi (smile): 駅のとなり。……電話、してね。  /  "Next to the station. ...Call me, OK?"
IF casualGuard:
  [scene: gate]
  (On your way out, the gates.)
  Ishibashi (speaker): また君か。  /  "You again."
  Ishibashi: ……ID。  /  "...ID." 
  (You hold your badge up to the camera. He takes his time.)  [time +5]
→ dorm

## dorm
[scene: dorm] [music: night] [clock 18:30]
(Dorm A, room 203. Second floor. Your card opens the door on the second try.)
(Your boxes are stacked inside, the one with the drawn mug on top. The window looks straight at a concrete wall, about two metres away.)
(Somewhere on this island there are sea views.)
[message from Emi] おつかれ！部屋、どう？  /  Good work today! How's the room?
[free typing: a chat with Emi, 2 turns, romaji turns into kana as you type. Goal shown: "Reply to Emi. The room, your day, anything." Emi (local AI) knows: the room faces a wall, how the copies went, how the numbers were got (magic, asking, none), whether Mio saw anything, how her meeting went. She never confirms magic; 言霊 or 魔法 get 「はいはい。」 Replies are one or two short casual sentences at N5 to N4. If the AI isn't running: a button to start it on this PC (desktop), or the scripted version below.]
fallback:
  CHOICE (chat): Reply to Emi.
    1) かべ、近い。  /  "The wall's close."
      [chat from Emi] あはは。新人の部屋だね、それ。  /  Ha ha. That's the new-hire room, then.
    2) いい部屋だよ。  /  "It's a nice room."
      [chat from Emi] ほんとに？　やさしいね。  /  Really? That's kind of you.
    3) 今日、大変だった。  /  "Today was a lot."
      [chat from Emi] だよね。初日だもん。  /  I bet. It's your first day.
    4) 黒田さん、こわかった。  /  "Kuroda was scary."
      IF gotDocs:
        [chat from Emi] でしょ。でも、今日は勝ったね。  /  Right? But you won today.
      ELSE:
        [chat from Emi] でしょ。私も、ちょっとこわい。  /  Right? She scares me a bit too.
[chat from Emi] ゆっくり寝てね。また明日。  /  Get some sleep. See you tomorrow.
IF reiMagic (any cast Rei felt):
  [message from Rei] 今日の、あれ。何？  /  That thing today. What was it? (kept)
  (You read it three times. You don't answer.)
(You find the box with the sheets, make the bed, and lie down facing the wall.)
[save point: end of day 1]
[end of day summary]

---

## Read-through notes (writer's pass, before the review)
- Every scene change goes through the floor panel or a narration line; the office is the only room visited more than once, and who is in it is stated each time (Mio leaves before you, is back after; Emi leaves for her meeting when you're back from Sales and is back at 17:50).
- Nothing refers to what the player hasn't seen: the slippers and 「つながらない」 are set up in the office before the footsteps; 見せる appears at the gate and on the ID screen before Rei's spell; the map shows the dorm next to the station before Emi says 駅のとなり.
- Old draft problems that no longer apply: the timed runaway (gone), the double 「動いて」 (gone with the coffee machine), the trade route and 「あれ、九部？」 (gone).
- Pacing (tools/lang/pacing.py, 2026-09-25): every line flagged for Jørgen's profile was split or simplified; only the monorail announcement (GUIDE's exact words) carries more than one new item. Report: game/notes/pacing-day1-revised.md.
- Lines marked (kept) keep their old voice files; every other line was voiced new.
