# Prompt guide (Anima / Nova Anime AM)

Patterns collected from strong community prompts and our own tests. Anima reads plain sentences and tags together; order matters (earlier = stronger).


## Reference prompt (Jørgen, 2026-09-25): monorail over the bay

Result: art/refs/monorail-bay-ref.webp. This is the target quality and the target prompt style: a style line, then a few plain sentences about what's in the picture, one idea each. No staging jargon, no stacked weights, no long lists.

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
Euler A, 30 steps, CFG 5, 1216×832, house negative. About 25 s per image. None of the tested changes beat this reliably:
- RDBT: 45 steps (36 s) and er_sde/simple each passed 3 of 4 against 2 of 4, on only four seeds.
- CFG 3, 4 and 7, 20 steps, other image sizes and every negative prompt variant were the same or worse.
- dpmpp_2m_sde/karras breaks both models.
- Hires (RealESRGAN anime ×4, down to 1.5×, 20 steps at 0.35, +45 s) adds detail but never fixes a layout. Use it only on a picked image.

### Prompt template
```
anime screenshot, anime coloring, 2d, cel shading, clean lineart, detailed anime background art, hand-painted anime background, no humans, scenery, <what is in the picture, in plain sentences, one idea each>. <light and time>. <palette: dominant X, broad Y, sparse Z accents>. <one plain line of what must not appear>.
```
Don't add quality tags (masterpiece, score_9 ...) in front, weights, reordering or extra "fix" sentences. Each of these scored the same or worse than the plain prompt. The long staging-style prompt looked slightly nicer on RDBT but passed fewer.

Tested examples (reviewer passes):
- Exterior with a line sketch, One Obsession, seeds 508, 509 and 511 passed (ablate-oneobs/guide-lineart-0.8-0.6-*; workflow tools/workflows/promptlab-scenery-sketch-oneobs.json): Jørgen's bay prompt as written, plus tools/promptlab_guides/bay-lines.png into LLLite lineart 0.8 until 60%.
- Exterior without a sketch, One Obsession, seed 906 (masters/ext-ref-oneobs-906): the same prompt; 2 of 6 seeds passed.
- Interior window, One Obsession, 7 of 8 seeds passed (masters/int-oneobs-901):
  `anime screenshot, anime coloring, 2d, cel shading, clean lineart, detailed anime background art, hand-painted anime background, no humans, scenery, interior view inside the monorail train, window showing sea and sky. 2 seats visible, window is fully visible, straight on angle. The sea far below is calm and flat, no waves. Early morning sun low over the sea, dominant sky blue and sea blue, sparse warm sunrise orange accents.`
- Sales, RDBT, 2 of 16 passed (sales-rdbt-s9-nophones-colorguide0.8-8408/8412), with the blockout: Jørgen's Sales prompt with the phones taken out and "Grey carpet floor." added.

### When words can't do it: composition control
In 60+ tries these layouts never came from a prompt, on either model: the aisle view toward a front window, desks pushed together into islands, a window filled by a wall, a tower cut off by the top edge. For layouts like these:
1. **Quick line sketch** (tools/promptlab_sketch.py draws one in code: horizon, a beam on pillars, a skyline) into Anima LLLite lineart at 0.8 until 60% of the steps. On One Obsession this was the best result of the study: 5 of 12 seeds passed, against 2 of 18 for the same prompt without the sketch, and closeness to the reference rose from about 2 to 3. It is the recipe for any exterior with a layout that matters. The sketch is crude and that is fine: the model only needs the horizon, the line of the beam and where the city stands (tools/promptlab_guides/bay-lines.png).
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
1. **Quality and meta:** `masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic`
2. **Rating:** `safe` for story scenes, `sensitive` for light fan service, `nsfw` only for gated reward scenes (see implied nudity below).
3. **Cast count:** `1girl, solo` / `1boy, 2girls` / `crowd`.
4. **One block per character:** `name: age, hair, eyes, face, outfit, expression;`
5. **Relations and pose:** who stands where, who touches or looks at whom, hands and eye lines.
6. **Camera and composition** (see below).
7. **Environment:** materials and a few concrete props.
8. **Palette and light** (see below).

## Faces (refined, mature, narrower)
- `mature youthful features, high cheekbones, prominent forehead, narrow refined face, sharp eyes`
- Attitude through body language, not adjectives alone: `sharp authoritative demeanor, cold unblinking gaze, regal posture`, `heavy-lidded gaze, faint knowing smile`.
- Keep every character clearly adult: state the age (23+ for the cast) and use `adult` or `mature female`.

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

## Implied nudity (gated reward scenes only)
- Cover with the scene, not clothes: long hair over the chest, water or steam hiding the lower body, angle and framing.
- Always add to the negative prompt: `visible nipples, visible genitals, uncovered crotch, frontal explicit view, explicit sexual action, transparent unobstructed body`.
- Never shown on the train (discreet mode) and never on public pages.

## Negative prompt base
`worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, lowres, bad anatomy, bad hands, missing fingers, extra fingers, long fingernails, claws, extra limbs, child, loli`

## Settings
Euler A, 30 steps, CFG 5; around 1040×1568 for portrait scenes, 1216×832 for wide scenes.

## Mio's glasses (tested 2026-09-29, reviews/mio-phone-3)

Jørgen: "glasses are the main issue with Mio, they keep changing to different shapes." Her glasses are the ones in art/approved/mio/mio-after.webp: taupe-grey frames (about #5a4f4c), medium thickness, rounded-rectangle lenses that reach from the lash line to mid-cheek, a small hinge block with a rivet dot, clear nose pads.

- Words and the IP-Adapter don't hold them. Every round-2 render came out with thin silver rectangles, and repainting the glasses band with the IP-Adapter at 0.7 plus "thick taupe-grey frames" gave black or green frames and green eyes.
- What reliably keeps them is to put her own frame on the picture, then take it no further than a light blend (game3d/assets/portrait-candidates/mio-phone-3/mio_phone3.py, job `exact` then `blend` with her eyes kept):
  1. Take the glasses off: repaint the glasses band without glasses (RDBT + LLLite inpainting-v2, denoise 0.9, "no glasses", `glasses, eyewear, frames` in the negative), with her eyes left out of the mask.
  2. Put the portrait's frame on: cut the frame out of the portrait by colour (tools/portrait_candidates.py `mio_frame_mask`, leaving out the navy hair pixels) and warp it onto the new face (composite.py). Each lens moves rigidly with its eye at the same face scale, and only the bridge stretches when the head is turned differently. Take the portrait's nose pads along.
  3. Blend lightly: a masked img2img over the glasses band at denoise 0.2, eyes left out. 0.3 already makes the frame thicker and glossier.
- Second best, when the frame must be redrawn: the diptych repaint (the portrait's head beside hers, glasses band masked, eyes kept, LLLite inpainting-v2 at 0.8). It gets the shape and colour close, but it's a new drawing of the frame, and the lens shape varies by seed.
- Always keep her eyes out of the mask. Every repaint that covered them changed her irises (green, glints).
- Keep the whole frame solid (Jørgen, mio-phone-3: "transparent frame on the top of the left glass"). Only hair that crosses the frame goes in front of it, never the fringe outline or lash line that runs along the top bar (composite.py `hair_mask`); the blend leaves the frame's core out of its mask; and the cut-out gets the frame as `--opaque` in tools/matte_refine.py, because the matte took the thin frame over the background for background (her approved game portraits had that hole under the left lens too, fixed 2026-09-29).
- Check each result beside the portrait at the same scale (mio-phone-3/sheet.py) and sample the frame colour. It should be close to the portrait's (median about 90, 79, 76).

## Eric (mc) portrait
- Hair (Jørgen, 2026-09-29: the sides must not come out darker, shorter or shaved-looking; "describe the desired hair simply, dont overcorrect"): `dark-blond hair, same colour all over, tied in a short ponytail at the back`, plus `undercut, shaved sides, two-tone hair` in the negative, unweighted. With both, about half the seeds give one even colour (round eric-portrait-anime-4: p6h2-1909, p3h2-2909); the words alone did it on one seed of six. Check every render for a darker band above the ear.
- Repainting only the side hair of a finished render doesn't fix it: masked img2img at denoise 0.45 to 0.75, with or without the LLLite inpainting patch, redraws the same dark side. Change the words and re-render.
- Keep the weighted red-rim negative `(rim light, red rim light, red outline, backlighting:1.4)` and measure with tools/redrim.py.
- Pose (Jørgen, 2026-09-29: "no awkward pose, no holding props"): `arms relaxed at his sides, slight three-quarter turn, looking at the viewer` or `one hand in his pocket, slight three-quarter turn, looking at the viewer`, in place of the old coffee-cup and neck-rub words. None of 24 renders in round eric-portrait-anime-5 held anything, and the hands mostly end up in pockets or out of frame. Leave out "standing" and "trouser pocket": they pull the camera back to thigh-up and shrink the head.
