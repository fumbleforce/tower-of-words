# Prompt guide (Anima / Nova Anime AM)

The main image model is RDBT Anima in local ComfyUI, with One Obsession for open scenery. Anima reads plain sentences and tags together, and earlier words weigh more. Here: how a picture is made (recipes and presets), Jørgen's reference prompts, the local playbook (which model, settings, the prompt template, composition control, known failures), faces, camera, palette, Mio's glasses, Eric's portrait, and the rules moved from GUIDE (cast prompt lines, portraits and cutouts, reward prompts, the Blender blockout, the ChatGPT-then-Meshy 3D workflow, video). Patterns come from strong community prompts and our own tests.

## How a picture is made (#603)

Every still picture goes through the image service (tools/imagegen/). Jørgen makes his in Image Gen (http://127.0.0.1:8772/) or in the Scene Editor's composer. Agents write a recipe, `<round>/recipes/<shot>.json`, and queue it:

```
node tools/subplots/compose.mjs <round>/recipes/<shot>.json --wait --owner <session>/<agent>
```

`--wait` saves each picture as webp in the round folder (the one above `recipes/`); the master PNG stays in the image service. `--owner` names who made the renders, shown as Made by in the dashboard: your session and agent, such as `claude-main/art-round`, `claude-private/private-scene-art` or `codex-exec:<task>`. Add `--end-session` to the round's last recipe so the GPU is freed. `--dry-run` prints the assembled prompt and settings without sending anything; feed that to tools/prompt_check.py. The service takes the GPU lock itself. A recipe's picture opens in the editor with every block filled in.

A recipe is the composer's composition as JSON. The header of tools/subplots/compose.mjs lists every field:

- Blocks, picked by preset id: `characters`, `outfit`, `cameras`, `framing` (picture shape), `style`, `model`, `negatives`, `pose`, `environment` and `light`. `rating` is safe, sensitive or nsfw. `hard` is for rewards (below).
- Free text: `scene` (what happens), `extra` (props, mood, other words) and `stage` (who stands where, facing and looking at what).
- Identity: `reference`, `referenceOn` and `referenceStrength` put the IP-Adapter on the approved portrait. `faceFix` and `faceStrength` repaint the face.
- Picture tools: `start` (`{image, denoise, mask}`) is img2img from a picture; with a mask (white = repaint) it is an inpaint. `loras` is a list of `{file, weight}`. `control` (`{file, image, strength, end}`) is an Anima LLLite guide picture (lineart, depth, scribble, inpainting). `huefix` holds measured colour fixes applied after the render; tools/imagegen/huefix.py lists them.
- `subplotId` and `imageSlot` attach the picture to a scene's shot; take both from the editor. `details` is a free note that is stored and shown with the picture but never sent.

compose.mjs refuses typed exclusion words (`negative`), whole-prompt overrides, typed looks or clothes (`people`), and switched-off style or character exclusions (tools/subplots/agent-recipe.mjs). Looks, quality tags and exclusions come only from presets.

### Presets

Reusable prompt words live only in versioned presets in the dashboard. They are local configuration and not in git (tools/imagegen/README.md). The dashboard shows each one's words and notes. Reward and limit presets show only in private mode. The main ones:

- Characters: one per cast member. Each holds the look and its own negative, taken from docs/game/cast.md through art/cast-looks.json (Cast prompt lines, below).
- Styles: `portrait` for cast portraits, `background` for rooms and scenes next to the approved places, `scenery` for open scenery on One Obsession, and `reward-r2` for reward pictures. A style holds the quality tags, the style words, the ending and its own negative. It also sets the default model, framing and negatives.
- Negatives: `base` (quality), `heavy` (body) and `limits` are on by default. The others are `drift` (style drift), `text`, `muscle`, `clothed`, `no-props` for base portraits, and `implied`, the soft preset.
- Models: `rdbt`, `oneobsession` and the rest, each with its sampler, steps and CFG. Framings: `portrait` (896×1152), `landscape` (1216×832), `landscape-r` (1152×896) and `square`.

A recipe kept under island/private/rewards/, or run with `--reward`, is a reward recipe, and compose.mjs holds it to the reward exclusion rule in GUIDE (Art). `"hard": true` marks an Adult-mode reward; leave it out for a nonadult one. Which tier a reward is: CLAUDE.md, Reward tiers by mode.

### Changing a preset

When a preset's words are wrong or missing (a look drifts, or a shot needs an exclusion no preset holds), save a new version or a new preset through the dashboard (`POST /api/preset/<type>/<id>`). Its note names the #n renders that showed the need. Never rewrite an old version, and never work around a preset inside one recipe. The findings further down quote words that earlier rounds typed by hand. Today those words go in a preset.

### What still runs directly

Video (the animate-still skill), audio, Blender blockout control renders (tools/blockout/) and background removal (tools/rmbg_local.py) still call ComfyUI themselves. Every other still is a recipe. `node tools/facts/direct-render.mjs`, part of `npm run check`, fails a new script that renders a still through tools/comfy.py, and an old one that renders more than it used to.

## Reference prompt (Jørgen, 2026-09-25): monorail over the bay

Result: art/refs/monorail-bay-ref.webp. This is the target quality and the target prompt style: a style line, then a few plain sentences about what's in the picture, one idea each. No staging jargon, no stacked weights, no long lists.

This example has no quality tags, but a picture always starts with them. They come from the style preset, followed by the rating tag (Jørgen, 2026-09-27: he left them out only to show the content, and dropping them made the rewards flat and plain).

```
anime screenshot, anime coloring, 2d, cel shading, clean lineart, (detailed anime background art, hand-painted anime background, painted clouds, no humans, scenery, showing a monorail train riding high above a Bay on a curving elevated monorail. The monorail is crossing toward a large man-made island city with office towers and other buildings. the office towers are catching the low morning sun, the calm sea below with sunlight glittering on the water, early morning sun low on the horizon. dominant clear sky blue and sea blue, broad white cloud and glass, sparse warm sunrise orange accents, bright hopeful light. No other city in the background, only island and monorail going towards it.
```

## Local playbook (tested 2026-09-25, legacy/proto2/promptlab)

Tested on the 3080 with 450+ renders. Every render was judged by a separate reviewer that saw only the picture and a one-line intent, with the model names hidden. Full tables and every image: legacy/proto2/promptlab. Runner: tools/promptlab.py. Loadable workflows: tools/workflows/promptlab-*.json.

**Where we stand.** Local models don't reach Jørgen's reference. The best local scenery (One Obsession) scores 4/5 for finish and about 3/5 for closeness to the reference, and roughly one render in three is free of logic errors. Plan on 6 to 8 seeds per shot and a check of every image.

### Rule 1: describe only what is visible

Leave out direction of travel, destinations ("crossing toward", "going to the city") and story (who he is, why he's there). None of it helped in any test, and story context never raised a pass rate. Say where things sit in image-frame terms ("the back of a man's head in the lower right corner"), not relative to a character ("over his left shoulder"). Character-relative wording put the man in the window glass, outside the train, in 8 of 8 renders.

### Which model

- **Open scenery** (sea, sky, cities, a train over a bay, a window view): **One Obsession**. It paints soft anime backgrounds. RDBT turns scenery into flat poster or vector art (look 2/5 at every setting).
- **Rooms and interiors that sit next to the approved locations**: **RDBT**. Its line and colour match the gate, copy room, basement office and dorm.
- JANIMA, Nova Anime AM, Anima Aesthetic, Anima Yume, Miaomiao and NetaYume Lumina passed nothing on the reference prompt. Don't use them for backgrounds.

### Settings

Euler A, 30 steps, CFG 5, 1216×832, house negative: the model presets, the `landscape` framing and the default negatives. About 25 s per image. None of the tested changes beat this reliably:

- RDBT: 45 steps (36 s) and er_sde/simple each passed 3 of 4 against 2 of 4, on only four seeds.
- CFG 3, 4 and 7, 20 steps, other image sizes and every negative prompt variant were the same or worse.
- dpmpp_2m_sde/karras breaks both models.
- Hires (RealESRGAN anime ×4, down to 1.5×, 20 steps at 0.35, +45 s) adds detail but never fixes a layout. Use it only on a picked image.

### Prompt template

The `scenery` style preset holds the style words. The recipe's scene text then follows this shape:

```
<what is in the picture, in plain sentences, one idea each>. <light and time>. <palette: dominant X, broad Y, sparse Z accents>. <one plain line of what must not appear>.
```

In the test, quality tags in front, weights, reordering and extra "fix" sentences each scored the same as the plain prompt or worse. The long staging-style prompt looked slightly nicer on RDBT but passed fewer.

Tested examples (reviewer passes; the prompts were typed in full then, with the style words now in the `scenery` preset):

- Exterior with a line sketch, One Obsession, seeds 508, 509 and 511 passed (ablate-oneobs/guide-lineart-0.8-0.6-*; workflow tools/workflows/promptlab-scenery-sketch-oneobs.json): Jørgen's bay prompt as written, plus tools/promptlab_guides/bay-lines.png into LLLite lineart 0.8 until 60%.
- Exterior without a sketch, One Obsession, seed 906 (masters/ext-ref-oneobs-906): the same prompt; 2 of 6 seeds passed.
- Interior window, One Obsession, 7 of 8 seeds passed (masters/int-oneobs-901):
  `interior view inside the monorail train, window showing sea and sky. 2 seats visible, window is fully visible, straight on angle. The sea far below is calm and flat, no waves. Early morning sun low over the sea, dominant sky blue and sea blue, sparse warm sunrise orange accents.`
- Sales, RDBT, 2 of 16 passed (sales-rdbt-s9-nophones-colorguide0.8-8408/8412), with the blockout: Jørgen's Sales prompt with the phones taken out and "Grey carpet floor." added.

### When words can't do it: composition control

In 60+ tries these layouts never came from a prompt, on either model: the aisle view toward a front window, desks pushed together into islands, a window filled by a wall, a tower cut off by the top edge. For layouts like these:

1. **Quick line sketch** (a script in the offline archive, see notes/history/offline-archive.md, drew one in code: horizon, a beam on pillars, a skyline) into Anima LLLite lineart at 0.8 until 60% of the steps. On One Obsession this was the best result of the study: 5 of 12 seeds passed, against 2 of 18 for the same prompt without the sketch, and closeness to the reference rose from about 2 to 3. It is the recipe for any exterior with a layout that matters. The sketch is crude and that is fine: the model only needs the horizon, the line of the beam and where the city stands (tools/promptlab_guides/bay-lines.png).
2. **Blender blockout** (tools/blockout): img2img from its flat colour guide at 0.8 plus its lineart at 0.8 until 80% of the steps. This is what finally gave Sales its desk islands. Lineart alone at 0.3 to 0.7 did not.
3. A 2D depth sketch helped less than the line sketch.

### Deriving shots from our own master

Only from our own approved master; Jørgen's images are a quality bar and never a source.

- **Works:** crop the master toward the subject, scale it up, and repaint at 0.35 to 0.5. The same train, beam and island come back, closer (4 of 12 passed). The step closer is small.
- **Doesn't work:** asking img2img for a new camera angle. Below 0.7 you get the master back. At 0.8 to 0.9 the model loses the world: car dashboards, ordinary railways, a man drawn outside the window. 3 of 64 passed, and none of those was a front-window, aisle or station view.
- Angles: the straight-on side window is reliable. The long aisle toward the front window failed every time, from prompts and from masters alike.

### Known failure modes (check these first)

- **One Obsession:** trains too long or endless; cars melting into the beam; ordinary two-rail track with sleepers instead of a monorail beam; tracks that loop, merge or end in mid-air; natural hilly islands instead of built ones; mountains or mainland behind the island.
- **RDBT:** flat poster or vector scenery; breaking surf right under a window sill, which reads as sea level (the line "The sea far below is calm and flat, no waves." fixed the empty-seat window but not every render); striped skies; long beams with one pillar.
- **Both:** garbled letters on signs and headboards; phones drawn as blobs or with the handset hanging on the cord (leave small props out of the prompt); chairs behind the backs of monitors; an extra window or lamp in rooms; the top of a tall building always inside the frame.
- **Checking:** the train must be a separate object with a clear outline, a visible last car, and a gap or shadow where it sits on the beam.

## Reference prompt 2 (Jørgen via ChatGPT, GPT image, medium effort, 2026-09-25): the exterior shot

Result: art/approved/plaza/monorail-bay-ref2.png (reference only; render our own). This is the model for cloud scene prompts: the camera stated plainly, everything placed in frame terms (lower left, right horizon), counts, colours, and one short "No ..." line. No direction, cab or story wording.

```
anime screenshot, anime coloring, 2d, cel shading, clean lineart, detailed anime background art, hand-painted anime background, no humans, scenery, wide view from high above a calm bay. A white elevated concrete monorail beam on round pillars curves from the lower left across the water to an office island on the right horizon. A short white monorail train of four cars sits on top of the beam in the lower left. The sea is calm with sunlight glitter. Early morning, low sun just above the horizon left of the city, soft clouds. Dominant sky blue and sea blue, broad white, sparse warm sunrise orange accents. No second track, no boats, no mountains behind the city.
```

## Derived shots: img2img from an approved master (Jørgen, 2026-09-25)

Result: art/approved/monorail-side-ref.webp, made by img2img from monorail-bay-ref.webp (Jørgen's own images: references only, never our sources; see the Local playbook). Once our own master image is approved, make new angles of the same world from it with img2img and a short prompt that describes only the new framing. The train design, palette and light carry over, so shots match each other and the model doesn't reinvent the world each time.

```
showing a view looking directly at one carriage from the side in the train, carriage covering the image end to end, window dimly reflecting only sea and sky, sunlight obscuring the interior.
```

Interior, also img2img from the masters (art/refs/monorail-interior-ref.webp). The straight-on side window from a seat is an angle the model handles well; a long aisle toward a front window is not.

```
interior view inside the monorail train, window showing sea and sky. 2 seats visible, window is fully visible, straight on angle. Main character sitting in the seat looking out the window: brown haired, black rounded glasses, wearing checkered office shirt of an engineer, tired expression.
```

## Structure

The composer builds the prompt in this order (`assembleComposition` in tools/subplots/web/image-compose.js):

1. **Quality and meta:** the style preset's quality tags.
2. **Rating:** `safe` for story scenes, `sensitive` for light fan service, `nsfw` only for gated reward scenes. A character preset can cap it.
3. **Cast count:** `1girl`, `1boy, 2girls` and so on, counted from the character blocks, then the style's own words.
4. **One block per character:** the look and outfit from the character and outfit presets.
5. **What happens, pose and staging:** the scene text, then who stands where, who touches or looks at whom, hands and eye lines.
6. **Environment, palette and light:** the place and light blocks, with materials and a few concrete props (palette: see below).
7. **Camera and composition** (see below), then the picture shape, the `extra` words and the style's ending.

## Faces (refined, mature, narrower)

- `mature youthful features, high cheekbones, prominent forehead, narrow refined face, sharp eyes`
- Attitude through body language, not adjectives alone: `sharp authoritative demeanor, cold unblinking gaze, regal posture`, `heavy-lidded gaze, faint knowing smile`.
- Keep every character clearly adult: state the age (23+ for the cast) and use `adult` or `mature female`.

## House portrait style: Mio and Kuro (Jørgen, 2026-09-30)

"the original Mio and Kuro are my favorites so if we can try to align the world around those." The anchors are art/approved/mio/mio-after.webp and art/approved/kuro/kuro-after.webp. Both are RDBT with the short gallery prompt (quality tags, rating, cast count, the look, the expression, a waist-up framing line on a plain light grey background) and no style words. What they share, looked at and measured against the rest of the cast:

- Line: solid black ink. A thick outer contour, fine inner lines on the face and folds, hair drawn as black masses with a few sharp, angular highlight shapes.
- Shading: hard two-tone cel shading with no gradients or airbrush. Dark clothes are mostly large flat near-black shadow shapes: 37% (Mio) and 43% (Kuro) of the figure is near black, against 8 to 24% for Kenji, Mori, Emi, Eric and Aoi.
- Colour: few colours, cool and muted, black first, one accent hue (Mio's green, Kuro's blue), and a pale cool grey or mint background. Skin is pale and nearly flat, with a light pink or lavender shadow and a small blush patch.
- Eyes: narrow almond eyes, half-lidded, with a heavy black upper lash line, small irises in pale muted colours and one small highlight. No big round sparkling eyes.
- Face: narrow and adult, with a pointed chin, a nose that is only a small shadow, a small mouth, a long neck and a head that is small against the shoulders. Three-quarter view with a slight head tilt.
- Off: Kuro's anchor has a thin red outline down her left side (image right). Never copy that (red-rim negative, "Eric (mc) portrait").
- Tried in reviews/style-align-1: img2img at 0.6 from a portrait with its own prompt gives the cast one line weight, pale cool skin and a cool palette. None of these brought over the black ink shapes: the anchor beside the character on one canvas (in-context repaint), the IP-Adapter fed an anchor (only her background came through), and "high contrast, deep black shadows".

## Camera and composition

- Shot size and angle in photography terms: `medium full shot`, `intimate high three-quarter close view`, `low angle over the table`, `extreme dutch angle`.
- Place things in thirds and weight what the model tends to drop: `(face sharp in upper-right third:1.5)`, `(enlarged foreground knee and thigh:1.35)`.
- Name the line that holds the image together: `face-knee diagonal`, `joined torsos forming a circular silhouette`.
- A framing element: `stone pillar cropping one edge`.
- Anima needs higher weights than SDXL (1.3 to 2.0) for them to bite.

## Palette and light

- Name colours as a hierarchy: `dominant <main colour>, broad <secondary>, sparse <accent> accents`.
  Example: `dominant deep teal water and shadow, broad warm skin and limestone, sparse amber and burgundy accents`.
- Light as source and direction: `gold side light`, `cool rim`, `reflected water glow`, `dramatic rim light`, `dark atmospheric lighting`.
- Give each game location a fixed palette line so scenes stay consistent.

## Small physical details

Droplets on skin, a ribbon around one wrist, nail colour, an anklet: one or two concrete details make a scene feel real.

## Reward scenes

The tiers and the soft and hard rules are in CLAUDE.md (Reward tiers by mode). The exclusions a reward recipe gets are under "How a picture is made". Soft pictures are never shown on the train (discreet mode) and never on public pages.

- Hard framing (Jørgen, 2026-10-04): hard scenes are not wide room shots and not one frame that shows everything; use a dramatic angle per image (kotodama_01143_ is the reference) and detail close-ups from different angles. The shot and camera menu is in island/private/rewards/SHOTS.md.

## Negative prompt base

The words are in the negative presets ("How a picture is made"); every picture also excludes `child, loli`.

Base portraits never hold props (Jørgen, 2026-09-30, on Kenji's screwdriver: "base portraits should NEVER have props, props are only for specific states and actions"). A prop goes in only when the picture is of that state or action. On every base portrait, select the negative preset "Base portrait, no props" (`no-props`), which holds the words.

## Settings

Sampler, steps and CFG come from the model preset (Euler A, 30 steps, CFG 5 on RDBT), and the picture size from the framing preset.

## Mio's glasses (tested 2026-09-29, reviews/mio-phone-3)

Jørgen: "glasses are the main issue with Mio, they keep changing to different shapes." Her glasses are the ones in art/approved/mio/mio-after.webp: taupe-grey frames (about #5a4f4c), medium thickness, rounded-rectangle lenses that reach from the lash line to mid-cheek, a small hinge block with a rivet dot, clear nose pads.

- Words and the IP-Adapter don't hold them. Every round-2 render came out with thin silver rectangles, and repainting the glasses band with the IP-Adapter at 0.7 plus "thick taupe-grey frames" gave black or green frames and green eyes.
- What reliably keeps them is to put her own frame on the picture, then take it no further than a light blend (art/candidates/portraits/mio-phone-3/mio_phone3.py, job `exact` then `blend` with her eyes kept):
  1. Take the glasses off: repaint the glasses band without glasses (RDBT + LLLite inpainting-v2, denoise 0.9, "no glasses", `glasses, eyewear, frames` in the negative), with her eyes left out of the mask.
  2. Put the portrait's frame on: cut the frame out of the portrait by colour (tools/portrait_candidates.py `mio_frame_mask`, leaving out the navy hair pixels) and warp it onto the new face (composite.py). Each lens moves rigidly with its eye at the same face scale, and only the bridge stretches when the head is turned differently. Take the portrait's nose pads along.
  3. Blend lightly: a masked img2img over the glasses band at denoise 0.2, eyes left out. 0.3 already makes the frame thicker and glossier.

  Steps 1 and 3 are recipes now: `start` with the band as `mask`, `control` with the LLLite inpainting patch, and the glasses exclusion from a negative preset.
- Second best, when the frame must be redrawn: the diptych repaint (the portrait's head beside hers, glasses band masked, eyes kept, LLLite inpainting-v2 at 0.8). It gets the shape and colour close, but it's a new drawing of the frame, and the lens shape varies by seed.
- Always keep her eyes out of the mask. Every repaint that covered them changed her irises (green, glints).
- Keep the whole frame solid (Jørgen, mio-phone-3: "transparent frame on the top of the left glass"). Left and right mean HER left and right, so her left lens is the one on the image's right. In the portrait her fringe hangs in front of that lens's top bar, so the frame cut out of it has a gap there; composite.py `fill_hidden_bar` continues the bar across it before the warp. Only hair that crosses the frame goes in front of it, never the fringe outline or lash line that runs along the top bar (composite.py `hair_mask`); the blend leaves the frame's core out of its mask; and the cut-out gets the frame as `--opaque` in tools/matte_refine.py, because the matte took the thin frame over the background for background (her approved game portraits had that hole under the left lens too, fixed 2026-09-29).
- Check each result beside the portrait at the same scale (mio-phone-3/sheet.py) and sample the frame colour. It should be close to the portrait's (median about 90, 79, 76).

## Eric (mc) portrait

- Hair (Jørgen, 2026-09-29: the sides must not come out darker, shorter or shaved-looking; "describe the desired hair simply, dont overcorrect"): a plain hair line plus an unweighted negative against an undercut, both in his character preset. With both, about half the seeds give one even colour (round eric-portrait-anime-4: p6h2-1909, p3h2-2909); the words alone did it on one seed of six. Check every render for a darker band above the ear.
- Repainting only the side hair of a finished render doesn't fix it: masked img2img at denoise 0.45 to 0.75, with or without the LLLite inpainting patch, redraws the same dark side. Change the words and re-render.
- The weighted red-rim negative is in the `portrait` style and in his character preset (findings under Portraits, expressions and cutouts). Measure with tools/redrim.py.
- Pose (Jørgen, 2026-09-29: "no awkward pose, no holding props"): `arms relaxed at his sides, slight three-quarter turn, looking at the viewer` or `one hand in his pocket, slight three-quarter turn, looking at the viewer`, in place of the old coffee-cup and neck-rub words. None of 24 renders in round eric-portrait-anime-5 held anything, and the hands mostly end up in pockets or out of frame. Leave out "standing" and "trouser pocket": they pull the camera back to thigh-up and shrink the head.
- Game crop (2026-09-29, Jørgen: "like 10% bigger zoomed in", then "yeah say 25% bigger"): eric-neutral.webp is r4-909's cut-out scaled 1.051125 (0.84090 x 1.25) about his face centre x 304 and chin y 402 of the 597x768 canvas, source box x 167.30 to 735.27, y -47.35 to 683.30 on the 896x1152 render; FACE.eric unchanged, so his face shows 25% bigger at the same chin height.
- Expressions (round eric-expressions-1): repaint only the face of the approved source, brows to chin and inside the jaw line, on a 260 px crop upscaled to 1024 (RDBT, DifferentialDiffusion, denoise 0.6 to 0.75), with the glasses frame pasted back so it stays identical. "surprised, eyes wide open, eyebrows raised" and "tired, weary, heavy-lidded eyes" alone drew knitted, frowning brows on most seeds; `frown, furrowed brow, angry` in the negative fixed that. `dark circles under his eyes` came out as bruise-like shadows.

## Rules from GUIDE (moved 2026-09-29)

These were in GUIDE.md until the guide diet and are copied here as they were. GUIDE keeps the rules that cover every picture (describe only what is visible, shot staging first, Jørgen's images are references only, one change per fix).

### Models and prompt shape

- Model: Anima-family checkpoints in local ComfyUI. RDBT Anima is the main model (best for simple and medium scenes, most attractive). One Obsession: logic in hard scenes. JANIMA: style and groups. Prompt guide: art/PROMPTS.md.
- The anime style words and their "3d, realistic" negative are in the style presets.
- Style drift (Jørgen, 2026-09-26, on reward renders; applies to every anime render): renders can slide into other styles, such as a flat, heavy-outlined Western action-cartoon look. Keep the house model and style preset, keep colour and lighting words out of the style, and select the `drift` negative. Before any render is used, compare it side by side with the approved portrait or scene it has to match, and reject drift.
- Prompt structure: one block per character; state where the camera is and which way everyone faces; give a hand to every held object; keep emotions inside each character's block (they leak); use weights of 1.3–2.0 for things Anima tends to drop; don't name landmarks.
- Prompt style (2026-09-25, Jørgen's reference in art/PROMPTS.md and art/refs/monorail-bay-ref.webp): the style line, then a few plain sentences describing what is in the picture, one idea each, plus a plain line for what must not appear. The staging note is for thinking and checking; it does not go into the prompt. Long prompts full of staging detail confuse the model.
- Exception (2026-09-25): Jørgen approved his own art/approved/plaza/monorail-bay-ref2.png as the opening's exterior master ("just use this so we can get somewhere"). Use one of his images as an asset only when he says so explicitly.

### Cast prompt lines

- Rule (Jørgen, 2026-10-09: "WHY are you completely mis-prompting the mio images?? ... her look is CLEARLY defined"): a cast member's look is copied from the Look line in docs/game/cast.md and the approved portrait is the identity reference for every render; never describe a character from memory or invent hair colours. Check every candidate side by side with the approved portrait.
- The prompt words for each cast member's look (age, skin, hair, eyes, glasses, build, outfit, short form, own negative, approved portrait) are in art/cast-looks.json, the one source for every image tool (Jørgen, 2026-10-09: "we should not have drift between the various tools"). The dashboard's character presets get them as new versions (`python3 tools/cast_looks.py --sync-dashboard`, also run when it starts), and a recipe selects the character by id. Nothing else writes a look of its own. `node tools/facts/cast-looks.mjs` (part of the facts check) fails when an entry's age or colours disagree with cast.md or a tool carries its own copy. When a Look line in cast.md changes, update the entry from it and the approved portrait, then `--stamp <id>`.
- Mio (art/approved/mio/mio-after.webp): very dark green hair bordering on black in a messy loose bun with bangs, bright green underneath showing at the ends and nape (not teal, no streaks on top), light tan eyes, thin-framed glasses as in the portrait, pale skin (no tan), 30.
- Main character: a Nordic man, fair pale skin, light blond eyebrows, slim average build, no blush. Rei: silver ponytail, steel-grey eyes. Emi: the approved round-3 RDBT seed 41 design (auburn bob, clear tortoiseshell glasses, curvy, blazer and pencil skirt).
- Kuro's glasses (Jørgen, 2026-09-27): clear lenses; her character preset asks for them and excludes tinted ones. Tinted lenses are off-model.
- Kiyoko's age wording (Jørgen, 2026-09-27: round 28 made her "WAY older… 90s, witch… creepy"; target legacy/proto2/decide2/kiyoko-camel-201.webp, a beautiful woman in her fifties with a few age lines). Tested on RDBT, 24 renders on the round-28 private page. Her character preset holds the tested wording (a 56-year-old with fine lines at her eyes) and a negative against a witch or an elderly woman. The wording supplies the lines and the negative caps her at about 50. Putting `old woman, elderly, wrinkled skin` in the negative, or leaving out the wrinkle words, makes her about 30. Close profile shots still age her to about 65; for those, select the `kiyoko-close-profile` character preset.
- Build lines (Jørgen, 2026-09-27: Kaori came out "super obese" in one scene and "super mega buff like on steroids" in another). RDBT inflates bodies, so every cast description carries a build line, and the `heavy` negative is on by default. Curvy is wanted; heavy or bodybuilder isn't. Rei: tall and curvy. Mio: slim with soft curves. Aoi: slim with small B-cup breasts, not flat (Jørgen, 2026-10-09). Kaori: tall, slender, lean with soft curves (never "athletic" or "toned"). Yuzuki: lean with medium breasts. Tsubasa: slim runner's build with small breasts (never "strong" or "athletic"). Kanae: slim. Sumi: petite with medium breasts. Saki: slender. Nanami: tall and athletic. Kiyoko: slim and elegant. Kuro: slender with long legs. Kaori and Tsubasa carry an extra negative against a thick waist and muscles in their character presets.

### Verdicts

Every dashboard picture has a permanent number (#n, on its tile; tools/imagegen/find.py <n> looks it up). Name candidates by #n in reviews and reports so Jørgen can refer to them in chat (2026-10-09).

Every attempt an agent rejects gets a one-line reason in the image gen dashboard, where Jørgen reads it in the History viewer's reject-reason field (Jørgen, 2026-10-09: "the verdict should be in the reject reason field here in the imagegen history viewer"). Recipe renders are in its history already, named by their `#n` or job id (`python3 tools/verdict.py "#1971" --reject ...`). After looking at each one, run `python3 tools/verdict.py <image> --reject "<what is wrong, one line>"` (or `--keep "<why>"` for the ones that stay). The same reason goes on the round's page.

### Portraits, expressions and cutouts

- Portrait recipe (#603): the style preset "Cast portrait, house style" (`portrait`), which sets the RDBT model, the `portrait` framing and the `heavy` and `no-props` negatives. Select the character with its default outfit and write the expression as the scene text. A portrait of a state or action that needs a prop leaves `no-props` off. The preset replaces tools/production.py's portrait recipe and builds the same prompt.
- Portrait framing (2026-09-25): the head, hair and raised hands must sit inside the frame with some room above. Most approved portraits had hair touching or cut by the top edge because "waist-up portrait" on 896×1152 makes the model fill the canvas, and img2img repaints (Kiyoko's outfits) keep the source crop. The `portrait` style asks for space above the head. Check headroom with tools/imgqa.py (portrait-round skill). To fix an existing image, outpaint headroom with a recipe: the padded picture as `start` and the new strip as its `mask`, so face and outfit stay pixel-identical.
- Cutouts: local rembg ISNet anime. Check for see-through holes in hair and glasses.
- Red rim light (2026-09-28, Eric's portrait): RDBT sometimes draws a red rim light along the outline (Jørgen: "he's getting some red light shone on him"). Fix: a red-rim negative. The old approved Eric portrait has it too. Unweighted, the rim-light words still left it on 5 of 24 renders in round eric-portrait-anime-2; weighted (the form the `portrait` style now carries) they removed it on the same seeds. tools/redrim.py measures it (old A set 18 to 40% of the outline band, clean renders under 2%).

### Rewards

- Reward quality (Jørgen, 2026-09-27): every reward since the round-2 onsen comparison (art/company/local2, "spicy" row) is too tame and too flat: "could all have the Everyone tag", girls fully clothed in rooms with no cleavage, "flat TV anime". Biggest cause (his catch): the quality tags were dropped. Round 2 prompts opened with the quality tags; his 2026-09-25 reference prompt (art/PROMPTS.md) left them out because it was only about the content, we copied its form, and 198 of 203 reward prompts went out without them. Every Anima-family prompt (RDBT included) starts with those quality tags, then the rating, then the content; the style presets keep them there, and a content example from him never removes them. Other causes: the "anime screenshot, anime coloring, 2d, cel shading, clean lineart" anchors and "3d, render" negatives, `safe`/`sensitive` ratings with "topless, completely nude" in the negative, ~850-character staging prompts about the room, and wide landscape shots. For rewards: the `reward-r2` style (RDBT, no flat-anime style words), a short scene text about her (don't over-prompt), a rating that fits the scene (`nsfw` for implied nudity), close or portrait framing, and the onsen image as the bar.
- Reward-scene findings (2026-09-26): only a Blender blockout (LLLite lineart 0.6 until 50%) put the camera inside a lift; plain prompts always shot through the open doors. Making the discreet version by repainting only the clothing of the chosen private render works for tops and wraps, but failed for a skirt hem and a towel, so those need fresh renders. Colour words misfire at night: "auburn" came out wine-red, and "dark tanned skin flushed pink" painted skin magenta. Fix hair colour with a measured recolour against the approved portrait: the recipe's `huefix`.

### Composition control and the blockout

- Complex action (the shootout, swimming, the volleyball spike) fails with plain prompting even after fixes. It needs composition control (a pose or layout sketch as an input, or regional prompting) before more attempts; don't burn time re-rolling.
- Composition control (2026-09-25, monorail and Sales round 3). Try things in this order and stop at the first that passes the staging check: (1) a short prompt; (2) img2img from an approved master (the recipe's `start`) with a short prompt about the new framing; (3) a Blender blockout with Anima LLLite control. Record on the review page which one made each image. Compositing, painting parts separately and pasting them together, is no longer allowed (GUIDE, Art); the window views below are history.
  - Installed: the Anima LLLite patches from kohya-ss/Anima-LLLite (lineart-1, depth-1, scribble-1, any-test-like-v2, inpainting-v2) in ~/ai/ComfyUI/models/controlnet, linked into models/model_patches. ComfyUI's own nodes load them: ModelPatchLoader then AnimaLLLiteApply (image, strength, start/end, optional mask) on the model before the sampler. No custom node needed. Blender 5.2 was already in ~/.local/bin.
  - Blockout: tools/blockout/blk.py builds a scene from boxes in Blender and ray-casts three control images at 1216×832 (lines, depth, flat colour guide); scenes are tools/blockout/monorail.py (inside, door view, outside) and sales.py, run with `blender -b --factory-startup -P <scene>.py -- tools/blockout/shots`. The .blend files and control PNGs are in tools/blockout/shots. tools/blockout/shots.py renders a job in one mode: plain, lines, depth, both, guide (img2img from the colour guide), ref (img2img from a master plus lines).
  - What the blockout does well: lines at strength 1.0 (end 0.8), or depth plus lines, holds the big layout (aisle, window positions, a beam curving ahead) where words fail. What it doesn't: the colour guide at denoise 0.9 goes flat and grey; large plain areas in the line image turn into empty void or ghostly glass (give blocks detail: window bands on towers, a ceiling grid); the model still adds cars to a three-car train and puts stray pillars in the water; long-aisle interiors come out grungy. A straight-on door view from the blockout read as a platform, not a carriage.
  - LLLite inpainting-v2 on a masked img2img is the clean way to replace part of a picture: it removed the man from Jørgen's interior master with no seam (tools/blockout/composite.py).
  - Results (round 3): Sales passed with the blockout as line control at strength 0.7 plus a five-sentence prompt (plain short prompts gave classroom rows). The monorail window passed only by compositing. Every exterior of the train failed: 5 to 8 cars instead of three, or headlights toward the camera, with or without the blockout. Naming a thing in a "must not" line can pull it in (sunbeams); describe the light you want instead.
  - Window views by compositing (history; tools/blockout/composite.py): the approved interior master, padded to 1216×832 (outpainted strips), the person inpainted out, the view rendered on its own with a short prompt, pasted into the window rectangle, then a masked img2img over the window at denoise 0.4 so the glass and light match.

### 3D characters: ChatGPT chibi, then Meshy

- 3D character workflow (Jørgen, 2026-09-28; worked first try for Eric). His words, verbatim; use them as written:
  > So the workflow I've used is to generate the chibi picture in chatgpt. I needed 3 rounds to get it right, and need to remove accessories that get garbled by meshy.
  >
  > this is the earlier prompt I had to make the character at an angle which leads to better meshy results.
  > "she should be looking to the left instead, same orientation as her body. Keep all features thick and sturdy, no fine strands or thin spikes. No text, no props, no extra subjects, no photorealism. she is looking the same orintation as her body. Flat matte texture of model"
  >
  > Then the 3 steps, where I attached the portrait of eric with the chibi of mio:
  >
  > 1. make a 3d chibi anime character in the style of the attached image
  > 2. Simplify male character a LOT to match the detail level of the other chibi, with open eyes
  > 3. Simpler head model, grey closed jacket, no glasses
  >
  > then in meshy I used the image to 3d model, smart topography, 1050 poly count, a pose, then textured it in a second pass if it looked right. Worked on first try this time. From there it can be automatically rigged (just need to lower the height due to the big head), and add animations.
  - Mio, the first one (Jørgen, 2026-10-04): from Mio's portrait alone, with several takes per step, in ChatGPT:
    1. "low poly chibi 3d game model of this character"
    2. "simplify 3d chibi model further, stronger contrasts, low poly"
    3. "simplify chibi character much more"
       The Eric steps above then used this Mio chibi as the style reference.
  - Props come off in the picture steps (Jørgen, 2026-10-04, on Emi's mangled lanyard: "we should remove props when making the models"): step 3 also names any lanyard, bag, badge, phone, glasses or hair sticks to remove, so Meshy never sees them.
  - Texture pass (Kuro round 3, 2026-10-04): smart-topology shapes come back with no UVs, so Meshy cuts the face into many small pieces and smears the eyes. Before texturing, unwrap the shape in Blender with the front of the face as one UV island at about 3x the density, then run Meshy retexture on that mesh (model_url, the picture as the style image, keep original UVs, no PBR, 2048 px). Script: art/candidates/kuro-meshy-orig-3/uv_bl.py.
  - The picture steps were done in ChatGPT's image model, not a local one. Step 3 was specific to Eric; for another character it names what to simplify on that character. His Mio chibi reference is tools/characters/ref/mio-chibi-34.png (angled: mio-chibi-angled.png).
    In the game, these models only get colour tweaks (see Meshy parts).

### Video

- Round 2 (legacy/proto2/video2, 2026-09-25): same three sources (Rei, Mio, monorail) through five setups. By frame checks, Wan 2.2 I2V 14B fp8 with the lightx2v 4-step LoRA is best overall (4 steps, CFG 1, shift 5, euler/simple, high-noise expert for steps 0-2 then low-noise, 81 frames at 16 fps, about 624×800 or 960×528). About 3.5 min per 5 s clip on the 3080; the 14 GB experts stream from RAM (ComfyUI has no GGUF loader installed, so fp8 instead of GGUF). DaSiWa Lightspeed v11 (Civitai, speed-up baked in) is equally good and did the only real camera pan. The Civitai anime-style and "live 2d wallpaper" LoRAs added nothing visible.
- Round 2 verdict (Jørgen, 2026-09-25): Wan 2.2 14B (lightx2v) is pretty good and the video model of choice; DaSiWa is a tiny bit worse; the 5B is completely unusable, even with timed prompts. The monorail source image must be redone: the train looks infinite and travels away from the island.
- Prompt only what the camera sees (images and video). Before writing a prompt, stage the shot: where the camera is, which way it faces, what is in front of the lens, and what is behind it. Leave out everything behind the camera; naming it pulls it into the frame. Every moving thing travels in the direction its own scene needs. Example: the day-1 monorail carries the player to the island he is moving to, so a shot of it coming toward the camera looks back along the route and the island must not appear; to show the island, the camera faces forward along the route. Trains need a visible end (not endless). Monorail trains have a cab at both ends: never prompt for a single front or tail lights; direction comes from the composition (2026-09-25, Jørgen: the one-headed train looked like an ice cream truck).
- Prompts matter as much as the model: shot and camera first, then "Second 0 to 1: ... Second 1 to 2: ...", then what must stay fixed ("rigid body, cars do not bend"). Make the motion match the picture (round 1 sent the train toward the city while it faced the viewer). The 5B model with a timed prompt moves a lot but takes 6 to 11 min.

#### Animating a character still (2026-10-10)

How to run it is in the animate-still skill; this is what we know. Test: one 1216x832 still of a woman waving a paddle, target "dancing with joy, hips moving from left to right, whole body dancing". Three routes ran side by side.

- Plain image-to-video can't make a character dance. Wan 2.2 14B I2V with lightx2v (settings above, 832x576, about 200 s a clip) keeps her in the source pose and only moves the raised arm. Jørgen: "looks like she is just combing her hair", "the exact same pose, hand on hip, never moving from that position". A timed prompt moved the torso once but lost the paddle. First = last frame loops cleanly but doesn't add motion.
- Keyframes for first+last-frame clips have to move the body. Image-edit keys (Qwen-Image edit) changed the arms but kept the hips where they were. Jørgen: "in all 4 she has hips to the right, what good will that do". Measure the hip position of every key against the source before rendering a clip from it.
- Pose-driven generation works. Wan 2.2 Fun VACE (14B fp8, high and low experts, core `WanVaceToVideo`) with a skeleton video gave the only clip where she really dances: hips travel 146 px of the 162 asked, four swings, face/hair/outfit stay the same. Setup: control video = the source as frame 0 (mask 0, kept) + DWPose skeleton for frames 1–80 (mask 1), the source also as reference image, 832x576, 81 frames at 16 fps, t2v lightx2v v1.1 LoRAs on both experts, 6 steps (3 high + 3 low), shift 5, cfg 1. About 350 s. Weak spots: props leave the frame if the driver lifts the hand holding them; the model invented window blinds; brightness rises after frame 0; the grin became an open laugh.
- Build the driver on the character's own skeleton: DWPose on the source (rtmlib on the CPU), her bone lengths, frame 0 exactly her pose, ease into the dance and back out so the last frame equals the first (it loops). The Bandai Namco Research motion dataset (CC BY-NC 4.0) has only "normal" dances, mostly held poses and lunges with no steady hip sway, so dances written as curves beat that mocap.
- Wan 2.2 Animate (int8) ran out of VRAM at 832x576 while the card was shared. Untested beyond that, and so is FramePack (installed).
- The 2D puppet (layers + Three.js bone rig, no video model) got "not too bad actually" after one round of fixes. It stays exactly on model, but it's a puppet: nothing turns in depth and the face never changes. What went wrong, so it doesn't happen again: cutting a limb in two polygons left a strip at the elbow in the body layer ("a big chunk of her arm is missing"). Redrawn key poses faded in over the body changed the armpits and the chest ("visibly changing armpit styles, and breast size"). Springs and squash on the body changed its size. Eased curves that held at each side and jumped through the middle looked "staggered". Seams where skin meets clothes left "skin sticking to her shirt" and "material on her bicep". Effort: about an hour of agent time for the first pass plus 10 minutes of fixes; most of it went into cutting and filling the hidden areas, which every new picture needs again.
- ComfyUI takes every free MB of VRAM. During these runs it held 7.5 of the 10 GB and Jørgen's Chrome lost its GPU and froze. Start ComfyUI with `--reserve-vram 3` for video jobs, take the GPU lock, and unload the models after.
