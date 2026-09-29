# QA round 1: day 1 against the production bar (2026-09-29)

Build under test: local HEAD, 2026-09-29 00:05 to 01:10 UTC. The build chip read 0928-2236-21c9fd4 in the first desktop run and 0929-0028-82c1b24 in every later run (the builder rebuilt in between; nothing in this report depends on that change).

Everything is in game3d/qa/round1/:

- human-1366x860/, human-390x844/, human-2560x1440/: the first 5 minutes at human pace with real input (keys, clicks, taps, typing), no test mode. NNN-tSSS-what.png, where tSSS is seconds since Start. log.txt has every action and line, steps.json what was on screen at each shot.
- fast-1366x860/ (every line), fast-390x844/, fast-2560x1440/ (every beat): the whole day in `?test=fast`, a still at each story beat, place start and every few seconds of play, plus transcript.txt.
- diag-click/, title-hover/: two targeted checks (below).
- The scripts are in game3d/qa/ (capture-fast.mjs, human.mjs, diag-click.mjs, title-hover.mjs, run.sh, which takes the browser lock and then the GPU lock if it's free).

Critics: four fresh agents with no context (train, gate and lift, office, UI across sizes) saw only the screenshots, the reference images, the production bar and the day's transcript. A fifth fresh agent played the cold player (mid-N5, no context) on the human runs and the fast phone day and scored the ONBOARDING checklist. Performance (bar item 7) is measured, not judged: `GL=gpu node game3d/tools/perf.mjs` on 0929-0028-82c1b24.

A caution on the fast-run stills: they are taken two frames after a line appears, so some catch text and the typing box mid fade-in. Where a critic called text "faint" only from a fast still, I checked the human-pace shots; the real problem that stays is the typing box's missing backing and the grey romaji line (fix 6), not the fade.

## Scores

Pass mark 8. Nothing passes.

| Bar item | Train | Gate + lift | Office | UI desktop | UI QHD | UI phone |
|---|---|---|---|---|---|---|
| 1. Looks finished | 4 | 5 | 5 | 6 | 5 | 4 |
| 2. Feels good | 4 | 5 | 5 | 5 | 5 | 4 |
| 3. Reads clearly | 4 | 5 | 5 | 4 | 4 | 3 |
| 4. Characters | 3 | 5 | 4 | 6 | 6 | 5 |
| 5. Language | 6 | 7 | 6 | 6 | 6 | 6 |
| 6. Story | 6 | 7 | 7 | 6 | 6 | 6 |
| 7. Runs on a mid-range phone | 3 (measured, whole day) | | | | | |

Item 7, measured (393x851 at DPR 2.75, CPU 4x throttle, 4G): frame rate is fine on this machine's GPU (59 to 60 fps, 0 long tasks), but draw calls are 3,332 (train), 2,556 (gate) and 3,490 (office) a frame against a budget of 250, triangles 640k (train) and 654k (office) against 300k, and the train and office take 6.1 and 6.4 s to open against 6 s. On a real phone the draw calls are what breaks first (notes/PERF.md). No better than round 0; the perf agent's batching (js/perf/batch.js) isn't in yet.

### ONBOARDING checklist (cold player)

The cold player marked 17 of 22 as passing, with must items 12, 18 and 19 failing. I don't count 19: the "New command" notice clears on the next click by design, and the driver clicked; the goal chip dims during dialogue but doesn't leave. That makes 18 of 22, but must items 12 and 18 still fail, so **the checklist fails**.

| # | Result | Evidence | Note |
|---|---|---|---|
| 1 | pass | human-1366x860/001-t005-first-screen.png | moving at 7 s |
| 2 (must) | pass | human-1366x860/001, human-390x844/001 | but the cat is outlined from the first frame (see fix 20) |
| 3 (must) | pass | human-1366x860/008-t025-goal.png | |
| 4 | pass | human-1366x860/002 | |
| 5 (must) | pass | human-1366x860/004-t007-act-reader.png | labels get squeezed at the screen edge (fix 11) |
| 6 (must) | pass | | the cat's outline reads as a marker |
| 7 | pass | 004, 005 | "I think E is Talk... confusing part: the headphone girl answered, not the man" |
| 8 | pass | human-1366x860/005 | "this area" is vague |
| 9 (must) | pass | human-1366x860/052 | the tip says "Tap Say" on desktop |
| 10 | pass | human-1366x860/052-058 | the cat reacts a few seconds after typing |
| 11 | pass | | Next shows at the cat in the fast run (fast-390x844/012) |
| 12 (must) | **FAIL** | human-1366x860/068-t196-cant-reach-mio.png, human-390x844/061-t171-cant-reach-mio.png | after the cat, Eric can't be walked to Mio for 2+ minutes (fix 1) |
| 13 | pass | fast-390x844/001-005 | |
| 14 (must) | pass | logs | |
| 15 | pass | human-390x844/009-012 | the first E on Mio only plays the lunch-bag line; a second E starts the talk, and nothing says so |
| 16 | **FAIL** | human-1366x860/068-080 | no nudge during the stuck stretch |
| 17 | pass | human-1366x860/007, 008 | "which seat is empty? None is marked" |
| 18 (must) | **FAIL** | human-1366x860/008, 027, 064-080; fast-1366x860/161-office__talk.vending.jpg | "Sit down" with no seat marked; "when you like" reads optional; stuck at Mio; side goals replace the main goal |
| 19 (must) | pass (cold player: fail) | human-1366x860/045-047 | see above |
| 20 (must) | pass | human-1366x860/020, 023 | "Eric is an IT support contractor on his first day. He's going to B2, and Mio is ... also in B2, so she's on his team." |
| 21 | **FAIL** | human-2560x1440/012, fast-390x844/018, human-1366x860/056 | "The train lurches. The woman's lunch bag slides...", "He is fast asleep." under a zzz, "A slow blink." |
| 22 | pass | | talk 2 (8 lines and a choice before any action) is the closest to "when does this end" |

Cold player's verdict: "Probably not in this build... at minute 3 I couldn't walk to the one person the goal pointed at, and nothing in the game helped. I'd have assumed it was broken and closed the tab. If that bug is fixed I'd keep going, because the doors, the gate and the copier set up a mystery I'd want to follow."

## Fix list, most important first

Owners follow notes/PRODUCTION.md; the world, shell and characters areas go to the builder. All evidence paths are under game3d/qa/round1/.

### Blocking

1. **Mio can't be reached by clicking after the seat talk and after the cat.** A floor click or tap at Mio's ring gives Eric no path at all (walker path 0, player [0.67, -0.48], spot [1.37, -0.63]); same at all three sizes, 2+ minutes, no feedback. A click on her body next to her didn't start the talk either. Phone players only have taps. Evidence: human-390x844/log.txt (GAVE UP lines), human-390x844/061-t171-cant-reach-mio.png, human-1366x860/068-t196-cant-reach-mio.png, diag-click/after-body-click.png. Owner: feel (move.js) with builder (main.js pointerdown). Fix: a click on an unreachable point walks to the nearest reachable point, and a click or tap on a person or their ring always walks to their approach spot and uses them.
2. **Eric walks into and stands inside people, the cat, seats, desks and counters, and NPCs merge with him.** Train: inside the man with a book, the bun woman, the suited man and on the cat; gate: inside both desks; office: inside the counter, vending machine, his chair, and Mio and Mori inside Eric. Evidence: human-1366x860/004-t007-act-reader.png, human-1366x860/007-t020-line.png, human-1366x860/056-t161-say-menu.png, fast-1366x860/076-gate__play.jpg, fast-1366x860/118-office__start.jpg, fast-1366x860/200-office__line.jpg. Owner: feel (move.js approach spots and personal radius) and builder (colliders on seats, desks, counters). Fix: stop at talk range in front of the target, never on it, and keep 0.5 m between any two people.
3. **Phone HUD runs off the screen.** Once Bag appears, the settings gear and the sound button are pushed off the right edge. Evidence: fast-390x844/066-office__talk.vending.jpg, fast-390x844/067-office__play.jpg. Owner: builder (shell css). Fix: drop the date text on narrow screens or fold People, Bag and Words into one button.

### Clarity and clutter

4. **The "Tap Say, then pick the word." tip never goes away.** It says Tap on desktop, stays up after Say has been used (t147 to t301), comes back at the gate and office, sits over the lift the goal points at, doesn't scale at QHD, and stacks with the goal and the action menu on phone. Evidence: human-1366x860/068-t196-cant-reach-mio.png, human-390x844/061-t171-cant-reach-mio.png, human-2560x1440/048-t163-goal.png, fast-1366x860/111-gate__play.jpg. Owner: builder (ui.js introSay). Fix: show it once, word it per input ("Press Q to say a word"), close it on the first Say, and put it on the UI scale.
5. **The Say menu stays open over the dialogue.** After picking a word and typing it, the reaction comes a second later; Q in that gap reopens the menu, and it then sits under the dialogue box while "A slow blink." plays, and the cat line plays twice. Evidence: human-1366x860/056-t161-say-menu.png, human-1366x860/058-t164-say-menu.png, human-390x844/051-t141-say-menu.png. Owner: builder (main.js say, ui.js sayMenu). Fix: close the Say menu when any beat starts and ignore Q while the reaction is pending.
6. **The typing box has no backing, and the romaji is grey on grey.** The prompt sits straight on the 3D scene; the romaji line, the one a weak-katakana player needs most, is barely readable. Evidence: human-1366x860/044-t132-type-prompt.png, human-1366x860/054-t155-type-prompt.png, human-390x844/038-t112-type-prompt.png. Owner: builder (shell css). Fix: put the prompt on the same dark card as the dialogue, romaji in light text before it's typed.
7. **Wrong portrait on Say and type prompts.** Mio's portrait shows for "Say it to Cat", to the sleeping man, the machine-room door, vending and coffee machines (she's across the room); the guard's for "Say it to Tama"; the receptionist's while talking to the guard. Evidence: human-1366x860/054-t155-type-prompt.png, fast-1366x860/151-office__type.ugoite.jpg, fast-1366x860/109-gate__talk.guard.jpg, fast-390x844/037-gate__type.sumimasen.jpg. Owner: builder (ui.js showPortraits). Fix: when Eric speaks to a thing or an animal, show only Eric; tie portrait, name and bubble to the actual speaker.
8. **The Say target contradicts the speaker in lessons.** Mio says "say it to her" and the prompt says "Say it to Sleeping man"; the matte lesson says "Say it to Cat" on the platform with no cat in view. Evidence: fast-1366x860/055-train__type.sumimasen.jpg, fast-1366x860/069-train__type.matte.jpg. Owner: builder (H.type target) with story. Fix: during a lesson the prompt names the person the line names, or no one.
9. **Phone portraits cover the scene.** One portrait fills about 60% of the screen, hides the speaker and the action (the gate opening is hidden behind the Man from the train), and ends in a hard cut. Evidence: fast-390x844/031-gate__talk.kuroda.jpg, fast-390x844/032-gate__type.akete.jpg, human-390x844/020-t059-line.png. Owner: builder (shell css). Fix: a smaller bust docked to one side above the text band, with the cut edge on the solid band (GUIDE: phone band).
10. **The goal points at people the screen doesn't show.** "Sit down" with no seat marked; "Talk to Mio" while Mio is half off screen and unmarked; on phone Eric sits at the left edge with half the screen sea. Evidence: human-1366x860/008-t025-goal.png, human-1366x860/068-t196-cant-reach-mio.png, human-390x844/061-t171-cant-reach-mio.png. Owner: feel (cam.js framing) and builder (goal ring). Fix: the goal target gets its floor ring (the seat included) and an edge arrow when off screen, and the camera keeps Eric and the goal in frame on phone.
11. **Labels and emote bubbles get clipped or pile up.** "Young man" squeezed into the corner with its ring off screen; the zzz bubble clamped at the top-left pointing at nothing and on top of Mio's text; the "?" bubble over the goal chip. Evidence: human-1366x860/048-t147-goal.png, fast-1366x860/036-train__talk.mio.jpg, fast-390x844/015-train__talk.mio.jpg. Owner: builder. Fix: hide bubbles for off-screen people or show an edge marker, and keep labels and bubbles out of HUD rects.
12. **Side goals replace the main goal.** "Tell Mio the copier is fixed." becomes "The vending machine is stuck." after a side poke. Evidence: fast-1366x860/161-office__talk.vending.jpg. Owner: builder (goal hook) with story. Fix: side goals as a second, smaller line; the main goal stays.
13. **"Talk to Mio again when you like." reads as optional**, and the first E on Mio only plays the lunch-bag line with no sign a second E starts the talk. Evidence: human-1366x860/027-t079-goal.png, human-1366x860/012-t029-line.png. Owner: story. Fix: a goal that says what to do ("Talk to Mio"), and Mio's first line comes right after the bag beat.

### Staging and the day's big moments

14. **Place changes show the old place on top of the new one while the first line plays.** The train platform ghosts over the lobby under the guard's first line; lobby panels, a floating "1" and "y 14:00" ghost over the office under Mori's. Seen in fast mode; confirm at 1x. Evidence: fast-1366x860/074-gate__start.jpg, fast-1366x860/118-office__start.jpg, fast-390x844/045-office__start.jpg. Owner: feel (trips.js). Fix: finish the transition before the first line of the new place.
15. **The doors stop off camera, and the phone camera loses Eric.** After matte the frame is mostly empty track and water; the player never sees the doors hold or the man stumble out; on phone there is no character on screen. Evidence: fast-1366x860/065-train__line.jpg, fast-1366x860/071-train__talk.mio.jpg, fast-390x844/027-train__play.jpg. Owner: feel (cam.js) with story (cam steps). Fix: hold on the doors and the man for the matte beat, then back to Eric and Mio on the platform.
16. **Words working have no visible payoff in the office.** Nothing shows the copier waking or the rack alarm stopping. Evidence: fast-1366x860/147-office__line.jpg, fast-1366x860/182-office__type.tomatte.jpg. Owner: builder (the `kotodama` effect already requested by language) with feel (sound). Fix: a short reaction on the machine for each command (lights, whirr, LEDs go green).
17. **Lunch isn't staged.** Mio stands at the racks and Eric outside the machine-room wall while she says "You can sit on the floor"; half the frame is off the map. Evidence: fast-1366x860/174-office__line.jpg. Owner: story (sit steps) and feel (camera clamp). Fix: both seated on the floor inside, camera on the room.
18. **The lift ride is a box in black.** The lobby goes black around the car, the indicator shows ▲ 1 on the way down, the neighbour car sticks out of the wall at QHD, and nothing shows who is talking. Evidence: fast-1366x860/113-gate__zone.lift_front.jpg, fast-1366x860/116-gate__line.jpg, fast-2560x1440/041-gate__zone.lift_front.jpg. Owner: builder (lift.js). Fix: dim, don't black out; ▼ and falling numbers going down; hide the second car; a head turn on the speaker.
19. **Emi never appears in 3D.** She speaks at 17:40 and People goes up, but no figure comes in. Evidence: fast-1366x860/187-office__talk.my_desk.jpg, fast-1366x860/192-office__line.jpg. Owner: builder with story. Fix: walk her in from the lift to the desks.

### Look and characters

20. **The hover outline shows through walls, and the cat is outlined from the first frame.** On the title screen the cat's outline shows through the train wall; in play the cat is outlined before anything is in reach. Evidence: title-hover/title-hover-0.png, human-1366x860/001-t005-first-screen.png. Owner: builder (OutlinePass). Fix: no hover outline on the title, and hidden edges off.
21. **Mio's 3D model reads as a green blob.** From the play camera there is no face, and her back is to the camera while she teaches; three front-row passengers are tops of heads. Evidence: fast-1366x860/036-train__talk.mio.jpg, fast-1366x860/122-office__talk.kenji.jpg, human-2560x1440/001-t005-first-screen.png. Owner: builder (characters area) and feel (camera tilt). Fix: turn talkers toward Eric and the camera; check the tilt shows faces on both rows.
22. **Eric sits badly and the gate cat looks dead.** The bench pose hangs off the seat edge with legs through it; the cat lies flat and twisted. Evidence: fast-1366x860/086-gate__line.jpg, fast-2560x1440/039-gate__play.jpg. Owner: builder (characters area). Fix: snap to seat points; a curled sleeping pose for the cat.
23. **Portraits don't match their 3D bodies**, and the end screen uses different portrait art (guard and Hamada in a thick-line caricature style; the guard portrait is bald with a moustache, the 3D guard has dark hair under a cap). Evidence: fast-1366x860/096-gate__talk.kuroda.jpg, fast-2560x1440/071-zz__end.jpg. Owner: builder (end.js icons); the portrait-vs-model match needs Jørgen's pick (Review). Fix: end-screen icons cut from the dialogue portraits now; the model match goes to Review.
24. **Places are flat next to the references** (no ink lines, cel bands or warm light pools; empty middle of the lobby; copy room and toilets empty). This waits on Jørgen's style decision (texture avenues in Review), so it's not a fix request yet; props for the empty areas can go ahead. Evidence: fast-1366x860/076-gate__play.jpg, fast-1366x860/155-office__play.jpg. Owner: builder (world area). Fix: a few purposeful props in the lobby middle and the copy room.

### Language and story

25. **Taught forms don't match what's typed and glossed.** The train teaches {yoroshiku} but the typing box asks for "yoroshiku onegaishimasu"; Kenji's よろしく is glossed with the full form; the end screen lists the full forms only; gaijin, honsha and tsugi wa are marked as taught but aren't on the end screen. Evidence: fast-1366x860/102-gate__type.yoroshiku.jpg, fast-1366x860/131-office__say.yoroshiku.kenji.jpg, fast-1366x860/208-zz__end.jpg. Owner: story with builder (lang.js via language). Fix: one form per word, glossed exactly as shown.
26. **Japanese breaks mid-word across lines** (よろしくおねがいしま / す, すみ / ません, ございま / す). Evidence: fast-390x844/017-train__type.yoroshiku.jpg, fast-390x844/021-train__event.arrived.jpg. Owner: builder (css). Fix: keep each taught word on one line (no-break span).
27. **Lines that describe what's on screen** (ONBOARDING 21): "The train lurches. The woman's lunch bag slides to the edge of the seat and wobbles there.", "He is fast asleep." under a zzz, "A slow blink.". Evidence: human-2560x1440/012-t033-line.png, fast-390x844/018-train__near.door_l.jpg, human-1366x860/063-t175-line.png. Owner: story. Fix: cut or shorten them to what can't be seen.
28. **Narration names things that aren't there** (paw prints "on the steps" with no stairs in view; an OUT OF ORDER sign that isn't on the coffee machine). Evidence: fast-1366x860/161-office__talk.vending.jpg, fast-1366x860/153-office__say.ugoite.coffee_machine.jpg. Owner: story, or builder (world) to add the sign and a stair landing. Fix: match the line and the scene.
29. **A few lines read written or broken**: Kenji's "My chair is... broken. Pshh." and "Yes!" push his English into caricature; Mio answers yoroshiku with "Hm? What is it?"; "Say it to Machine room." Evidence: transcript-day.txt (office). Owner: story (prompt text: builder). Fix: one or two quirks for Kenji, a real reply to yoroshiku, "the machine room".
30. **The end screen drops the day-2 hook and overlaps on phone.** "Tomorrow is day two." ignores REPAIR REQUEST #2 and the 8:40 front car; on phone it and Back to title sit on top of the word cards; the card fades in over live play. Evidence: fast-390x844/075-zz__end.jpg, fast-2560x1440/071-zz__end.jpg, fast-1366x860/207-office__say.tomatte.fan.jpg. Owner: builder (end.js) with story (the line). Fix: the repair ticket as the closing card; a footer that doesn't cover the list; fade the scene out first.

### Performance

31. **Draw calls 10 to 14 times the phone budget, triangles twice.** 3,332 / 2,556 / 3,490 calls and 640k / 307k / 654k triangles (train, gate, office); train and office load in 6.1 and 6.4 s. Evidence: `GL=gpu node game3d/tools/perf.mjs` output in this report; notes/PERF.md. Owner: builder (perf batching in progress). Fix: land the static batching and instancing, and small props out of the shadow pass.

## Smaller things (not requested separately)

The choice context line has no speaker name (human-1366x860/024-t070-choice.png); the Say menu opens in the far corner and cuts the meaning to "good m…" (human-1366x860/053-t152-say-menu.png); the desktop action menu shows only Say for the cat while phone shows Pet and Say (human-1366x860/052 vs human-390x844/058); the phone HUD is icons and numbers with no words; an unlabelled ◁ button on desktop and a teal arrow on phone (fast-390x844/061-office__play.jpg); the E key cap disappears after two uses and the cold player "wasn't sure E still worked"; the build id is unreadable at QHD; the title shows Continue on a fresh profile; Mio's "server's down" exit on the train comes out of nowhere (a request for her phone buzz already exists).

## What works (all critics)

The car layout and warm sun stripes; the arrival with the platform sliding in; the lobby palette close to the muted reference; the gate's red and green bar; emote bubbles giving silent people some life; scrambled overheard Japanese with taught words glossed inline; the two-portrait dialogue with the listener dimmed on desktop; the goal pill; the word card design; the story shape (the sleeping man set up and paid off, the gate turn, the 1996 copier, Mio adding up the day, the repair request as a hook); Mio's lines sound spoken.
