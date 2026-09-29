# Art and sound

How the world and the people look and sound in the game, and which art and voices are approved. Pointers to the decisions; prompts and methods stay in art/PROMPTS.md and GUIDE (Art, Voices and audio). Last checked on 2026-09-29.

Elsewhere: every approved file is listed in art/approved/README.md, and the bible (http://127.0.0.1:8771/bible/) has each person's art history and candidates. Each person's approved look in words is in [cast.md](cast.md).

## The world

- Flat-shaded, simple 3D is "the only valid option" (Jørgen, 2026-09-27): low-poly shapes, no textures, one colour per face, a strong palette and real light. The detailed HD-2D rooms and tile pixel art are out; painted backgrounds with depth parallax and a cutaway-building overview were rejected.
- In game3d: cute, soft-shaded chibi 3D in the style of Jørgen's references in game3d/ref/ (1-train-arrival.png, 2-security-gate.png, 3-office.png): rounded blocky figures, pale floors, warm window light (Jørgen, 2026-09-28).
- Palette: game3d/ref/2-security-gate-muted.png is the target for the lobby, the office and the train, "less playful vibrant" to match the office: slate and charcoal greys, dark navy benches, a dim cool interior with warm light from wall lamps and windows, long soft shadows, muted plants. The train got the same palette in colours and light only.
- The office is a 90s to 00s Japanese office, not sci-fi: steel desks in islands with the section head's desk across the end, beige CRT monitors, a fax, filing cabinets and binders, an in/out board, venetian blinds, grey carpet tiles, a 給湯室 with an electric thermos pot.
- Environment style is open (Jørgen, 2026-09-28: soft is good but "extremely plain, like straight out of Blender with zero texture but a base colour"). A style study aims at the polish of our anime art (reference art/refs/style-target-kuro-pose-s202.webp: ink lines, cel shading, navy shadows, bright window light). Verdict on painted cel (2026-09-29): it "looks more like evening... doesn't add the texture to the world I was hoping for"; he wants the theoretical options written up as text to decide.
- Floors must not show doubled tile grids.
- Surface patterns on every model, softer baked light and small modelled detail in props (Jørgen, 2026-09-29, review style-avenues-room): for now in GUIDE, Visual design, "World look"; it moves here once that edit is committed.

## People in the world

- Eric and Mio are Meshy models (Jørgen, 2026-09-28: "of course we need Mio and Eric's Meshy models"): Eric from art/approved/mc/meshy/ (the game's copy is game3d/assets/eric-meshy/), Mio from art/approved/mio/meshy/. They only get colour tweaks; never reshape or re-model them. Accessories such as glasses and lanyards are left off the models.
- Everyone else is a chibi figure built in code (game3d/js/cast.js, game3d/js/train/people.js), about 2.8 to 3 heads tall. Mori's Meshy model is parked ([cast.md](cast.md)).
- New chibi pictures and 3D models are steered by tools/characters/ref/eric-chibi-ref.png and Jørgen's Mio chibi picture (Jørgen). The workflow that worked for Eric is in GUIDE, Art.

## Portraits

The anime portraits beside the dialogue box. The faces each person has are in [cast.md](cast.md), Portraits; cut-outs use the refined matting (tools/matte_refine.py on BiRefNet-HR), which Jørgen approved.

| Id | Status |
|---|---|
| `mio` | Approved: the v3 faces, from art/approved/mio/mio-after.webp. The phone face is to build. |
| `emi` | Approved: art/approved/emi/emi-after.webp. |
| `aoi` | Approved: art/approved/aoi/aoi-after.webp. |
| `kuro` | Approved: art/approved/kuro/kuro-after.webp. |
| `eric` | Under review. eric-v2-734 (seed 734 v2) was approved on 2026-09-28 and tired-v3 seed 811 was his pick; then (2026-09-29) he asked for "the OLD, ANCIENT, first ones that looked like anime figure, rather than this graphic novel style. All the other characters are Japanese anime style except him." The game uses 734 until a new round is picked (reviews/eric-portrait-anime-3). The natural-pose portraits (neck, coffee) were rejected. |
| `guard` | Provisional (the art agent's pick). |
| `mori` | Provisional (seed 713). |
| `kenji` | Provisional (seed 711, which Jørgen hasn't approved); new concept art is coming. |
| `kuroda` | Provisional (seed 721). |

## Voices

- Game voices are local Qwen3-TTS clones of a reference clip per character (references in tools/voice-refs/, pipeline in tools/island_audio/). Each line's delivery comes from its `emo` tag (game3d/story/VOICE-DIRECTION.md).
- Mio: voice A (tools/voice-refs/mio-a.wav), low and slightly husky.
- Eric: voice design eric-2 with no accent (tools/voice-refs/eric-voice.wav). The Nordic accent was dropped (Jørgen: "not any better, just drop it, English accent instead").
- Japanese speakers speak Japanese; overheard lines play muffled ([systems.md](systems.md)).
- Loudness is normalised per character; Eric's voice is quieter.

## Music and sound

- Each place has a Lyria loop, crossfading into itself: the train `calm`, the lobby `lively`, the office `office`, after work `night`. Voices duck it.
- Each place has an ambience bed with occasional one-shots under the music; a kotodama dips it.
- No footsteps (Jørgen).
- The opening theme is "Mastered: softer" (art/approved/music/opening.mp3); game3d doesn't use it yet.
