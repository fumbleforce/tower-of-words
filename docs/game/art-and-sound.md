# Art and sound

The world is flat-shaded simple 3D with surface patterns, soft baked light and small modelled detail; Eric and Mio are Meshy models, everyone else is a chibi built in code. Also here: each portrait's status (approved or provisional), the approved voices (local Qwen3-TTS clones), and music and sound per place. Prompts and methods are in art/PROMPTS.md and art/SOUND.md. Last checked on 2026-09-29.

Elsewhere: every approved file is listed in art/approved/README.md, and the bible (http://127.0.0.1:8771/bible/) has each person's art history and candidates. Each person's approved look in words is in [cast.md](cast.md).

## The world

- Flat-shaded, simple 3D is "the only valid option" (Jørgen, 2026-09-27): low-poly shapes, no textures, one colour per face, a strong palette and real light. The detailed HD-2D rooms and tile pixel art are out; painted backgrounds with depth parallax and a cutaway-building overview were rejected.
- In game3d: cute, soft-shaded chibi 3D in the style of Jørgen's references in game3d/ref/ (1-train-arrival.png, 2-security-gate.png, 3-office.png): rounded blocky figures, pale floors, warm window light (Jørgen, 2026-09-28).
- Palette: game3d/ref/2-security-gate-muted.png is the target for the lobby, the office and the train, "less playful vibrant" to match the office: slate and charcoal greys, dark navy benches, a dim cool interior with warm light from wall lamps and windows, long soft shadows, muted plants. The train got the same palette in colours and light only.
- The office is a 90s to 00s Japanese office, not sci-fi: steel desks in islands with the section head's desk across the end, beige CRT monitors, a fax, filing cabinets and binders, an in/out board, venetian blinds, grey carpet tiles, a 給湯室 with an electric thermos pot.
- Environment style is open (Jørgen, 2026-09-28: soft is good but "extremely plain, like straight out of Blender with zero texture but a base colour"). A style study aims at the polish of our anime art (reference art/refs/style-target-kuro-pose-s202.webp: ink lines, cel shading, navy shadows, bright window light). Verdict on painted cel (2026-09-29): it "looks more like evening... doesn't add the texture to the world I was hoping for"; he wants the theoretical options written up as text to decide.
- Floors must not show doubled tile grids.
- The approved world look (Jørgen, 2026-09-29, reviews style-avenues-room and style-in-game), on top of the flat colours in every place:
  - Surface patterns on every model, props included ("so also the chair, flower pot gets it"): tiles with per-tile shade and chips, plaster clouds, brushed metal, desk grain, fabric weave, glazed pots and mugs, card, painted doors, concrete and stone. The people keep their flat colours. It is a switch in Settings > Graphics > Surface detail, on by default. Verdict on the game shots: "looks good".
  - Baked light in a softer version (the first was "over the top hard"): corners, wall bottoms, under desks and around feet a little darker, faces toward the light a little warmer, repeated props slightly different tints. Verdict: "good".
  - Small modelled detail as in the showcase: keyboards, trays, pen cups and drawer handles on desks, five-star chair bases, pot rims with saucers and pebbles, panelled doors with handles and hinges, skirting and wall caps, shelves, filing cabinets, mugs with handles. Verdict: "great".
  - Static geometry in the train, the gate, the office and the outdoor chunks is batched after its surface and lighting treatment; its shapes and detail stay the same. The office's cup tray keeps its original draw order, and interactive models remain selectablee. Lift cutaway materials belong only to the nearby landing meshes, so distant props can share batches.
  - Lighter on phones (Jørgen, 2026-09-29, review office-perf: "Fix now, lighter look on phone allowed"): in the office only people cast sun shadows; the furniture is grounded by its contact footprints and baked light. On the train the passengers and the cat keep their blob shadows but cast no sun shadow (Eric and Mio still do). Medium graphics, what a phone picks by default, has no ambient occlusion on a phone; bloom, the tilt-shift and the outline stay. Desktop is unchanged.
  - Rejected avenues: decals and wear (3), trim sheets (7). Code: game3d/js/look/ (design/style/AVENUES.md, "In the game").

## People in the world

- Eric and Mio are Meshy models (Jørgen, 2026-09-28: "of course we need Mio and Eric's Meshy models"): Eric from art/approved/mc/meshy/, Mio from art/approved/mio/meshy/. They only get colour tweaks; never reshape or re-model them. Accessories such as glasses and lanyards are left off the models.
- Mio, Eric and Mori use the approved `relaxed-3` idle (reviews/creator-idle-neutral-3, Jørgen, 2026-09-29: "looks good"): relaxed arms, visible chest breathing and torso sway over a four-second loop. It replaces the frozen walk pose; walk and sit clips stay the same. Native rig exports are in game3d/assets/characters/relaxed-idle-*.json. Each keeps its own bind axes and proportions, with the soles grounded; tools/characters/export-approved-idle.mjs bakes additional Meshy cast by ID.
- People with walk clips walk when the story moves them, however fast: a hurried walk is the walk clip played faster (Jørgen, 2026-09-30: "as we exit the train, mio is running rather than using the female walk. looks strange."). They only run when a story walk says `run: true`. Eric runs when the player runs him ([controls-and-ui.md](controls-and-ui.md)).
- Everyone else is a chibi figure built in code (game3d/js/cast.js, game3d/js/train/people.js), about 2.8 to 3 heads tall. Mori's Meshy model is parked ([cast.md](cast.md)).
- New chibi pictures and 3D models are steered by tools/characters/ref/eric-chibi-ref.png and Jørgen's Mio chibi picture (Jørgen). The workflow that worked for Eric is in art/PROMPTS.md (3D characters).

## Portraits

The anime portraits beside the dialogue box. The faces each person has are in [cast.md](cast.md), Portraits; cut-outs use the refined matting (tools/matte_refine.py on BiRefNet-HR), which Jørgen approved.

| Id | Status |
|---|---|
| `mio` | Approved: the v3 faces, from art/approved/mio/mio-after.webp. The phone face is mio-phone-5's blendk25-3501-exact-3401-v2 (Jørgen, 2026-09-29: "close enough... dont stress it"). |
| `emi` | Approved (2026-09-30): emi-base-2001 from reviews/style-align-1 (the cast redrawn toward Mio and Kuro). Files and how they were made: art/candidates/portraits/cast-faces-1. Before: art/approved/emi/emi-after.webp. |
| `aoi` | game3d/assets/portraits/aoi-neutral.webp: aoi-base-2001 (reviews/style-align-1, the chest patch a pink star) with the cream edge on her left side redrawn as fill-d65-s1 (reviews/aoi-edge-2). Before: art/approved/aoi/aoi-after.webp. |
| `kuro` | game3d/assets/portraits/kuro-neutral.webp: art/approved/kuro/kuro-after.webp extended down to the waist as kuro-body-c-s11 (reviews/kuro-body-1), shown at size 0.85. |
| `eric` | Approved (2026-09-30): eric-ink-2001 from reviews/style-align-1, the r4-909 portrait (reviews/eric-portrait-anime-5) redrawn toward Mio and Kuro. Surprised and tired are face-only repaints of it with the glasses frame pasted back (surprised-d70-3, tired-d65-2, picked by Claude; cast-faces-1). Same framing as before: 648x768, the face 25% bigger than the others at the same chin height (reviews/eric-portrait-final-3, eric-canvas-1); `FACE.eric` takes its centre and chin from the face detector and keeps the old face height. Cut out with BiRefNet-HR and tools/matte_refine.py, the glasses frame kept solid with `--opaque`. Copies in art/approved/mc/. Before: r4-909 (2026-09-29, with faces s2-d70-1 and t3-d65-1 from reviews/eric-expressions-1); before that eric-v2-734 (seed 734 v2) was approved on 2026-09-28. The natural-pose portraits (neck, coffee) were rejected. |
| `guard` | Approved (2026-09-30): guard-ink-2001 from reviews/style-align-1, with the garbled letters on his name plate, shoulder patch and collar pin repainted blank (cast-faces-1). Stern and amused are face-only repaints of it (stern-d70-1, amused-d70-1, picked by Claude). |
| `mori` | Approved (2026-09-30): mori-new-713 from reviews/npc-base-1 (no cup), in his own style as Jørgen chose on style-align-1 ("keep current"). Smile and flustered are face-only repaints of it (smile-d70-3, flustered-d70-3, picked by Claude; cast-faces-1). |
| `kenji` | Approved (2026-09-30): kenji-ink-2001 from reviews/style-align-1, redrawn from concept h4 (reviews/kenji-concept-3, Jørgen: "looks nice") toward Mio and Kuro. Grin and sheepish are face-only repaints of it with blush in the negative (grin-nb-d80-1, sheepish-nb-d80-3, picked by Claude; cast-faces-1). Copies in art/approved/kenji/. Before: the h4 faces of reviews/kenji-expressions-1 and kenji-noprop-1. The 711 stand-in is gone. |
| `kuroda` | Approved (2026-09-30): hamada-new-743 from reviews/npc-base-1 (no briefcase), in his own style as Jørgen chose on style-align-1. Sleepy and panicked are face-only repaints of it (sleepy-d70-2, panicked-d70-2, picked by Claude; cast-faces-1). |

## Voices

- Game voices are local Qwen3-TTS clones of a reference clip per character (references in tools/voice-refs/; `sh tools/voice/run.sh` voices every line with no clip, reusing tools/island_audio/'s checks). Each line's delivery comes from its `emo` tag (game3d/story/VOICE-DIRECTION.md).
- Mio: voice A (tools/voice-refs/mio-a.wav), low and slightly husky.
- Eric: voice design eric-2 with no accent (tools/voice-refs/eric-voice.wav). The Nordic accent was dropped (Jørgen: "not any better, just drop it, English accent instead"). His Japanese words are read in Japanese with the same clone, so they sound right with a light foreign voice (Jørgen, 2026-09-30: "if it is possible to make eric pronounce it correctly that would be the best. Now he says Tomato rather than Tomatte").
- Japanese speakers speak Japanese; overheard lines play muffled, subtitled ones clear ([systems.md](systems.md)).
- Japanese inside an English line (Mio's 待って, おはようございます, 外人) is said natively: the Japanese is its own Japanese take in the speaker's clone, spliced into the English line (Jørgen, 2026-09-30: "she sometimes says the japanese words with an english accent like Matte in the office scenes"). How: the voice-clips skill.
- Loudness is normalised per character; Eric's voice is quieter.

## Music and sound

- Each place has a Lyria loop, crossfading into itself: the train `calm`, the lobby `lively`, the office `office`, after work `night`. Voices duck it.
- Each place has an ambience bed with occasional one-shots under the music; a kotodama dips it.
- Each door has its own sound: the train doors, the station's glass entrance doors, the lift doors (after the lift's ding when they open) and the gate's flaps. The copier running, the kettle pouring and a can dropping in the vending machine have theirs too. No crowd sound: the ambience bed carries the people.
- The dorm courtyard no longer plays the sento humming. The two files (`bath_first`, `bath_answer`, made by tools/feel/hum.py) are still in the sound set.
- A phone buzzing, a bag's zip and a clean electric guitar played by a learner, heard through a phone speaker or a lifted headphone, are synthesised the same way (tools/feel/pluck.py).
- No footsteps (Jørgen).
- The opening theme is "Mastered: softer" (art/approved/music/opening.mp3); game3d doesn't use it yet.
