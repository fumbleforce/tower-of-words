# Cold read: day 2 story set

Claude's story-reader pass on game3d/story/day2/ as landed for X-0440 (work #193), for Codex. Read as a first-time player who has just finished day 1, on both lunch histories and both of Mio's day-1 goodbyes (`lunch_mio || mio_warm >= 2` and the cold one), then checked against GUIDE (Dialogue quality incl. "Fewest steps" and 2026-10-02, Story craft, Learning rules), docs/game/ and VOICE.md, and Jørgen's 2026-10-03 asks ("Day 2 should have more freedom to see more places than day 1 but not overwhelmingly so. New words should be introduced etc"; the room computer). The story files are unchanged.

Line numbers are per file in game3d/story/day2/.

## Verdict

The shape is right and most of the writing is in voice. The day reads in a sensible order (station, B2, food, home), the required steps are few, the food teaching is two actions, Kenji teaches and Mio gets to eat, Mori is subtitled, and the party has reasons for everyone being there (canteen food, the sea, Mori asking Mio, Emi upstairs). Emi's two report lines, her sheepish ten years, Mio's "So it isn't the thing I told them", Kenji's nouns and "That can wait until Monday" are all good.

Three things need fixing before the build: goals go stale on returns, the report choice lands on nothing on screen, and Mio is in two places on the warm history. The rest is detail and a few thin spots in the optional visits.

Counts: 3 blocking, 15 should-fix, 12 nice-to-have.

## Blocking

1. **Goals go stale on returns.** shared.js:3-11, `direction()`. After the B2 briefing (`d2_brief_done`) and before the desk sit, every other place still says "Take the station report to B2." He has already reported. service.md beat 5 says optional morning trips stay open in exactly this window, so players will see it. Same in the evening: after `d2_met_kenji` or `d2_ate`, any place outside the shop street still says "Meet Kenji by the izakaya's blue curtain", though Kenji has moved to the bench and the party has started. Codex asked for readable goals on returns; these are the two gaps the checker missed. Fix: add the two states to `direction()`: brief done → "Back to your desk on B2 when you're ready to work." (pin: the office route); met or ate, party not done → "The others are at the sea-facing bench." (pin: the shop-street route).

2. **The report choice lands on nothing.** train.js:40-62. The player picks `Report: "..."` and the scene just changes the goal. Nothing confirms it went (compare `d2_send_home`'s "> Message sent."), and on the warm history Mio, who came to watch and whose story the report either backs or contradicts, says nothing at the one moment that is about her. Then the goal says "Take the report to Emi on B2." while `d2_checked_again` says "I've sent the report." and the inbox says it "went through". Fix, without new steps: (a) one short line on submit, for example a beep and "> Report sent to B2."; (b) on `d2_mio_here`, one Mio line per report (order: something like "...Okay. Thanks, I guess." / pass: something like "So now the station thinks I don't know sensors. Great."), in her voice; (c) goal "Tell Emi what the check found." to match office.js:20. On the cold history, a one-line `miotext` after the report would let the person who asked him to cover hear the answer; optional, but it gives the choice its second reader.

3. **Mio is in two places on the warm history.** places.md:1059 ("Mori, Mio and Kenji work here before the shift ends") against train.js:17 (`!d2_brief_done && (lunch_mio || mio_warm >= 2)`) and dorms.js:22 ("i'll meet you down there"). A player who goes to B2 before the station finds Mio at her desk "restarting", then finds her waiting on the platform with "Morning." After the report she says "I'm going downstairs. See you in a minute." (train.js:66) but stays on the platform on every return until the briefing. Fix: on the warm history, Mio is not at B2 until the ticket is done, and the platform condition becomes `!d2_ticket_done && (...)`, so she leaves when she says she does (a walk out after submit). Update places.md's B2 and train "Who's there when" lines to match.

## Should-fix

4. **Mio's platform line explains what both know.** train.js:23: "Emi says she can order a sensor if you say it's broken. So, um... you should check it." He's standing at the doors because he was told to check them. VOICE.md: no one explains things both people already know. Her own concern is the better line, since a pass means she told the station something wrong (for example "If it passes, then I told them the wrong thing, so... no pressure."). That also sets up the stake for the report before the check.

5. **The day-1 cliffhanger isn't picked up unless the player chooses the optional test.** Day 1 ends on Mio's "How are you doing that?" and, warm, "I want to see how you, um... fix a sensor". On the warm history without the test, she watches him press a button and leaves; on the cold history Eric and Mio never speak about yesterday all day, including at the party. A first-time player will wait for it. One line covers it without revealing anything: Mio at the party (`d2_mio_party` or the arrival) reading `d2_order_sensor`, or on the warm history at the station after the report (finding 2b).

6. **The izakaya and onsen are "not open yet" at night.** shotengai.js:6 and east_coast.js:7 route to `shut` ("準備中 (junbi-chū): not open yet") in both periods. places.md has the izakaya's noren out and its door light lit after work, Mori says the sea is quieter "than in a restaurant" (shotengai.js:52), and an izakaya and an onsen are exactly what is open at 19:00. A curious player taps the blue curtain they were sent to and is told it hasn't opened. Fix: an evening line for the izakaya (noise inside, full, or Mori's reason) and the onsen; keep 準備中 for the morning. "Not open yet" on the karaoke and game centre at night is also odd; "closed" (閉店) or a per-period line would do.

7. **"Mori's notes" aren't set up on the `d2_limits` path.** office.js:61, "By the time you finish going through Mori's notes". Only `d2_assess` mentions Mori ("Mori can show you..."), and Mori's own notes line is optional (office.js:71). Fix: Emi mentions Mori's notes on both paths (move it into `d2_invitation`), or the narration names the work without him.

8. **Kenji talks into Emi's close-up from off screen.** office.js:51-55. The camera is on Emi (office.js:27) and Kenji's "Eric! After work. Food. Welcome food!" arrives from nowhere. GUIDE: frame the person who matters; story and screen must match. Fix: Kenji walks over (or the camera goes to him) before his first line. Mori is silent while they discuss his arrangement; a bow from his desk would make it his (nice-to-have).

9. **Mio's reason for coming is said to nobody.** shotengai.js:53. "Mori-san asked me to come. And, um... I still have all these pickles." follows Mori's answer about the sea and replies to nothing. It reads as the outline's note turned into a line. Hang it on something: Eric reacting to her being there, Kenji teasing, or as her reply to "I thought we were going inside" (she'd rather not be inside either).

10. **"Did you ever get to Norway, Mori-san?" assumes something the player doesn't know.** shotengai.js:76. On the Mio-lunch history Mori never mentioned Norway, so "ever get to" (as if he'd wanted to) comes from nowhere. Fix: "Have you ever been to Norway, Mori-san?", which is ordinary small talk from a Norwegian.

11. **お疲れさまです has two different glosses in one day.** gate.js:18 "Thanks for checking it." and shotengai.js:50 "Good to see you." Neither is what it means, and Jørgen will hear it at every after-work greeting in Japan. It already appears in day 1 (plaza.js:30, canteen worker). Use one gloss close to the meaning, for example "Good work today." / "Thanks for your work."

12. **The typing prompts don't say what the word is for.** shotengai.js:66 and :123, `'kenji: {tabetai}...'`. Day 1's prompts are crafted lines that tie the word to the moment ("Mori rolls his hands like an engine turning. Try saying it to the copier."). Here the player has just picked a rice ball and gets Kenji repeating a word. GUIDE: choices name their object. Fix: a prompt that names the food and the act ("Kenji pushes the rice balls your way. Say it as you take one." with the sandwich variant), same for the drink.

13. **"I'm all right, thanks" sends Eric back to sit.** shotengai.js:118 goes to `d2_stay`, which seats Eric at `party_seat`. He was standing talking to Kenji. Fix: end with no action, or a short Kenji line. Kenji also never has a line of his own at the party once the drink is done; every tap is a menu (nice-to-have: one line from his own evening, the game or the cats).

14. **Saying the new words to Mori after the party contradicts the leftovers.** shotengai.js:131-133. After the goodbye, 食べたい to Mori (resting with the leftovers, shotengai.js:142) gets Eric's "I'll find something to eat." Mori would offer him a rice ball. More widely, the fallbacks are Eric talking to himself while the person ignores him (shared.js:16-19); outside the party the only people left are Mori, the guard and Tama, so three short replies cover it. Tama and 食べたい / 飲みたい is the obvious joke and the guard's 猫はいません is already there.

15. **The after-party Mori moment is two lines and a camera cut.** shotengai.js:140-145. This is the day's one optional encounter and the cold read's point 5 asked for a quiet coda. As written: Mori says he's resting, Eric says he'll stop too, camera back. Nothing is staged (Eric doesn't sit or stand with him), and nothing specific happens. GUIDE 2026-10-02: simple is about steps, not quality. Keep it one beat, but give it one detail: Eric sitting on the crates beside him, Mori handing him a rice ball for Monday's lunch from the bag, or the Lillehammer photos he means to find. No task or reward needed.

16. **The new districts have nothing to find.** east_lane.js, east_coast.js and the shop street before work: every door is shut, the lookout is one narration line ("> A cold breeze comes up off the water.", east_coast.js:17, no Eric line, no view framed), and the fountain line promises a sit that doesn't happen (plaza.js:16). Jørgen asked for more places to see, and earlier (Train discoveries) "something interesting to find". Fix: one small find or line per new district, using the finds system that day 1's bakery flyer uses. The lookout is the natural place: something specific in view (the monorail on the bay, the mainland Mio's pickles come from) and one line from Eric.

17. **Jørgen's "New words should be introduced etc".** The day teaches one required phrase and one optional. That is gentle and right for the playtests' "too hard" record; I would not add a required word. But a whole day with one required phrase may read as fewer words than he asked for. Relay his line to him as he gave it, and consider one or two optional words where they already sit in the visits (the 準備中 card every player reads; a word at the lookout), learned only by typing and never needed. His call, not a fix.

18. **The shop street's exit says "To the plaza" and goes to the east lane.** shotengai.js:5, places.md shotengai Things (`plaza_lane`, "To the plaza"); TRIPS sends it to `east_lane`, and there is no trip from the shop street back to the plaza though the plaza leads in (index.js TRIPS). After the party the goal "Head home ... Your room is 203." pins a thing labelled "To the plaza". For the build: make the label match where it goes ("To the dorm street"), or add the shop street → plaza trip.

## Nice-to-have

19. **The tap on the dorm entry replaces the day's goal.** dorm_court.js:13. In the morning, tapping `dorm_entry` sets "Your room is upstairs, 203." over "Check the train doors...". Make it an Eric line, or only set the goal when `d2_party_done`.

20. **The report choice wording.** train.js:44, 'Try saying "wait" again before I submit it.' sits beside two `Report:` options and mixes action and speech. "Close the doors and try 待って (matte) again" names the object and the word.

21. **Emi's directions.** office.js:55, "You know the little street below the plaza?" The player doesn't, and nobody answers. "The covered street off the plaza, with the shops" says where; the pins do the rest.

22. **The goodbye.** shotengai.js:107-113. Kenji, who invited him, says nothing; Mio's "Don't leave the food, Kenji." reads as if Kenji should take it, and then Mori carries the leftovers. Give Kenji the last word ("Monday, game!" or similar), and make Mio's line agree with the pack-up. For the build: Mio and Kenji should be seen to leave, not vanish.

23. **"Eat and listen" leaves nothing to notice.** shotengai.js:97. The pickles move as a prop at phone size. One narration line in day 1's form ("> After a while she pushes the pickles toward you, without looking.", office.js:384) would echo the Mio lunch nicely on both histories.

24. **The Lillehammer branch re-asks.** shotengai.js:93. On `lunch_mori` they already talked about it (the ski jump); "What did you think of it?" is a restart. A callback to the landing claps would carry it on.

25. **Mori's また行きたい after the player has just learned -tai.** shotengai.js:94. A `clear` entry for 行きたい would let the player recognise the pattern unprompted, which is a small reward for the new word.

26. **The guard and Tama.** gate.js:22. "Your card still works too, I see." is a bit loose for a cat; the guard's 猫はいません running joke from day 1 is free. On `gate_magic`, a look from the guard as Eric passes (cold read point 15) costs nothing.

27. **Coming home ends with no beat.** dorms.js:17 and :60. Day 1 waits a moment in the room before the summary. After a party, one small thing (Mio's pickles if he took them up on `d2_mio_party`, or Eric's line at the window) would end the day on him.

28. **Mio's pickles offer has no follow-through.** shotengai.js:135, "You can take some pickles home, if you like. Please, actually." It's a good line; nothing happens after it. Pairs with 27.

29. **The required route is about fifteen place loads.** Room, court, lane, plaza, forecourt, gate, train, gate, forecourt, office, forecourt, plaza, shop street, lane, court, room. Day 1's home walk went plaza → dorm court directly; day 2's always goes through the east lane. Fine for "detours are fine" if the loads are quick on a phone; worth timing in the build, and keeping plaza → dorm court as the evening shortcut if it isn't.

30. **The window line.** dorms.js:58, "I can hear people in the courtyard. I can't see them from here." Fine, and consistent with day 1. Only noting that bed, boxes and window are all Eric being tired; one of the three could be about the day ahead (the station, Emi's chat).

## The earlier outline cold read

Settled in the written scenes: 1 (station first), 2 (ugoite, not akete), 4 (two required beats, test optional), 5 (Mori after the party), 6 (canteen food), 8 (Kenji teaches), 9 (everyone's reason, Emi's meeting, the bench), 10 (`lunch_mio`, `lunch_mori`), 11 (Mori subtitled), 12 (Kenji's errand and the blue curtain), 13 (two food actions), 19 (Head home at the seat, the summary), 22, 23, 24.

Partly settled: 3 (Emi reads the report; Mio doesn't, findings 2 and 5), 7 (Mori's worry is there; the turn is light but enough), 14 (fallbacks exist but are Eric's own lines, finding 14), 20 (the area is open; the new places are empty, finding 16). 15 to 18 are build work in the README handoff.

## What was checked

Every node in the ten day-2 files, both reports, the optional test with and without Mio, both foods, all three party topics on both lunch histories, the optional drink word, skipped visits, and returns to each place in each state of `d2_ticket_done`, `d2_brief_done`, `d2_shift_done`, `d2_met_kenji`, `d2_ate`, `d2_party_done`. `node game3d/tools/day2-story-check.mjs` passes (118 nodes, 288 routes); it checks structure, not what the goal text says.
