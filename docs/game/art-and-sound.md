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
  - Rejected avenues: decals and wear (3), trim sheets (7). Code: game3d/js/look/ (design/style/AVENUES.md, "In the game").

## People in the world

- Eric and Mio are Meshy models (Jørgen, 2026-09-28: "of course we need Mio and Eric's Meshy models"): Eric from art/approved/mc/meshy/ (the game's copy is game3d/assets/eric-meshy/), Mio from art/approved/mio/meshy/. They only get colour tweaks; never reshape or re-model them. Accessories such as glasses and lanyards are left off the models.
- Everyone else is a chibi figure built in code (game3d/js/cast.js, game3d/js/train/people.js), about 2.8 to 3 heads tall. Mori's Meshy model is parked ([cast.md](cast.md)).
- New chibi pictures and 3D models are steered by tools/characters/ref/eric-chibi-ref.png and Jørgen's Mio chibi picture (Jørgen). The workflow that worked for Eric is in art/PROMPTS.md (3D characters).

## Portraits

The anime portraits beside the dialogue box. The faces each person has are in [cast.md](cast.md), Portraits; cut-outs use the refined matting (tools/matte_refine.py on BiRefNet-HR), which Jørgen approved.

| Id | Status |
|---|---|
| `mio` | Approved: the v3 faces, from art/approved/mio/mio-after.webp. The phone face is mio-phone-5's blendk25-3501-exact-3401-v2 (Jørgen, 2026-09-29: "close enough... dont stress it"). |
| `emi` | Approved: art/approved/emi/emi-after.webp. |
| `aoi` | Approved: art/approved/aoi/aoi-after.webp. |
| `kuro` | Approved: art/approved/kuro/kuro-after.webp. |
| `eric` | Neutral approved (2026-09-29): eric-r4-909 from reviews/eric-portrait-anime-5 (Jørgen: "perfect, just might need a crop to get to the same height as the other characters"). Cropped and scaled so his face box matches the one the game places him by (game3d/js/ui/portraits.js `FACE.eric`), cut out with BiRefNet-HR and tools/matte_refine.py, the glasses frame kept solid with `--opaque`. Height check: reviews/eric-portrait-final. Before this, eric-v2-734 (seed 734 v2) was approved on 2026-09-28; that old neutral is kept in art/production/eric-portrait-final/. His surprised and tired faces are still the old 734 style and need new faces from r4-909. The natural-pose portraits (neck, coffee) were rejected. Final game crop 25% bigger at the same chin height (reviews/eric-portrait-final-3, Jørgen: "looks good!"). Surprised s2-d70-1 and tired t3-d65-1 picked the same day (reviews/eric-expressions-1). `FACE.eric` takes its centre and chin from the face detector like everyone else's, but keeps the old crop's face height, so he stays 25% bigger; before 2026-09-29 his box was the old 734 crop's and put his face about 40 px left of the others' line at 1366x860. |
| `guard` | Provisional (the art agent's pick). |
| `mori` | Provisional (seed 713). |
| `kenji` | Provisional (seed 711, which Jørgen hasn't approved); new concept art is coming. |
| `kuroda` | Provisional (seed 721). |

## Voices

- Game voices are local Qwen3-TTS clones of a reference clip per character (references in tools/voice-refs/; `sh tools/voice/run.sh` voices every line with no clip, reusing tools/island_audio/'s checks). Each line's delivery comes from its `emo` tag (game3d/story/VOICE-DIRECTION.md).
- Mio: voice A (tools/voice-refs/mio-a.wav), low and slightly husky.
- Eric: voice design eric-2 with no accent (tools/voice-refs/eric-voice.wav). The Nordic accent was dropped (Jørgen: "not any better, just drop it, English accent instead").
- Japanese speakers speak Japanese; overheard lines play muffled ([systems.md](systems.md)).
- Loudness is normalised per character; Eric's voice is quieter.

## Music and sound

- Each place has a Lyria loop, crossfading into itself: the train `calm`, the lobby `lively`, the office `office`, after work `night`. Voices duck it.
- Each place has an ambience bed with occasional one-shots under the music; a kotodama dips it.
- No footsteps (Jørgen).
- The opening theme is "Mastered: softer" (art/approved/music/opening.mp3); game3d doesn't use it yet.
