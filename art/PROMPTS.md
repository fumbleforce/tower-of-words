# Prompt guide (Anima)

RDBT Anima in local ComfyUI is the main image model, One Obsession the one for open scenery. Anima reads plain sentences and tags together; earlier words weigh more.

## How a picture is made

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

compose.mjs refuses whole-prompt overrides, typed looks or clothes (`appearance`, `clothing`), and switched-off style or character exclusions (tools/subplots/agent-recipe.mjs). Looks and quality tags come from presets. Rating exclusions are fixed: a reward always keeps the default negative presets and, when nonadult, the soft one. Content exclusions are manual, per section: `sectionNegatives` (`scene`, `pose`, `setting`, `light`, `camera`, `details`), a person's `clothingNegative` and `appearanceNegative` under `people` (added to the preset's words), more `negatives` presets, and the older free `negative`.

### Presets

Reusable prompt words live only in versioned presets in the dashboard. They are local configuration and not in git (tools/imagegen/README.md). The dashboard shows each one's words and notes. Reward and limit presets show only in private mode. The main ones:

- Characters: one per cast member, holding the look and its own negative from art/cast-looks.json (Cast, below).
- Styles: `portrait` for cast portraits, `background` for rooms and scenes next to the approved places, `scenery` for open scenery on One Obsession, and `reward-r2` for reward pictures. A style holds the quality tags, the style words, the ending and its own negative. It also sets the default model, framing and negatives.
- Negatives: `base` (quality), `heavy` (body) and `limits` are on by default. The others are `drift` (style drift), `text`, `muscle`, `clothed`, `no-props` for base portraits, and `implied`, the soft preset.
- Models: `rdbt`, `oneobsession` and the rest, each with its sampler, steps and CFG (RDBT: Euler A, 30 steps, CFG 5). Framings: `portrait` (896×1152), `landscape` (1216×832), `landscape-r` (1152×896) and `square`.

A recipe under island/private/rewards/, or run with `--reward`, is a reward recipe. `"hard": true` marks an Adult-mode reward; leave it out for a nonadult one (tiers: CLAUDE.md, Reward tiers by mode). The rating exclusions are fixed defaults a recipe can't remove or edit: the soft negative preset for a nonadult reward, Adult mode's set for a hard one. Content exclusions (a clothing or background negative, `window` for a windowless room) stay manual and become per-section blocks (#616).

### Changing a preset

When a preset's words are wrong or missing (a look drifts, or a shot needs an exclusion no preset holds), save a new version or a new preset through the dashboard (`POST /api/preset/<type>/<id>`). Its note names the #n renders that showed the need. Never rewrite an old version, and never work around a preset inside one recipe.

### What still runs directly

Video (the animate-still skill), audio, Blender blockout control renders (tools/blockout/) and background removal (tools/rmbg_local.py) still call ComfyUI themselves. Every other still is a recipe. `node tools/facts/direct-render.mjs`, part of `npm run check`, fails a new script that renders a still through tools/comfy.py, and an old one that renders more than it used to.

## Writing the scene text

Stage the shot first (GUIDE: Art, shot staging); the note is for checking and stays out of the prompt.

- Describe only what is visible. Direction of travel, destinations and story never help. Anything behind the camera stays out; naming it pulls it in.
- Place things in frame terms ("in the lower right corner"), never relative to a character ("over his left shoulder").
- A few plain sentences, one idea each, then light and time, then the palette, then one plain "No ..." line. Long staging prompts and stacked fix sentences do worse. Naming a thing in the "No" line can pull it in; describe what you want instead.
- Palette as a hierarchy: `dominant <main>, broad <secondary>, sparse <accent> accents`. Light as source and direction (`cool rim`, `reflected water glow`).
- Camera in photography terms (`medium full shot`, `low angle over the table`). Anima needs weights of 1.3 to 2.0 for words it tends to drop.
- One block per character; emotions stay inside it (they leak); give a hand to every held object; say which way everyone faces. No landmark names. Leave small props out; they come out as blobs.
- Every character is clearly adult, with the age from docs/game/cast.md.

The target, scene text from Jørgen's exterior master (art/approved/plaza/monorail-bay-ref2.png):

```
wide view from high above a calm bay. A white elevated concrete monorail beam on round pillars curves from the lower left across the water to an office island on the right horizon. A short white monorail train of four cars sits on top of the beam in the lower left. The sea is calm with sunlight glitter. Early morning, low sun just above the horizon left of the city, soft clouds. Dominant sky blue and sea blue, broad white, sparse warm sunrise orange accents. No second track, no boats, no mountains behind the city.
```

Models: `oneobsession` with the `scenery` style for open scenery (RDBT turns it into flat poster art); `rdbt` for rooms, portraits and rewards. Watch for endless trains, two-rail track, hilly natural islands, garbled sign letters and an extra window or lamp.

## Layout control

Some layouts never come from words (an aisle toward a front window, desk islands). Try in order and stop at the first that passes: a short prompt; img2img (`start`) from our own approved master, cropped toward the subject and repainted at 0.35 to 0.5 (a new camera angle by img2img fails); a crude line sketch as `control`, LLLite lineart 0.8 until 60%; a Blender blockout (tools/blockout/) as lineart 0.7 to 1.0 until 80%. Complex action needs control before more rerolls. No pasted composites (GUIDE: Art); LLLite inpainting-v2 with a mask replaces part of a picture cleanly.

## Cast

- A look comes only from the character preset. art/cast-looks.json holds the words, copied from the Look line in docs/game/cast.md; `python3 tools/cast_looks.py --sync-dashboard` writes them as preset versions and `node tools/facts/cast-looks.mjs` fails on drift. When a Look line changes, update the entry, then `--stamp <id>`. Check every candidate side by side with the approved portrait.
- RDBT inflates bodies; `heavy` is on by default. Curvy is wanted, heavy or bodybuilder isn't. Kiyoko's close profiles use `kiyoko-close-profile`.
- House style anchors: art/approved/mio/mio-after.webp and art/approved/kuro/kuro-after.webp (solid black ink, hard two-tone cel shading, few cool colours, narrow adult faces). Kuro's thin red outline is a fault.

### Portraits, expressions and cutouts

- The `portrait` style sets RDBT, the framing, `heavy`, `no-props`, the red-rim negative and headroom. Pick the character with its default outfit; the expression is the scene text. Base portraits never hold props ("props are only for specific states and actions"); only a state or action portrait leaves `no-props` off.
- Headroom fix: outpaint, the padded picture as `start` and the new strip as `mask`.
- Expressions repaint only the face of the approved source (`start` with a face `mask`).
- Red rim: tools/redrim.py (clean is under 2%). Cutouts: rembg ISNet anime; check hair and glasses for holes.

### Eric (mc) portrait

His preset holds a plain hair line and an undercut negative; check for a darker band above the ear and re-render (repainting the side doesn't fix it). Pose words: `arms relaxed at his sides` or `one hand in his pocket`, `slight three-quarter turn, looking at the viewer`; no "standing", which shrinks the head.

### Mio's glasses

Taupe-grey frames (about #5a4f4c), rounded-rectangle lenses from the lash line to mid-cheek, as in mio-after.webp. Words don't hold them. Method (art/candidates/portraits/mio-phone-3/mio_phone3.py): inpaint the glasses off (LLLite inpainting-v2, denoise 0.9), warp the portrait's own frame on (tools/portrait_candidates.py `mio_frame_mask`, tools/blockout/composite.py), blend at denoise 0.2. Never mask her eyes; her irises change. The frame stays solid; cut-outs pass it as `--opaque` to tools/matte_refine.py.

### Verdicts

Name candidates by dashboard number #n (`tools/imagegen/find.py <n>`). Every attempt gets `python3 tools/verdict.py <image> --reject "<one line>" --fault <type>` or `--keep "<why>"`; Jørgen reads it in the History viewer. Before each pass run `python3 tools/verdict.py --tally <round dir>` and change the method for a REPEATED fault.

## Reward scenes

Tiers by mode: CLAUDE.md. Exclusions: How a picture is made.

- Make them whenever the GPU is idle, with real creativity and direct spice: revealing outfits, bath and onsen scenes, suggestive poses and angles, compromising situations that come out of play. Many varied concepts, no style variants of one concept. Ordinary scenes can be sexy too. Couples of any kind, women with each other included; don't assume anyone's orientation.
- RDBT only. The `reward-r2` style brings the quality tags; never drop them (rewards go flat).
- Perspective is not an anatomy fault; reject only real errors (extra or missing limbs, fused fingers, a joint bending the wrong way).
- Limit test for soft pictures: reject only when a nipple, areola or genitals are clearly drawn and visible. Hints, shading and show-through don't count; points showing through a braless top are fine and wanted, so never negative-prompt them away. Anyone not clearly an adult is rejected. Critics use the same tests.
- Everything spicy stays in island/private/rewards/ until he picks, never on a public page or in the public repo.
- A short scene text about her, a rating that fits (`nsfw` for implied nudity), close or portrait framing, not wide room shots.
- Hard scenes: a dramatic angle per image and detail close-ups, not one frame showing everything (island/private/rewards/SHOTS.md).
- Colour words misfire at night; fix hair colour with a measured `huefix`.

## 3D characters and video

The 3D character workflow (ChatGPT chibi, then Meshy): art/MESHY.md. Video and animating a still: the animate-still skill and its reference.md.
