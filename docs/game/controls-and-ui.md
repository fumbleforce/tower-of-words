# Controls and UI

The controls on desktop and phone (walk, use, Next, Say with Q, the mic, Give, pause) and when each is first taught; the HUD (goal box, clock, counts, markers, the Say button); the dialogue box; the panels and screens (title, pause and save slots, settings, day end, the build id); the camera; and how the phone and desktop layouts differ. Last checked against the game on 2026-09-29.

Elsewhere: the rules every screen has to meet (no timers, one menu per target, separate phone and desktop layouts, the design language) are in GUIDE, Visual design (with "First screen"). What the systems behind the panels do is in [systems.md](systems.md).

## Controls

| Action | Desktop | Phone |
|---|---|---|
| Walk | W A S D or the arrow keys, or click the floor | Tap the floor |
| Use or talk to the target | E, Space or Enter, or click it or its marker | Tap it or its marker |
| Next target, when several are in reach | Tab (the Next row in the action prompt) | The Next row |
| Say a word | Q (can be rebound in Settings) | The Say button |
| Say it into the microphone | Hold V, or the mic button at the prompt | The mic button |
| Move the story on | Click anywhere on the dialogue area, Space or Enter | Tap the dialogue area |
| Give a drink | The Give button next to someone, or tap the drink in the Bag | The same |
| Pause, or close a panel | Esc, or the menu button top right | The menu button |
| Send feedback (local builds only) | F8, or the note button top right | The note button |
| Performance numbers on or off | F3, or Settings | Settings |

A click on something he can use walks him there and uses it. If a scene starts on the way (he walks into a room with its own moment), he carries on to it and uses it when the scene ends.

Clicking while the story is busy (a walk, a door) shows that the game is waiting and hurries the scripted move along. Every attempt does something visible.

People are soft to each other and never stand inside each other or the furniture (Jørgen: "we need much better soft collision so models push gently at each other without locking up in tight spaces"). Someone walking behind another person follows at their pace instead of walking into them, and a walk goes round whoever stands in the way. People lean in and push apart gently, and slip past in a spot too tight to share. A seated person's knees and feet count as taken floor. Nobody stands on the cat, and she hops off Eric's chair before he sits. Someone left standing with a shoulder in a desk or a machine steps clear. In the lift, everyone stands inside the car's walls. The fast test fails when any of these happen.

While Eric is saying a word (its practice prompt, his voice, the answer), clicks and taps on people, things and markers, and E, are ignored, so the word isn't lost to a new talk. They work again as soon as the word is done or the prompt is cancelled.

## When each control is taught

On the train (game3d/js/onboard.js, notes/ONBOARDING.md for the design):

- At the start the screen shows only one line on walking ("W A S D or click the floor to walk" / "Tap the floor to walk"). It steps aside while a line or caption is up, goes once Eric has walked a few steps and never comes back.
- No goal and no story hints until he has talked to a person. The first passenger he talks to points at the seat beside Mio, and that gives the first goal.
- The action prompt drops its verb after two uses and its key cap after five.
- Say first shows only at the goal target (the cat), after Mio teaches おはようございます; after one use it shows wherever a word works.
- No Next, clock, People count or mute chip on the train.
- Onboarding state is kept in the browser, so a reload doesn't teach it all again; Start on the title resets it.

Every control is introduced the first time it's needed, and ambient people never block the player's path or clicks (Jørgen).

## The HUD

- The goal box, top left: the current goal on one line, always there until the player acts, re-readable. Tips (the Say tip, story hints) are a second line inside the goal box, never a separate box (Jørgen, 2026-09-29: "Put tips inside the goal box top left so we dont get so many places for this"). A tip has a close button; tapping the goal line brings a closed hint back. A side line under the goal is used for small side goals ("The vending machine is stuck.").
- Top right: the clock (date and period), People (count), Bag (count), Words (count), a mute button and the menu button. Each appears once it has something in it; none on the train. On a local build served by ./start, a note button for feedback sits before the menu button everywhere, including the train and in the middle of a conversation; the public build doesn't have it.
- Markers: every interactable thing on screen, not just people, carries a pin: a circle with a symbol (speech for people, a paw for the cat, an eye for things) on a short line down to it (Jørgen, 2026-09-29: "the microscopic dots are not enough to indicate interactive elements... earlier you had a line and a circle with a symbol which was better"). No labels on pins; the action prompt has the name. The goal's pin is teal and larger. Pins further from Eric are smaller and paler, and where two would overlap only the one nearer to Eric shows. With no room above a target (under the HUD) the pin sits beside the head, never over the face. Things marked "no marker" in the engine show one only while they're the goal. A goal that points at a seat or a spot (the train's "Sit by the lunchbox.") gets a goal pin of its own there ("Free seat"); tapping it walks Eric there. Tapping or clicking a visible pin does what tapping its target does; a pin hidden by a nearer one takes no taps.
- The target in reach: its pin lights up and its line becomes a small bobbing pointer, and the model itself gets an outline; the model under the mouse gets the same outline on desktop. Nothing is drawn on the floor around the goal or the target, and no ring comes around the person being talked to (Jørgen, 2026-09-29: "the ring comes around any character that you are currently selecting / interacting with"; earlier the floor ring was "brutally ugly and overlaps the whole screen"). The pin and the outline are the only marks. The outline takes only the model's own meshes, never the shadow blob under a person or other helper meshes (Jørgen, 2026-09-29: it drew a big square under Mio).
- The action prompt beside the target: the name on top, then one row per action, with a key cap and the label in one type style, and a small pointer toward the target (Jørgen: "the interaction box is also not very pretty, not well designed"). One prompt per target, with interact and Say stacked; the current target is clearly marked.
- The Say button: lights up when the goal answers to a word Eric knows. The Say menu lists his phrases and commands with their icon, Japanese, reading and English, and the practice dots ([systems.md](systems.md)).
- The LED board at the top of the train car shows the station announcement.
- Emotes over heads (!, ?, …, ♪, heart, sweat, zzz) are big (Jørgen, playtest: "emotes much bigger").

## The dialogue box

- Direction 1, "faded" (Stage light, game3d/design/DIALOGUE-OVERLAY.md), approved by Jørgen, with a more solid grey band at the bottom on phone so the portraits' cut edge sits on solid colour.
- The speaker's portrait stands beside the box (desktop: large on the left; phone: smaller, above the box, and moved in from the side when needed so the whole picture stays on screen). Eric's shows smaller on the right on his lines, and the listener dims. Narration has no portrait. While a word to type or a choice waits on the player, no portrait covers Eric, or the thing he's saying the word to: a portrait that would goes to the other side, else shows smaller, else fades out, and it comes back when the lines go on (issue #76; game3d/tools/prompt-shots.mjs shoots and checks every prompt of the day). The faces are in [cast.md](cast.md).
- The name plate and role sit above the text. Japanese words show with reading and English; taught words can be clicked to hear them.
- The whole dialogue area moves the story on, including the empty space below the text; "Click to continue" shows for the first few lines. The HUD buttons (Words, People, Bag, sound, the menu) stay usable while a line is up, and tapping them doesn't move the story on. Eric's spoken lines finish before anyone replies (Jørgen, playtest).
- Choices: the buttons name their object ("Point at the briefcase"). Learning a word is typing it, not clicking a choice. On the phone the buttons come up dimmed and take taps only after a moment, so a tap meant for the line before doesn't pick one.
- Mio's texts show as phone messages on their own dark card.
- Scroll up or PageUp for the backlog (to build in game3d; it was in the VN).

## Panels and screens

Panels open above everything in the HUD, the goal arrow and the Say button included.

- People: everyone Eric has met, with their bond step, what they remember and what he has learned about them ([systems.md](systems.md)).
- Bag: his yen and the drinks he's carrying. With someone in reach, tapping a drink gives it to them; otherwise the panel says to walk up to someone.
- Words: the words he can say, each with its dictionary form and practice dots, and a note on the -te form ([words.md](words.md)). When he learns a word, the Words chip pops once (it grows a little and settles in about a third of a second) and its border lights up in the accent teal and fades over a second; the count goes up with it.
- Title: the train seen from outside at dawn; on Start the camera flies into the car. Continue when there's a save.
- Pause (Esc): settings, the three save slots (save and Load), back to title. What loading restores: systems.md, Saving.
- Settings: text speed (default fast), auto-advance (off), volumes for master, music, voices and ambience, voices on or off, graphics tier (auto), surface detail, interface size, reduce motion, the Say key, voice input (device, browser or off), how many tries a word needs before it's a click (3), and performance numbers (off).
- Performance numbers (F3 or the Settings switch; kept between visits): a small dark box top right, under the menu button, with the frame rate, average frame time, 1% low, draw calls, triangles, geometries and textures in memory, the JS heap (Chrome only), the place and the graphics tier. It sits under the menus and takes no clicks. How to read the numbers: notes/PERF.md.
- Feedback (F8 or the note button; Jørgen, 2026-09-29: "just a modal with text field and send, that also takes a screenshot there and then"): a small window with a text field, a thumbnail of the screenshot and Send. The game pauses behind it and no key reaches the game while it's open. The screenshot of the world and the HUD is taken before the window shows. Send saves the text, the screenshot and where the game is (build, place, period, story node, goal, the line on screen, player position, viewport) through tools/review_server.py to notes/feedback-game/<time>/, logs the text in notes/feedback-log/, and says "Sent" with a button back to the game. Ctrl+Enter sends and Esc closes; an unsent text is kept for next time. If the server doesn't answer within 10 seconds the window says so and the player can send again; closing it while it sends gives up on the send, so a stalled server never leaves the game paused. The screenshot shows what is typed in a text field, such as a romaji answer half typed, and the context lists it too. Only on a local address where the server answers; tests and captures leave it out unless the URL has ?feedback.
- A loading chip between places, and a dimmed frame, only when the walk out is over and the next place is still being built. A watched walk, the lift ride, or a trip to a place already built never shows it or dims the screen.
- The end of the day: the places (a frame of every place Eric was in, in the order he got there, including the walk home and his room), the people met and the words he can use; the story's closing line; back to the title, after everything else (it never covers the list). No quiz and no score.
- The build id shows in a corner (game3d/build.json).

## Camera

- Top-down 3D, looking down at each place with its near walls cut away. Conversations zoom in on the person who matters, then back.
- The player character is always in view (Jørgen: the lift ride showed only the outside of the lift during a long sequence).
- Ceiling light fixtures are not shown in the top-down scenes (they get in the way); their light stays (Jørgen).

## Phone and desktop

- The phone layout is used when the screen is taller than it is wide (width to height under 0.8) or narrower than 640 px. Phone and desktop have separate layouts (GUIDE, Visual design).
- The UI scales with the screen: 1 at 1366 × 860 and up to 2 on large screens (QHD and 4K get a bigger UI by default), times the interface size setting. Phones keep 1.
- The game targets desktop first; Android comes later.
