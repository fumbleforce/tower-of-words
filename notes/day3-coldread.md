# Day 3: cold read

Claude's cold read of Codex's day-3 story (X-0546): [game3d/story/day3/](../game3d/story/day3/README.md), the first swimming session in [clubs.js](../game3d/story/clubs.js) and T-0003/T-0004 in [tickets.js](../game3d/story/tickets.js). Read as a first-time player who has finished days 1 and 2, every branch followed. Checked against the revised [outline](days3-5-outline.md) and its [cold read](days3-5-coldread.md), [cast.md](../docs/game/cast.md) (plots and milestones), [progression.md](../docs/game/progression.md) (Jørgen's decisions), [setting.md](../docs/game/setting.md), [VOICE.md](../game3d/story/VOICE.md) and GUIDE (Writing, Learning rules, no text on timers). `node game3d/story/day3/check.mjs` passes (184 nodes).

The day works. Mio's text sets up the weekend, the board is the one way into clubs, nothing is lost by skipping anything, each ticket pays once (¥5,000 / ¥1,000 / ¥1,500 as outlined), the clubs have no minigame, and no text is on a timer. The outline cold read's blockers are fixed: the doors only close once the control is clear, and the room chair moves the clock. The swim is the best thing in the day. Emi's "I'd forgotten how quiet it is when your ears are under" and Kuro's "No floor number tonight?" are the kind of line Jørgen asked for. Most optional looks are small and specific (the window, the toast, the curry bread, the soup mug note).

Two things block: the player is told to find "Ishibashi", a name nobody has said, and the printer lesson has a learned command do nothing at a machine. The rest are smaller problems. Lines are written to explain the staging or the rules, a scene doesn't follow on from the player's choice, a line ignores what the player has already done, and a few bits of Japanese and naming contradict the docs.

Counts: 2 blocking, 19 should-fix (3 to 19, plus 33 and 34 under Language), 13 nice-to-have.

## Blocking

1. **Nobody has said the name Ishibashi.** dorms.js:18 (`ishibashi will sign it off`), train.js:10 (goal "Ask Ishibashi to witness the final door check."), train.js:21 ("I'll ask Ishibashi in the morning."), tickets.js T-0003 `from`. Days 1 and 2 never use his name: his name plate is "Guard" and the People panel says "The guard" (cast.md, Names on screen). A player reading the goal line doesn't know who to ask. Fix: have Mio say "the guard" (`the guard will sign it off`), and use "the guard" in the goal and Eric's line. If you want the name on day 3, let him give it once, the way his cast entry's step 1 does it ("introduces himself when Eric asks his name"), for example after the sign-off, and only use it after that.

2. **A learned command does nothing at the printer.** gym.js:69-73, then the "Press Print" choice at gym.js:63-64. `dashite` is a command in lang.js (`cmd: true`). On day 1 every command Eric typed made a machine obey: `matte` held the doors, `akete` opened the gate (train.js:366, gate.js:222). Here he types 出して at an old printer, nothing happens, and then he presses Print. That breaks the kotodama rule (setting.md: the old machines answer when Eric speaks) and what the player has learned. Fix, pick one: (a) the typed attempt is the print, with the shimmer and hum, and the attendant credits the reset ("あ、出ました"), the same cover as the `ugoite` branch's "Which button did you press?"; or (b) the attendant uses the word on the printer herself, the way Mori says 動いて to the copier, and Eric types it after the sheet is already in the tray, so there's nothing left for it to do. (b) keeps the outline's "no magic demonstration" and also gives her a reason to say the word (see 15).

## Should fix

3. **The station sign-off takes two taps to start.** gate.js:22 and 28-30, then train.js:9-10 and 80. The guard says "Come this way, please" and the trip runs. On the platform a goal appears telling the player to ask the guard for the check, so they have to tap the man who just brought them. Fix: when the trip comes from `d3_offer_signoff`, arriving goes straight into `d3_signoff` (a flag such as `d3_signoff_walk`, read in the train's `d3_arrive`).

4. **"Look at the monitor." comes from nowhere.** gate.js:23. T-0003 is only described in the PC app, which is optional. A player who skipped the PC taps the guard and gets a menu item about a monitor nobody has mentioned. Fix: one setup beat before the menu while T-0003 is unread, e.g. the guard turns the monitor towards Eric to check his card, the screen goes black, and he turns it back with a small sigh. Then the choice makes sense.

5. **The guard talks about checks when none are waiting.** gate.js:15 and 19. At lunch he says "We can do the check another morning" and in the afternoon "Please come in the morning for the checks", even after T-0002 and T-0003 are both done. Fix: branch on what's open. With nothing open, a plain greeting (こんにちは at lunch, or just the break line without the check). Related: with both done in the morning, the menu has one option ("Just saying good morning."); skip the menu and play the greeting.

6. **The guard drops his running joke about the cat, and the line belongs to a later milestone.** gate.js:68, "タマは、もう食べました。" (Tama has already eaten.) On days 1 and 2 he always says 猫はいません. Here he names her and admits feeding her, flatly. Cast.md puts "For once he directly names what the bowl is for" at his step 4. Fix: keep the joke and give it a small turn, e.g. "猫はいません。……もう食べましたから。" (There's no cat. ...She's already eaten.) That's funny, in character, and doesn't use up step 4.

7. **The sign-off is a procedure with no person in it.** train.js:24-44. The guard reads out what is happening ("All the equipment is clear. I'll close the doors now.") and Eric says nothing through the whole scene. GUIDE: "Simple actions require simple scenes, but that is no excuse for simple writing", and scenes must want something. The cold read suggested a beat that belongs to the guard (item 15 there). Fix: keep the steps and give it one human detail. For example, he has written the time of the check on the form before it runs and corrects it by a minute, or Tama watches from the bench and he says the platform is clear "of everyone". Give Eric one short line too (in the voice sheet's "The copier's fixed." style).

8. **Aoi assumes Eric is coming to tennis.** plaza.js:50, "日曜日に、コートで。" (See you at the courts on Sunday.) It plays whether or not he took a tennis slip. Fix: branch on `club_tennis`. Without it, something about her own Sunday ("日曜日、がんばります。").

9. **Emi asks a member to join.** gym.js:91, "Take a slip at the plaza if you fancy it." It plays after he has joined swimming. Fix: branch on `club_swimming` ("See you at the pool tonight, then.").

10. **Kuro calls Emi 恵美さん.** clubs.js:111. Emi is British. Her nameplate on B2 is エミ / EMI (places.md, Emi's office). Fix: エミさん.

11. **Mori says こんにちは in the morning.** shotengai.js:19. On Saturday Mori is only at the shop street in the morning (outline, Where everyone is). The player learned おはよう on day 1, so this greeting teaches the wrong time. Fix: `{ohayo}ございます` (or おはようございます), which also reuses a learned word.

12. **Kuro, Aoi and Rei have name plates before they give their names, and Kuro is spoken to as if met.** shared.js:6 sets Kuro's plate to "Kuro" for every day-3 line, but on day 1 she never gave her name ("We didn't say names", clubs.js:96). So her lunch line and pool line show "Kuro" before her introduction. shotengai.js:31 ("I'm away from the reception desk today") and pool.js:19 ("Next week we'll be in the gym") also assume Eric knows her. Rei (sports.js:12, shotengai.js:32) and Aoi (plaza.js:20-46) are shown by name before they say it. Fix: keep "Receptionist" until `d3_kuro_intro`, and branch her two incidental lines on `kuro_reception_seen` / `d3_kuro_intro`. Give Rei a descriptive plate (for example "Tennis player") until day 4. For Aoi, use "Woman from the train" until `d3_aoi_intro`, and update cast.md's Names on screen to match.

13. **Emi's handover lines don't say who she's talking to.** clubs.js:124 ("Could you take these for me? I can't get in with all this."), 139 ("Could you hold these at the table, please?"), 150 ("Could you leave the list on the table?"). The README says these go to the attendant, but each comes right after Eric's line, so it reads as a request to Eric. On the swim branch Eric is already in the water. Fix: name him or frame him first ("Sorry, could you take these?" with `cam` on the attendant), or let him answer with one word (はい、どうぞ).

14. **Choosing "Swim with Kuro" changes nothing about who you swim with.** clubs.js:114-125 then 143-151. After the player picks it, Kuro says "Slow is fine", and from then on the length is Emi and Kuro: Kuro asks Emi for another length, and Eric is silent in the water. The choice isn't followed up. Fix: one beat on that branch, before or after the first length, with Kuro beside Eric (e.g. she waits at the wall for him: "ゆっくりでいいですよ" or a word about his pace), then her invitation to Emi.

15. **The `dashite` lesson has no reason to happen and sounds like a lesson.** gym.js:70, "予約表を出して。紙に、という意味です。" (Print the booking sheet out. Onto paper, I mean.) A polite attendant suddenly uses a casual request on a contractor, then explains what the word means. Nobody in the scene needs a word taught. It also stacks two unknowns (予約表 and 出して) in one line. Also, lang.js:13 glosses `dashite` as "give it out" while the scene says "print it out", so the Words panel will disagree with the lesson. Fix: as in 2(b), she says 出して to the printer out of habit and explains the habit, not the word ("いつも言っちゃうんです", I always say it to it). Align the gloss with the scene's meaning, or make the en line "Put it out (print it)".

16. **The pool attendant's line answers a question nobody asked.** clubs.js:112, "I'm only putting the unused things away. This lane stays open until you've finished." It's there to tell the player there's no countdown, so it reads as a rule being stated. Fix: give it a cue. Emi glances at the floats going away ("Are they closing up?"), then he answers. In the winter scene, Kuro's "The pool is closed now. We meet here on Saturdays." (clubs.js:183) repeats what Emi has just said. Cut it, or give Kuro something of her own.

17. **The sit-afterwards beats are Emi's and Kuro's step-2 milestone moments.** clubs.js:162-164 and 184, 193. Emi asks him to sit beside her while someone else explains the plan and puts her work bag under the bench (README). Kuro asks which seat he wants and keeps her own by the window. These are their step-2 moments in cast.md, played at the first meeting. Cast.md says a day-3 club visit "cannot jump a step", and the same moment will come round again when step 2 is reached. Fix: either change the day-3 versions (another small thing each notices), or say in cast.md that the first club visit is where step 2's moment is shown and the later step-2 scene doesn't repeat it.

18. **The posters goal isn't told by anyone on the main branch.** dorms.js:16-19 and shared.js:71. On the usual path (report submitted) Mio's text is all about the station, then the goal line says "Read the club posters in the fountain plaza." Only the dead-ish else branch mentions the posters. GUIDE: the next goal is told through people. Fix: add Mio's poster line to both branches ("also club posters are up by the fountain" as a third text, or fold it into the second).

19. **The goggles' setup and payoff don't match.** pool.js:31-36. The narration sets up the name: "Only the last stroke is left." Then the member recognises them by the leak ("This side always lets water in."), which she can't see by looking. Fix: pay off the stroke. She recognises the end of her own name ("あ、私の。名前の最後が残ってる"), then adds the leak as the joke.

## Nice to have

20. **The chair's back-out wording.** dorms.js:44, "Keep the rest of this period free." doesn't sound like Eric or like a menu. Fix: "Not yet." or "Get up."

21. **The bed's hint is vague.** dorms.js:54, "I could sit down for a bit first." Fix: say why and where: "Too early to sleep. I could sit at the desk for a while."

22. **The boxes line doesn't land.** dorms.js:60, "I packed the towels round the mugs. That explains the kitchen box." It isn't clear what it explains. It could set up the swim instead: "The towels are in the kitchen box, round the mugs. Good to know for tonight."

23. **Aoi's scene can lose a click or two.** plaza.js:20-47 is about 12 lines before the board opens. Her "Take a slip from the bottom to join" repeats what the board's own slip teaches. "私は靴を買ってきます" doesn't say tennis shoes, so the link to Sunday shows up later. Fix: merge her first two lines, cut the slip instruction, say テニスの靴.

24. **Emi's keys.** gym.js:90 has her looking for the pool keys in the afternoon. At the pool, clubs.js:107, "Someone gave me the keys." Fix: "I went for the keys and came back with everyone's bags."

25. **Mori at the gym could be waiting for the frozen terminal.** gym.js:85. He has come to check a booking at the desk whose terminal is frozen. One line ("まだ動かないそうです") ties him to the ticket while it's open and gives the attendant's request a witness.

26. **"Join them in the water."** clubs.js:132. At that point only Kuro is in. Fix: "Get in the water."

27. **"Quite a few people."** shotengai.js:34. The party was four of them. Fix: "Four of us fitted along here last night."

28. **Tama in the dorm court.** dorm_court.js:12-14. Eric speaks before the camera finds the cat, then the camera cuts away at once. Fix: frame Tama, then the line, then `back`.

29. **Kuro's language with Eric.** At the pool she speaks English to Eric and Japanese to Emi, which works. In the winter scene and incidental lines she speaks Japanese to him (clubs.js:193, 208, pool.js:19, shotengai.js:31). Pick one rule (short English to Eric, as on day 1) and keep it.

30. **The court display line reads written.** sports.js:16, "Keeping track while playing is another matter." Fix: something looser: "I know the numbers. Counting them while running is the problem."

31. **The date check is unmotivated.** gym.js:79. The attendant checks "today's date", but nothing set up a wrong date. Either cut the date part or have the frozen screen show yesterday's sheet first.

32. **The map's word.** plaza.js:53. Japanese maps say 現在地 for "you are here". A hand-written ここ sticker or arrow on the board's map would make the word believable.

## Per branch

- Morning, report submitted (both sensor histories): flows; the guard's sensor line and Mio's two closing texts follow the right history, and neither says she was there. Fix 1, 3 and 7.
- Report never submitted: the else text and train.js:18 are fine but probably unreachable (day 2 needs the report before B2). No problem.
- Sign-off deferred: "Do the check another morning" returns cleanly, with no penalty.
- Monitor: fix and defer both flow; the second turn is staged; pay and bond are guarded once. Fix 4.
- Booking, reset or `ugoite`: both flow into the same printer step. The `ugoite` branch's "Which button did you press?" / "Let's check the printout first." is good. Printer with `dashite` known or unknown: see 2 and 15.
- Aoi at the board, by board tap or by talking to her: both flow. "I caught the bit about the basement" is a stretch for a player who heard her day-1 call untranslated, but the other choice covers it and her reply explains either way.
- Map with `koko` unknown, known, or said with the Say button: all flow.
- Swim: join, bags then swim, bags then deck, watch, and leave early: all reach the right next line with the right speaker apart from 13 and 14. Sit and goodnight both close properly. Leaving early and talking to Emi restarts from the bags, which is fine since nothing has happened yet.
- Winter first visit: flows; see 16 and 17.
- Non-member at the pool in the evening: Emi and the attendant point to the board. Kuro needs 12.
- No job, no club, Rest, Sleep: flows; the first Rest explains the clock once and lets you back out.

## Eric and Carina

No findings. Every `{mc.*}` use is `{mc.name}` in a place a name fits (Emi, Kuro's introduction, Kenji, Aoi's scene, T-0001). No line uses a pronoun or address for the player, so nothing reads wrong for a woman, and nothing on day 3 assumes anyone's orientation. The README already says the changing transition must not send Carina through a men's-only door. The barber card ("Please take off your glasses") works for both.

## Language

The ramp is right: two optional new words (`koko`, `dashite`), English meaning before the Japanese, nothing required, and Japanese-only speakers subtitled. Kanji-heavy lines (Aoi's 施設の予約担当です, the attendant's lines) are fine because the English is always there. Apart from 2, 10, 11 and 15, two lines read unnatural. Both are should-fix.

33. shotengai.js:26, Hamada's "まだ決まりません" sounds like "it won't get decided". Fix: "まだ迷ってて……" or "まだ決めてなくて".
34. shotengai.js:30, Aoi's "ここ、空いてます" means "this spot's free", not "there's room to get past". Fix the English to match ("This spot's free, if you want it"), or use "どうぞ、通ってください".
