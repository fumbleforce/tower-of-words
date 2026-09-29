You are a cold player: someone who has never seen this game, knows nothing about it, and is learning Japanese at a mid-N5 level (hiragana mostly fine, katakana weak, spotty grammar). Do not open, list or search any file except the ones named here. Do not read code, docs or notes.

The game is a small 3D story game in the browser. You are reviewing recordings of real play, as if you were the player. Go through the pictures in order and, for each, write down (for yourself) what you think is happening, what you think you should do next, and anything that confuses you.

Recordings:
A. The first 5 minutes at human pace, played with real keys and clicks, three screen sizes. The picture names are NNN-tSSS-what.png (tSSS = seconds since Start). log.txt in each folder is what the player did and the lines shown (USE = pressed E / tapped the action; SAY = pressed Q / tapped Say; TYPE = typed the romaji; "GAVE UP reaching X" = the player clicked or tapped the floor at X's ring for 20 seconds and Eric never got there; the diagnostics after it are for the developers). steps.json lists, per picture, what text was on screen.
   - desktop: /home/jorgen/repo/japanese/game3d/qa/round1/human-1366x860/ (all .png, log.txt)
   - phone:   /home/jorgen/repo/japanese/game3d/qa/round1/human-390x844/ (all .png, log.txt)
   - QHD:     /home/jorgen/repo/japanese/game3d/qa/round1/human-2560x1440/ (look at the first 20 pictures only, for size and readability)
B. The whole day in fast mode (a script plays it quickly, with a still at each story beat), phone size: /home/jorgen/repo/japanese/game3d/qa/round1/fast-390x844/ (all .jpg), and the text of every line: /home/jorgen/repo/japanese/game3d/qa/round1/transcript-day.txt (words in {braces} are taught words; on screen they show in Japanese with the reading and meaning). The fast driver wanders and tries words on things, so some repeats are the driver.

Use ls on those folders to get the file names, then open every picture with the Read tool (for the QHD folder only the first 20). In the desktop and phone folders, once the player got stuck near Mio (the second "cant-reach-mio" picture onward) the pictures barely change: open the first two of those and the last one, and read the rest of that stretch from log.txt and steps.json.

Score the checklist below (it is the design team's own checklist for the first five minutes). For each item: PASS or FAIL, the screenshot path that shows it, and one line why. For items 7, 17, 18 and 20 give your own words as the player ("I think E is...", "I'm supposed to..."). The checklist passes only if every item marked (must) passes and at least 18 of 22 pass.

## (d) Cold-player checklist

A fresh agent with no knowledge of the repo plays at 1366x860 and 390x844 (phone), and a human-speed pass follows. Score each item pass or fail. It passes only with all items marked must passing and at least 18 of 22 overall.

First screen
1. (must) Within 5 seconds of the scene appearing, the player can move Eric.
2. (must) The first screen shows only the controls line, the settings icon and the build id. Count every other element; the count must be zero.
3. (must) No goal text anywhere before the first E on a person.
4. The controls line goes once the player moves, and does not come back.

Teaching verbs
5. (must) The E prompt first appears only when a target is in reach, and next to that target.
6. (must) No more than one target is marked at a time, and nothing out of reach is marked.
7. The cold player can say, after the first passenger, that E talks to people, without being told.
8. The first dialogue line shows how to continue, and one click anywhere continues it.
9. (must) Q/Say is not visible anywhere before Mio sends him to the cat.
10. At the cat, the cold player uses Say on the first or second try.
11. Tab/Next doesn't appear in the first five minutes.

Freedom
12. (must) After every conversation the player can walk within one keypress or click (seated Eric stands up).
13. The player can talk to at least five things or people without starting the story.
14. (must) No story beat starts unless the player walks into it or presses E.
15. Walking straight to Mio first works, with no broken goal or leftover prompt.
16. Ignoring Mio for a long time never locks anything and brings at most one diegetic nudge before a goal line.

Nudges and goals
17. The first goal comes from something a character did or said, and the cold player can say where it came from.
18. (must) At every point after the first goal, the cold player can say what to do next.
19. (must) No text leaves the screen on a timer (goal, hint, caption, prompt).

Story and text
20. (must) No panel or narration explains who Eric is, where he is or why. The cold player can still say, by the end of beat 4, that he's new, going to work in B2 and that Mio is on the same team.
21. No line describes what the camera already shows.
22. Each of the three Mio conversations is under about 90 seconds at reading speed. The cold player never says "when does this end".

Report per item: pass or fail, a screenshot for each on-screen item, and the cold player's own words for 7, 17, 18 and 20.


Then, for the whole day (first 5 minutes and the fast day), list every moment where you were confused, saw clutter, got stuck or could have got stuck (softlock), saw things overlapping, people or objects clipping into each other, text that was hard to read (size, contrast, text over busy pictures), Japanese you were expected to understand but hadn't been taught, a line that describes what you can already see, or anything that made you think "when does this end". Each with the screenshot path, what happened and what would have helped, most serious first.

Finish with: overall, would you keep playing after 5 minutes, and why (two or three sentences). Write it all as your final message, plain English, no preamble.
