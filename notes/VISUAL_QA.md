# Visual QA: the bar every screen is scored against

Written 2026-09-26 after Jørgen rated the Godot build's B2 screenshot 0/10: "a garbage heap of mismatched assets, portrait that doesn't fit its frame, placeholder people, horrible." From then on, nothing visual goes to Jørgen until it scores 8 or more here. The visual critic scores it and writes the result to island/qa/visual-review-NN.md.

The same evening the slice moved to the three.js HD-2D version in side/hd2d. Jørgen called it mind-blowing, and the Godot build atrocious. This version of the bar is for HD-2D:

- The Godot build's tile-only rules are retired: 3/4 tile projection, one pixel grid, floor-tile variants, wall faces and tops, the void around small maps, and pixel shadow sizes. Reviews 01 to 08 were scored against that earlier version, and their rule IDs refer to it. Each of those reviews describes its defects in full.
- Rules for materials, 3D light and shadow, billboard sprites and post effects are new.
- These rules came from Jørgen's feedback and keep their IDs and their cap of 5:
  - C14 (against the wall), C15 (no dead floor), A7 and the scale table, and scoring each room on its own. These followed his kitchenette note: "looks a mess, why is everything on the floor and half the room empty".
  - B9 (anime style), after he saw anime renders drift into a flat Western cartoon look.

Read with GUIDE.md and game/notes/map-design.md, which set the content, fullness, Japan cues and light plan. Where map-design gives sizes in tiles, read one tile as one metre. Light comes from the upper left everywhere, which overrides the 8:40 sun direction in map-design 6.

## How a review is done

1. Capture headless from the current source with the side project's tools (side/hd2d/README.md): tools/capture.mjs, run through tools/withlock.sh so it holds the GPU lock. Never open a window.
   - Capture at 1440 × 900, and at the phone size once the build has a phone layout.
   - Record the commit and the newest file time in side/hd2d/js.
   - Stills in ?capture mode are frame-exact. What only motion shows (sprite jitter, shimmer, flicker, focus breathing) gets a short clip from tools/video.mjs.
2. Look at each still at 1:1, then at 2× to 4× crops: each sprite and its feet, each prop cluster, the walls and floor, every light, every piece of UI.
3. Score the parts A to H, and each room or area on its own. The screen scores as its worst room. Apply the caps.
4. Name every defect precisely enough to fix without asking: where it is (pixel box on the capture, plus plain words), what's wrong, the file that causes it if known (room.js, kit.js, machines.js, sprites.js, render.js, ui.js), and the fix.

Art without UI (mockups, prop line-ups, illustrations) is scored on A, B (when people are shown), C, D, G and H. E and F are n/a and left out of the mean. On other screens a part is n/a only when there's nothing for it to judge.

## The scale

| Score | What it looks like |
|---|---|
| 10 | Could pass for a screenshot from a shipped HD-2D game (Octopath Traveler, Triangle Strategy, the Live A Live remake). |
| 9 | Shipped quality with one or two nits you have to hunt for. |
| 8 | Pass. As coherent and as full as the references; what's left is small and nobody notices it in play. |
| 7 | Coherent and dressed, with a few defects a player would notice. |
| 6 | One look throughout, but sparse, flat or badly composed. |
| 5 | Mostly one look, with a visible clash: a floating sprite, a material that reads as the wrong thing, blur over play. |
| 4 | Mixed kits, mixed light, mixed detail. |
| 3 | Real art mixed with placeholders or untextured boxes. |
| 2 | Greybox with a few real assets. |
| 1 | Greybox, plus visible bugs. |
| 0 | Broken: missing textures, wrong scene, unreadable. |

## How the score is worked out

Each part gets 0 to 10. Weights: A 2, B 2, C 2, D 2, E 2, F 1, G 1, H 1.

The screen score is the lowest of:
- the weighted mean, rounded down;
- the lowest part score plus 2;
- the lowest cap triggered.

Pass is 8 or more, which in practice needs every part at 6 or better.

## Caps

| Failure | Cap |
|---|---|
| A missing texture or asset: a black or magenta surface, a sprite drawn as a block, an image that fails to load | 2 |
| A placeholder in view: an untextured box standing in for furniture, a stand-in character | 3 |
| A person drawn with art that isn't the approved cast | 3 |
| Raw markup, tofu boxes, broken ruby or debug text on screen | 3 |
| A portrait squashed, stretched, or cropped through the face | 4 |
| Two text boxes at once: a bubble plus a box for one line, a name with no text, a box stacked on the command bar | 4 |
| A sprite that doesn't stand in the room: floating above the floor, sinking into it, sliding while walking, or drawn over something in front of it | 5 |
| A sprite at a fractional scale or filtered soft | 5 |
| Physical nonsense: a window to the outside in the basement, geometry through geometry, holes or backfaces in view | 5 |
| Post effects over play: blur, bloom or glare hiding or washing out the player, the speaker, the story prop or text that must be read | 5 |
| UI covering the player, the speaker, the story prop or the exit during a beat | 5 |
| A fixture that belongs against a wall standing away from it (C14) | 5 |
| A room with more dead floor than C15 allows | 5 |
| Furniture, a fixture or a machine outside its size in the scale table (A7) | 5 |
| An anime image with a style score of 5 or less (B9) | 5 |
| Out-of-period hero props: flat screens on the steel desks, mesh chairs, glass and neon | 6 |

## A. Coherence and materials (weight 2)

Everything on screen looks like one artist made it in one week.

- A1 One kit. All geometry has one level of detail (bevelled edges on everything or nothing), and the textures share one treatment and one texel density. No blurry low-res texture next to a crisp one, no stretched UVs, no prop far more detailed than its neighbours.
- A2 Materials read as what they are, and each material looks the same everywhere it's used:
  - painted steel is matte and worn at the edges;
  - vinyl and lino tile have a low sheen, and carpet tile none;
  - wood, cardboard and beige plastic read as themselves;
  - glass reflects and shows what's behind it;
  - CRT screens are curved glass that glows when on.
  Nothing is chrome or glossy plastic that shouldn't be.
- A3 Real texture scale, and no visible repeats. P-tiles are 30 cm; office and carpet tiles 50 cm; ceiling tiles 60 cm. Floors have wear and variants, so no pattern repeats at the camera's distance, and nothing shimmers or makes moiré when the camera moves.
- A4 One palette: three or four main hues per room plus one accent on the story prop. Nothing but a light source is brighter or more saturated than the story prop.
- A5 While the characters are pixel sprites, they stay pixel art: a whole-number scale with nearest filtering, and no sub-pixel jitter while walking. The room's textures may be smooth or pixelated, but one way for the whole room. Whether pixel characters fit a smooth 3D room at all is B10.
- A6 One light direction (decided 2026-09-26). The key light comes from the upper left, matching the light baked into the sprites, and cast shadows fall down and to the right.
- A7 One scale. The room is built in metres, and every piece matches its real size in the scale table at the end of this file.
  - The cast stand 1.55 m. main.js places the camera so that an upright 1.55 m projects to the sprite's 96 px.
  - Check the sizes in the code (kit.js, machines.js, and any scale factors in room.js), and on screen against a door (2.02 m) or a sprite.
  - From the 46° camera, a box's top face adds to its silhouette. Compare the front face with the sprite, not the whole outline.
  - The cap applies to furniture, fixtures, floor machines, doors and lifts. Smaller things out of range count against this score.

## B. Characters (weight 2)

- B1 Every person is an approved cast sprite (island/godot/assets/pixel/chars, the i02 recipe), or whatever Jørgen picks later.
- B2 A named character's sprite matches their portrait.
- B3 Grounding: the feet stand on the floor at the projected foot point, with two shadows. One is a small dark contact shadow right under the feet; the other is the silhouette shadow falling down and to the right (sprites.js). No gap, no sinking, no sliding while walking.
- B4 Depth: whatever stands in front of a sprite hides it (a desk, a chair, a CRT), and nothing behind it is drawn over it. Someone seated is cut at the waist by their desk.
- B5 Every sprite is drawn at the same whole-number scale at every depth. Their drawn view (low top-down) agrees with the camera's 46° pitch.
- B6 Light: sprites take the room's light, dim in the dark and tinted by nearby coloured light such as the exit sign's green. The face and silhouette still read against what's behind them. No lit tube, glowing screen or bloom sits right behind a face.
- B7 Pose fits the beat. The speaker faces the listener, and someone at a desk sits at it.
- B8 Dialogue portraits:
  - only approved ones appear;
  - expressions keep everything but the face identical to their base image;
  - cutouts are clean;
  - the portrait is graded toward the room's light, so a brightly lit figure isn't pasted over a dark night room;
  - the picture agrees with the line.
- B10 The characters belong in the room. They are drawn the way the room is drawn: lit and shaded by its light, at its level of detail, and grounded in it.
  - Jørgen on the 48 px sprites in the 3D room (2026-09-26): "the pixel art doesnt really jive with the 3d environment". The character look for the 3D version stays open until he picks from tests in the actual room. The 3D figures agent is testing 3D models of Mio in side/hd2d/figures.html.
  - Until he picks, B for pixel sprites in the 3D room scores at most 6. That puts his verdict in the score without capping the screen.
  - The rules that exist only for pixel sprites (A5, B5's whole-number scale, the filtered-sprite cap) apply while pixel sprites are in use.
- B9 Anime style (portraits, dialogue backgrounds, illustrations, photos). Put each image side by side with the approved references at the same height: the portraits in proto2/cast-fixed/*-after.webp and the sprites in art/island/export/sprites for people; the approved location paintings (office-reverse-5202-fix-a, copyroom-copier-4203, gate-lobby-2103, dorm-worst-c) for backgrounds.
  - Score three things, each 0 to 10, and take the lowest as the image's style score.
  - Line weight: black linework that varies, with a firm outer contour and thinner interior lines. A uniform heavy outline around every shape is drift.
  - Shading: cel shading in two or three tones, soft gradients, and in backgrounds texture, grime and light falloff. Flat fills, hard gloss streaks, neon vector gradients and graphic light or shadow shapes are drift.
  - Face and identity: the house face and the character's approved features: hair, eye colour, glasses, beard, outfit, lanyard.
  - Below 8 is drift, and the image goes back for a redo. A screen showing an image at 5 or less takes the cap.
  - Reward images in island/private/rewards get the same check, but their review goes only to island/private/rewards/qa-rewards.md, never anywhere public. island/private/user is never opened (island/PRIVATE.md). The critic reads the rewards folder only if Jørgen's permission settings allow it.

## C. Composition and fullness (weight 2)

From map-design.md sections 1 to 3 and 8, with tiles read as metres.

- C1 The room is sized for its use.
- C2 Fullness, counted on the floor in 1 m cells:
  - rooms 40 to 55% dressed;
  - halls and lift lobbies 25 to 45%;
  - corridors 10 to 20%, with the long wall dressed every 1 to 3 m;
  - outdoors 25 to 35%.
- C3 Longest bare run: 5 m in rooms; 8 m in halls, corridors and entrances, and only where a pattern, marking or light pool breaks it; 9 m outdoors.
- C4 Props cluster in groups of 2 to 5 around an activity, with clear floor between the groups. A desk has its monitor, keyboard, mug, papers and a chair pushed out.
- C5 No rows of identical props. Each group has an odd one out, and rows only where the real place has them (G36 on the moodboard is the trap).
- C6 No mirror symmetry around the door or the centre line.
- C7 One landmark per view. The story prop gets the hero light and the room's accent colour.
- C8 A player can tell where they are within about 15 seconds.
- C9 Three to five "what happened here" details per room.
- C10 The diorama reads:
  - the back walls carry the detail;
  - cut walls show a clean edge and their thickness;
  - the surround is dark with a vignette;
  - the frame never cuts off a story point.
- C13 Routes: main routes 1.2 m clear, side routes 0.8 m, and 0.8 m clear in front of everything the player uses.
- C14 Against the wall. Things that stand against a wall in a real room stand against one here: counters, sink units, fridges, shelves, cupboards, cabinets, filing cabinets, lockers, copiers, vending machines, water coolers. The cap applies to these.
  - No floor shows between the piece and the wall: 10 cm at most, the air gap a copier or fridge really keeps.
  - Pieces along one wall stand side by side as one run, not as islands.
  - Nothing stands in front of a fixture people use.
  - Only things that really stand free stand in the open: the desk island, tables, a coat rack, a fan, bins, a mobile whiteboard, boxes waiting to be moved.
- C15 No dead floor. In a room people work or live in, count the floor in 1 m cells.
  - A cell is used if it has a prop, a person, a mat, the entrance, the clear space in front of something used, or a route. Every other empty cell is dead; stains, papers and light pools don't count as use.
  - Dead floor is at most a quarter of a room of 30 m² or less, and at most a third of a larger room. No dead block is bigger than 2 × 2 m.
  - A small room with its fixtures along one wall is at most two rows deep, about 1.6 m.
  - A failing room gets what a real room has in that spot, or gets smaller.
  - The review writes the count for each room.

## D. Light, shadow and post (weight 2)

- D1 Base light and time of day follow map-design 6: B2 by day about 70% and cool green-grey; B2 at night 12 to 15%; the dorm at night about 40% and blue.
- D2 Every light has a visible source, and every source lights something:
  - tubes light a pool under them;
  - CRTs glow on their desks;
  - the exit sign spills green, and a vending machine glows.
  There's one hero light, on the story prop. Dark corners are good; a room lit evenly from wall to wall fails.
- D3 Overhead fittings read as overhead. With the ceiling cut away, a fitting shows its housing and hangs from something (rods, or a ceiling edge along the back wall), or only its light shows. A lit bar floating over the floor at head height fails.
- D4 Shadows agree with the one key light (down and to the right), with soft contact shadows (AO) where things meet the floor and walls. No acne or striping, no shadow detached from its base, no shadow from a light that isn't there.
- D5 Post effects serve the picture:
  - Depth of field and tilt-shift blur only the edges of the diorama: foreground props and the top of the back wall. The player, the speaker, the story prop and any text to read stay sharp.
  - Bloom glows around light sources only, and never washes out a face or text.
  - The grade keeps the room's colour temperature (B2 cool green-grey) and skin tones natural, with no crushed blacks hiding play.
  - The vignette darkens the corners without hiding play.
  - Grain and chromatic aberration stay subtle: grain invisible at 1× on a phone, and colour fringes under 2 px at the frame edge.
  - AO darkens contact areas without dark halos around sprites or thin props.
- D6 In motion: no flicker except the designed one (the dying tube), no shimmering edges, no focus breathing while nothing moves.

## E. UI over the scene (weight 2)

- E1 Nothing covers play. During a beat the player, the speaker, the story prop, the exit and the thing being talked about stay visible.
- E2 One box per line. No bubble plus a box, and no box with a name and no text.
- E3 Portraits show the whole face with room above the hair, keep their aspect ratio, and are cut on purpose by the frame, not at random by a box. No chips that cut through the forehead or the eyes.
- E4 One design language across the objective card, the command bar, the chips, the dialogue box, the notebook and the end card: one type scale, one corner radius, one set of colours and borders. No glows, brown, gold or serif (GUIDE, Visual design).
- E5 World-anchored UI (hover tags, speech bubbles, the eye marker, the glowing kana) sits by what it marks at a steady offset. It never covers a face, the story prop or another tag, and doesn't jitter as the camera moves.
- E6 The HUD stays in a safe margin, off map content the player needs.
- E7 Choices keep the option text and its select button apart (GUIDE, Learning rules), line up, and have no clipped text.
- E8 When the build has a phone layout, a dialogue scene fills the screen, and nothing from another place shows below it. A capture where a panel covers the whole game while the story moves on underneath isn't scored.

## F. Text rendering (weight 1)

- F1 No raw markup or codes: no {tags}, [ruby], <b>, \n, %s or line ids.
- F2 Ruby sits centred over its kanji, smaller than the base text, and never clipped. Katakana always shows its reading (GUIDE, difficulty rule 4, 2026-09-26). Hiragana never gets ruby.
- F8 The text follows the GUIDE's difficulty rules (2026-09-26):
  - English carries every line, and only the words being learned appear in Japanese inside it.
  - A new word shows its reading and meaning right there, so nothing needs a click.
  - The support fades as the word is learned: meaning first, then reading.
  - A line with Japanese the player hasn't been given yet, or that needs a click to follow, is a defect.
- F3 No tofu or missing glyphs. One Japanese font per box, and Latin and Japanese share a baseline.
- F4 Line breaks leave no single character alone on the last line, never split a word or a kanji from its okurigana, and nothing runs out of its box.
- F5 Text in the world (signs, plates, labels, the copier's display) is real Japanese in the world's textures. It's crisp at the camera's distance and not blurred by depth of field when it has to be read. No fake kanji and no pseudo-letters (map-design 7).
- F6 UI chrome uses digits and kana until the words are learned (GUIDE, Learning rules).
- F7 Text keeps a contrast of at least 4.5:1 against what's behind it.

## G. Period and place (weight 1)

The company building is a 1990s to 2000s Japanese office, neither modern nor sci-fi. Jørgen rejected CrossCode's office as a reference for this reason.

- G1 Period kit:
  - grey steel desks in facing islands, with the manager's desk across the end;
  - beige CRTs and PC towers, a fax, desk phones with coiled cords;
  - steel filing cabinets, and cabinets with sliding glass doors and binders;
  - the in/out board with name magnets, fluorescent tubes;
  - vinyl P-tiles or grey carpet tiles.
- G2 Out of period: flat-panel monitors, laptops on every desk, mesh chairs, glass pods, LED strips, neon, holograms.
- G3 Japan cues where the plan puts them: the 消火器 plate, the green running-man exit sign, the 消火栓 cabinet with its red lamp, door plates, 止まれ laid along a lane.
- G4 Place logic. B2 has no windows and no daylight: Jørgen had the window removed from the approved office painting. Blinds belong only on interior glass, with the corridor visible behind them.

## H. Next to the references (weight 1)

- For the HD-2D look: Octopath Traveler (G15 and G16 on the moodboard), Triangle Strategy, the Live A Live remake.
- For how full an office is: LimeZu's Modern Office preview (limezu.itch.io/modernoffice; environments only, and its flat screens are out of period).
- For light: G03, G20, G23 and G28 on the moodboard.
- For this room's content and mood: the approved office painting (office-reverse-5202-fix-a).

H scores:
- 10: could sit next to Octopath Traveler's interiors;
- 8: as coherent and as full as those, at LimeZu's density;
- 6: coherent but emptier;
- 4: mixed;
- 2: greybox.

## Before a new asset set is reviewed

- A prop set comes with a line-up render: each prop at the game's camera angle beside a standing sprite and a 2.02 m door, with its size in metres. A set without one isn't reviewed.
- A prop with states (dead, working, jammed, done; open and closed) is checked state by state:
  - Only what the state changes may differ. The same wear and colours stay in every state.
  - A state that means off must read as off, with no lit display and no lit buttons.
- A mockup that passes is a pass for that art in that layout. The game's own screens are still scored from a capture.

## Scale table (A7)

Added 2026-09-26 after Jørgen asked whether the kitchenette's counters were undersized cupboards; they were. It was restated in metres when the slice moved to HD-2D, whose kit is built in real units.

Sizes are the piece's own body: its height to the top surface, without what stands on it.

| Piece | Width, m | Height, m | Note |
|---|---|---|---|
| Cast, standing | | 1.55 | the reference (main.js chibiH) |
| Door in a wall | 0.8-0.9 | 2.0-2.1 | the door in machines.js is 0.9 × 2.02 |
| Desk | 1.0-1.4 | 0.70 | depth 0.7; the desk in kit.js is 1.2 × 0.7 × 0.7 |
| Office chair | 0.5-0.6 | 0.42-0.46 to the seat, 0.85-1.0 to the top of the back | |
| Counter, sink unit, coffee counter | 0.45-0.9 per unit | 0.80-0.85 | depth 0.6; a longer run is whole units side by side |
| Side table, work table | 0.4-1.8 | 0.70 | |
| Small fridge | 0.45-0.6 | 0.85-1.4 | |
| Low cabinet, 2- or 3-drawer filing cabinet | 0.4-0.9 | 0.70-1.05 | |
| 4-drawer filing cabinet | 0.4-0.5 | 1.30-1.35 | |
| Tall cabinet, shelf, locker, server rack | 0.6-0.9 per unit | 1.8-2.1 | |
| Vending machine | 0.8-1.0 | 1.8-1.85 | |
| Floor copier | 0.6-1.2 | 1.0-1.3 | the room's copier is 1.15 × 1.10 |
| Water cooler | 0.3-0.35 | 1.1-1.3 with the bottle | |
| Coat rack | 0.4-0.5 | 1.7-1.8 | |
| Standing fan | 0.35-0.45 | 1.0-1.3 | |
| Lift doors | 0.8-1.1 opening | 2.0-2.1 | |
| Bench | 1.2-1.8 | 0.42-0.45 to the seat | |
| Waste bin, can bin | 0.25-0.4 | 0.3-0.6 | |
| CRT on a desk | 0.35-0.45 | 0.35-0.45 | |
| PC tower | 0.18-0.2 | 0.35-0.45 | |
| Mobile whiteboard | 1.2-1.8 | 1.7-1.9 overall | |
| Single bed | 0.9-1.0 | 0.4-0.5 | length 1.95-2.0 |
| Ceiling | | 2.4-2.7 | tubes hang just below it |

- Things that must be read or found at a glance may be drawn up to twice their real size: plates, signs, notices, clocks, calendars, the in/out board, the exit sign, the 消火器 plate.
- Tolerance: a piece is out of range when it's off by more than 10%.
- A piece not in the table is judged against the real thing, and its row is added the first time it comes up.

## Decided

- Light direction (2026-09-26): upper left everywhere, shadows down and to the right.
- The slice moved to the three.js HD-2D version (2026-09-26). The Godot build's tile rules are retired.

## Open conflicts (not scored until decided)

- The approved office painting has flat LCD monitors, which the 90s brief rules out. That's Jørgen's call: keep the painting, or repaint the monitors as CRTs.
- In-world speech bubbles and dialogue scenes with large portraits are two designs for the same job. The HD-2D room uses both: bubbles for short lines, portraits for conversations. E3 applies to both.
