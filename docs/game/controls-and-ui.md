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
| Give a drink | The Give button, next to someone | The same |
| Pause, or close a panel | Esc, or the menu button top right | The menu button |

Clicking while the story is busy (a walk, a door) shows that the game is waiting and hurries the scripted move along. Every attempt does something visible.

While Eric is saying a word (its practice prompt, his voice, the answer), clicks and taps on people, things and markers, and E, are ignored, so the word isn't lost to a new talk. They work again as soon as the word is done or the prompt is cancelled.

## When each control is taught

On the train (game3d/js/onboard.js, notes/ONBOARDING.md for the design):

- At the start the screen shows only one line on walking ("W A S D or click the floor to walk" / "Tap the floor to walk"). It goes once Eric has walked a few steps and never comes back.
- No goal and no story hints until he has talked to a person. The first passenger he talks to nods at the free seat, and that gives the first goal.
- The action prompt drops its verb after two uses and its key cap after five.
- Say first shows only at the goal target (the cat), after Mio teaches おはようございます; after one use it shows wherever a word works.
- No Next, clock, People count or mute chip on the train.
- Onboarding state is kept in the browser, so a reload doesn't teach it all again; Start on the title resets it.

Every control is introduced the first time it's needed, and ambient people never block the player's path or clicks (Jørgen).

## The HUD

- The goal box, top left: the current goal on one line, always there until the player acts, re-readable. Tips (the Say tip, story hints) are a second line inside the goal box, never a separate box (Jørgen, 2026-09-29: "Put tips inside the goal box top left so we dont get so many places for this"). A tip has a close button; tapping the goal line brings a closed hint back. A side line under the goal is used for small side goals ("The vending machine is stuck.").
- Top right: the clock (date and period), People (count), Bag (count), Words (count), a mute button and the menu button. Each appears once it has something in it; none on the train.
- Markers: every interactable thing on screen, not just people, carries a pin: a circle with a symbol (speech for people, a paw for the cat, an eye for things) on a short line down to it (Jørgen, 2026-09-29: "the microscopic dots are not enough to indicate interactive elements... earlier you had a line and a circle with a symbol which was better"). No labels on pins; the action prompt has the name. The goal's pin is teal and larger. Pins further from Eric are smaller and paler, and where two would overlap only the one nearer to Eric shows. With no room above a target (under the HUD) the pin sits beside the head, never over the face. Things marked "no marker" in the engine show one only while they're the goal. Tapping or clicking a visible pin does what tapping its target does; a pin hidden by a nearer one takes no taps.
- The target in reach: its pin lights up and its line becomes a small bobbing pointer, and the model itself gets an outline; the model under the mouse gets the same outline on desktop. Nothing is drawn on the floor around the goal or the target, and no ring comes around the person being talked to (Jørgen, 2026-09-29: "the ring comes around any character that you are currently selecting / interacting with"; earlier the floor ring was "brutally ugly and overlaps the whole screen"). The pin and the outline are the only marks. The outline takes only the model's own meshes, never the shadow blob under a person or other helper meshes (Jørgen, 2026-09-29: it drew a big square under Mio).
- The action prompt beside the target: the name on top, then one row per action, with a key cap and the label in one type style, and a small pointer toward the target (Jørgen: "the interaction box is also not very pretty, not well designed"). One prompt per target, with interact and Say stacked; the current target is clearly marked.
- The Say button: lights up when the goal answers to a word Eric knows. The Say menu lists his phrases and commands with their icon, Japanese, reading and English, and the practice dots ([systems.md](systems.md)).
- The LED board at the top of the train car shows the station announcement.
- Emotes over heads (!, ?, …, ♪, heart, sweat, zzz) are big (Jørgen, playtest: "emotes much bigger").

## The dialogue box

- Direction 1, "faded" (Stage light, game3d/design/DIALOGUE-OVERLAY.md), approved by Jørgen, with a more solid grey band at the bottom on phone so the portraits' cut edge sits on solid colour.
- The speaker's portrait stands beside the box (desktop: large on the left; phone: smaller, above the box). Eric's shows smaller on the right on his lines, and the listener dims. Narration has no portrait. The faces are in [cast.md](cast.md).
- The name plate and role sit above the text. Japanese words show with reading and English; taught words can be clicked to hear them.
- The whole dialogue area moves the story on, including the empty space below the text; "Click to continue" shows for the first few lines. Eric's spoken lines finish before anyone replies (Jørgen, playtest).
- Choices: the buttons name their object ("Point at the briefcase"). Learning a word is typing it, not clicking a choice.
- Mio's texts show as phone messages on their own dark card.
- Scroll up or PageUp for the backlog (to build in game3d; it was in the VN).

## Panels and screens

- People: everyone Eric has met, with their bond step, what they remember and what he has learned about them ([systems.md](systems.md)).
- Bag: his yen and the drinks he's carrying.
- Words: the words he can say, each with its dictionary form and practice dots, and a note on the -te form ([words.md](words.md)).
- Title: the train seen from outside at dawn; on Start the camera flies into the car. Continue when there's a save.
- Pause (Esc): settings, the three save slots (save and Load), back to title. What loading restores: systems.md, Saving.
- Settings: text speed (default fast), auto-advance (off), volumes for master, music, voices and ambience, voices on or off, graphics tier (auto), surface detail, interface size, reduce motion, the Say key, voice input (device, browser or off), and how many tries a word needs before it's a click (3).
- A loading chip between places, if a place takes a moment to build.
- The end of the day: the places (a frame of each from play), the people met and the words he can use; the story's closing line; back to the title. No quiz and no score.
- The build id shows in a corner (game3d/build.json).

## Camera

- Top-down 3D, looking down at each place with its near walls cut away. Conversations zoom in on the person who matters, then back.
- The player character is always in view (Jørgen: the lift ride showed only the outside of the lift during a long sequence).
- Ceiling light fixtures are not shown in the top-down scenes (they get in the way); their light stays (Jørgen).

## Phone and desktop

- The phone layout is used when the screen is taller than it is wide (width to height under 0.8) or narrower than 640 px. Phone and desktop have separate layouts (GUIDE, Visual design).
- The UI scales with the screen: 1 at 1366 × 860 and up to 2 on large screens (QHD and 4K get a bigger UI by default), times the interface size setting. Phones keep 1.
- The game targets desktop first; Android comes later.
