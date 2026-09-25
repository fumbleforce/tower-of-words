# Anime opening: research notes (2026-09-25)

What the opening at proto2/opening borrows from real TV openings, and how each trick works with still art. The code is in proto2/opening/, the art pipeline in tools/opening/.

## How TV openings are built
- 89–90 s, cut to the song's structure: intro (world, often sky or a vehicle), verse 1 (daily life, the hero), a pre-chorus build (faster cuts, a close-up), chorus (the big reveal: the city, the team, the run), a short bridge (roll call, silhouettes), last chorus, and a title logo on the final hit. Most TV openings are storyboarded by the series director or a guest director (Sakuga Blog, "Who comes up with anime's openings", 2025), and many are more cut-driven than animated.
- Cuts land on downbeats; flashes, whip pans and impact frames land on snare hits or vocal accents. Chorus shots get shorter (often a bar or half a bar); verse shots hold for 2–4 bars.
- Budget tricks that still read as "real anime": hold-and-move (a still with a slow camera move), pans across tall or wide background art (the sky-to-ground tilt that opens a lot of Kyoto Animation work, like Hibike! Euphonium), slide-ins of character cut-outs over flat colour or graphic backgrounds, speed lines behind a still pose, and cast silhouettes in a row lit up one by one.
- Studio habits worth copying: Kyoto Animation openings use soft light, lens flare and bokeh, and track the lyrics closely (a lyric about a window shows a window). Trigger openings use flat colour cards, big kinetic type, hard cuts, and frames that change colour on the beat. MAPPA openings mix in photographic camera grammar: rack focus, handheld drift, chromatic aberration, and hard lighting.
- Title cards: the logo usually lands on the last big hit, over sky or white, often assembling from pieces (strokes, a light sweep, or a shine pass across the letters), and holds 1–2 s.

## Techniques used with still art
| Technique | How it is done here |
| --- | --- |
| Multiplane / 2.5D parallax | Depth Anything V2 (Large, run locally) makes a depth map for every plate; a WebGL shader shifts pixels by depth as the camera moves (parallax occlusion with a few search steps). Moves are kept small to avoid tearing, and the depth maps are blurred and grown at edges. |
| Window view | The monorail interior window area is masked, and a separate wide panorama of the bay scrolls behind it, faster than the room. |
| Pans and tilts across tall art | Tall 2:3 sky and tower plates, rendered at 1248×1824 and tilted top to bottom. |
| Speed lines, motion blur | A procedural shader pass (radial or horizontal lines, seeded per shot, redrawn on 2s) plus directional blur on whip pans. |
| Limited animation on 2s/3s | Particle and line layers step at 12 fps inside a 30/60 fps camera, like real TV anime (camera on 1s, drawings on 2s). |
| Pose reveals | Approved character sprites, cut out, slide in over flat colour and halftone graphics with a whip, a white flash and a name card. |
| Hair and cloth sway | A small mesh-warp in the fragment shader, masked to the hair region, as a slow sine. Kept subtle. |
| Light | Light sweeps across faces (a moving soft band), pillar shadows passing on the beat, lens flares, light leaks, bloom, a little chromatic aberration at the edges on impacts. |
| Glints and paper | Four-point star glints on glass and water on beats; sheets of paper fluttering (rotating quads with fake 3D flip) in the copy-room shot. |
| Kotodama | Hiragana drawn stroke by stroke with a glow, rising and scattering into particles. Small and sparing. |
| Cast silhouettes | Cut-outs filled with a flat colour and a rim light, then revealed in colour one per beat. |
| Title | 天川 / AMAKAWA assembled on the last downbeat over the sky, with a shine sweep. |

## Code-driven animation (what other LLM-agent pipelines do)
- Remotion (React, Claude Code agent skills since early 2026) renders each frame as a pure function of the frame number and captures it with a headless browser. Motion Canvas does the same with generators and a timeline; Manim with Python scenes; Blender Python drives 3D cameras over projected 2D plates; After Effects is scripted with ExtendScript; Lottie exports vector motion as JSON.
- The idea that matters for us: every frame is a pure function of time. Our player does that without a framework: each shot is a function `draw(t)` with no hidden state, so the scrubber, the live page and the frame-exact video export (Playwright stepping time, ffmpeg joining frames and the song) all show the same picture.
- Not used: React/Remotion (too heavy for a single game page), video diffusion (rejected, see GUIDE Video), Blender (the 2.5D projection is done in the shader instead).

## Stack
- Plain WebGL2 with our own shaders (layers, depth parallax, post-processing: bloom, chromatic aberration, vignette, grain, flashes, light leaks), a 2D canvas for type and particles, no libraries. 1920×1080 internal frame with 16:9 letterboxing; a lite asset set (half size) for phones.
- Timing: beats, downbeats and sections from librosa, vocal lines from a Demucs vocal stem plus Whisper word timestamps (tools/opening/analyze_song.py, art/opening/audio/analysis.json).
- Art: RDBT Anima in ComfyUI, base render then hires fix (RealESRGAN x4 anime upscale, then a 0.35 denoise pass); approved sprites refined at 2× with a 0.28 denoise so the designs don't change; cut-outs with BiRefNet HR matting.

Sources: Sakuga Blog on who makes openings (blog.sakugabooru.com, 2025) and its Anime Craft Weekly opening round-ups; Remotion agent skills for Claude Code (remotion.dev, January 2026).

## Opening pipeline (one shot, repeatable; piloted on shot 2, 2026-09-25)
1. **Stage** the shot with the shot-staging skill: every field, written into the page next to the images (tools/opening/pilot_page.py, tools/opening/shotlist.py).
2. **Layout sketch** in code where geometry matters (tools/promptlab_sketch.py: horizon, beam, pillars, where the train and city stand). It is ours, so it can go to any model as a layout input. Jørgen's images are references only and never go in.
3. **Prompt** from the "in front of the lens" line only, with the Local playbook template. Name the parts that set direction ("the driver's cab with its big curved windshield and headlights is at the right end ... the left end is a plain flat back with small red tail lights"). "Front car at the right end" or "seen from behind" did not work.
4. **Cloud master** on Replicate (tools/rep.mjs, ledger tools/spend.json): a few candidates. If one flaw is left, fix it with one edit call that names only that flaw and says everything else stays unchanged.
5. **Check** every image against the staging note (direction, both ends of the train, pillars under the beam, continuity to the island, no extras) and write the verdict under the image.
6. **Review page**, then stop for Jørgen's pick.
7. **After the pick (local, free):** upscale (RealESRGAN x4 anime), depth map (Depth Anything V2), animate in the player (camera move plus depth parallax, glints and light on 2s), render with tools/opening/capture.js, and show it at its place in the song.

Pilot result: 12 images from four models, about $1.10. Only GPT Image 2 put the driver's cab toward the city (with the sketch), and it needed one edit to add windows. Nano Banana Pro looks closest to the reference but kept the cab at the wrong end five times, including when asked to edit it.

Pilot outcome (2026-09-25): Jørgen chose his own ChatGPT render (art/approved/monorail-bay-ref2.png) as the exterior master. Its prompt, "Reference prompt 2" in art/PROMPTS.md, is the template for the other four cloud masters: the camera stated plainly, everything placed in frame terms (lower left, right horizon), counts, colours, and one short "No ..." line, with no direction, cab or story wording (monorails have cabs at both ends, so direction wording made the train look like an ice cream truck). Step 7 was run on it: RealESRGAN 2x to 3344×1882, Depth Anything V2 depth map, a slow push with depth parallax and water glints in the player, rendered to proto2/opening/pilot-bay.mp4 (60 fps, the song from 3.6 s). The frame check found no tearing or warping.
