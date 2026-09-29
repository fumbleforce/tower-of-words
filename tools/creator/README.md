# Character creator (experiment)

A test of whether Meshy characters can be cut into parts and the parts swapped between bodies and still animate. It starts from Mio and Eric. The game doesn't use any of it.

Pages (served by ./start):
- http://127.0.0.1:8771/tools/creator/: the creator. Pick a body, a part for each slot and a colour for each slot, then watch it in idle or walk.
- http://127.0.0.1:8771/tools/creator/sheet.html: the check sheet (rebuilds against the originals, mixed characters, seam close-ups). Add `?only=mix` to skip the rebuilds.
- http://127.0.0.1:8771/tools/creator/cut.html: how each model is cut, coloured by slot.

## Save a character recipe

Use **Save recipe** to download the current body, six parts, colours, height and any existing fit adjustments as a JSON file. **Load recipe** restores that file. Under **Recipe JSON**, paste an earlier copied recipe and press **Apply JSON**; **Copy JSON** keeps the plain recipe format.

Files use `{ "format": "amakawa-creator", "version": 1, "recipe": { ... } }`. Plain recipes from the old Copy button and `?recipe=` links also load. Recipes refer to the local parts library; they contain selections, not meshes or textures. Missing parts, parts in the wrong slot and unsupported file versions are reported without replacing the current character. Invalid URL recipes show the default character and an error message.

Height must be 0.1–3; optional fit scales 0.05–5 and three-axis offsets −3–3. Colours use six-digit hex values. The file limit is 64 KB. A combined GLB export remains separate work.

## How it works

- `art/parts/` is the library: `src/<id>/` holds each source model (a copy of the game's GLB, texture, and for Mio her palette face data), `anim/` holds Eric's idle and walk clips, and `library.json` lists the sources, the cut rules and the parts. A part is a list of triangles from one source.
- One shared skeleton: the Meshy API rig's 24 bones and bone axes (Eric's). Each body keeps its own joint positions. Where a body's rest pose differs (Mio's arms hang lower), its bone axes are turned so its limbs follow the clip the way Eric's do. So Eric's clips from the API library play on every body with no retargeting pass. Mio's Mixamo-style rig maps onto it by name, and her extra end bones fold into their parents.
- The body sets the proportions. A part from the other model is carried bone by bone onto the host: each bone's piece of body is measured on both models and the part is scaled to match. Hair and faces move as one rigid piece with the head.
- Tint: each part has a key colour (its main colour). Texels near the key take the chosen colour and keep their shade. Trim, soles, eyes and teal streaks stay as they are. Skin tints the head and hands from a fixed range of tones.
- `recipe.js` builds a character from a recipe, `{ body, parts: { slot: id }, colours: { hair, top, bottom, shoes, skin }, height }`. `buildCharacter()` returns `{ root, play(name), update(dt) }`. It isn't wired into the game.

## Adding a part

From a new Meshy model rigged through the API (same skeleton as Eric):
1. Put its walk GLB (any rigged GLB will do) and base texture in `art/parts/src/<id>/`, and add it to `library.json` under `sources`.
2. Give it cut rules under `sources.<id>.cut`: `skin` and `hair` colours (sRGB lists), and optionally `collar` and `hem` (offsets from the head and hip joints, as fractions of height), `faceHalf` and `eyesTextured`. Colour stats per bone print when you run the cut.
3. Run `node tools/creator/run.mjs "tools/creator/cut.html" cut.png` and look at the flat-coloured views. Adjust the rules and run it again. When it's right, run it with `?save=1`, which rewrites `library.json` with the parts.

A model from the Meshy web app (a Mixamo-style rig) works the same way, as long as its bone names match the Mixamo map in `recipe.js`.

A part generated on its own (say, just a jacket) isn't supported yet. It would have to be rigged on a body first: rig a full character wearing it, cut it out, and drop the rest.

## Tools

- `run.mjs <page> [png] [w h]`: headless run. It takes /tmp/claude-1000/browser.lock and writes any files the page hands back.
- `mio-prep.js`: Mio's face and jaw fixes, copied from game3d/js/mio.js.

## What the first test showed (2026-09-29)

Sheet: art/parts/shots/sheet.png. Review item: reviews/creator-parts.

- Works: Mio and Eric rebuilt from their own six parts match the game's models in the bind pose. Both bodies walk on Eric's API clips through the shared skeleton, including Mio, who never had those clips. Clothes swaps (Eric's jacket on Mio, Mio's hoodie and trousers on Eric, Eric's trousers and shoes on Mio) hold together in idle and walk. The seams at the waist and ankles hardly show, because both models are similar chibis. Tints work per slot and leave eyes, soles, trim and teal streaks alone.
- Weak: swapping hair or heads. Meshy models have no scalp under the hair, and Mio's face skin runs up under her bangs. With Eric's hair on Mio, a few of his fringe spikes cut across her cheek and a pale strip of her nape shows at the back. Mio's hair on Eric sits well. The fit is automatic (whole-head depth, chin aligned), so each pair of heads would need a look, and maybe a nudge.
- Animation: nothing broke that wasn't already broken. Meshy's idle clip twists and bends over after a second or two (the game holds one frame of it, and so does the creator). Skin weights carry over with the parts, so a swapped sleeve bends with the arm.
- Not done: exporting a combined GLB, fit sliders, and parts made on their own in Meshy.

## Base bodies (2026-09-29)

Jørgen's answer on creator-parts: make closed, skin-only base bodies first and put hair, clothes and facial hair on as layers. That work is in `tools/creator/base/` (README there); review creator-base-1.
