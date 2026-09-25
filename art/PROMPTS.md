# Prompt guide (Anima / Nova Anime AM)

Patterns collected from strong community prompts and our own tests. Anima reads plain sentences and tags together; order matters (earlier = stronger).


## Reference prompt (Jørgen, 2026-09-25): monorail over the bay

Result: art/approved/monorail-bay-ref.webp. This is the target quality and the target prompt style: a style line, then a few plain sentences about what's in the picture, one idea each. No staging jargon, no stacked weights, no long lists.

```
anime screenshot, anime coloring, 2d, cel shading, clean lineart, (detailed anime background art, hand-painted anime background, painted clouds, no humans, scenery, showing a monorail train riding high above a Bay on a curving elevated monorail. The monorail is crossing toward a large man-made island city with office towers and other buildings. the office towers are catching the low morning sun, the calm sea below with sunlight glittering on the water, early morning sun low on the horizon. dominant clear sky blue and sea blue, broad white cloud and glass, sparse warm sunrise orange accents, bright hopeful light. No other city in the background, only island and monorail going towards it.
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
