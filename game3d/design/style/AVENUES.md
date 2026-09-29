# Texture avenues for the world

Jørgen on the style study (2026-09-29): painted cel "looks more like evening, it is nice but doesn't add the texture to the world I was hoping for." These are directions for adding surface detail and material richness while keeping the soft low-poly shapes. Each can be tried on its own, and most combine. None of them use paper or cut-out looks.

Frame costs are estimates for the phone profile in tools/perf.mjs (mid-range Android, quality tier 1), not measurements. Build costs assume one agent.

## 1. Hand-painted tiling textures, mapped by world position

What you'd see: every big surface gets a painted texture at the right scale. Vinyl tiles with slightly uneven tone per tile and softened grout, walls with faint plaster mottling and brush marks, carpet with a woven grain, desks with a painted wood or laminate pattern, metal cabinets with a few vertical streaks. The shapes stay the same; the flat colours become painted surfaces.

Look at: Genshin Impact's interiors, Ni no Kuni II (painted textures on cel-shaded buildings).

How it's built: a small library of seamless textures (about 10 to 15: tile, carpet, plaster, laminate, brushed metal, fabric, concrete), made with our local image models using tiling (circular padding) and checked by eye. They're applied in the material patch the style study already has, by world position (triplanar), so no prop needs UVs. Each material says which texture it uses and at what scale, tinted by its current colour so the approved palette stays.

Cost: 2 to 3 days, most of it making and approving textures. Frame cost: three texture reads per pixel on textured surfaces; a moderate cost on the phone, probably a few ms. Download about 2 to 4 MB.

Risks: generated textures that don't match each other; blurring where triplanar mapping blends on rounded corners; everything looking "skinned" if the textures are too strong.

## 2. Procedural materials in the shader

What you'd see: similar surfaces to avenue 1, but computed rather than painted. Each tile gets its own small shade shift and the odd chipped corner, carpet shows a fine fibre noise and wear toward doors, plaster has soft cloudy variation, steel has brushed streaks along its length, seat fabric has a weave. Detail stays sharp at any zoom.

Look at: Astro Bot (2024) for rich materials on simple rounded shapes; Tiny Glade for procedural surfaces that still feel hand-made.

How it's built: one shader function per material type (tile, carpet, plaster, metal, wood, fabric), picked by a tag on each material, driven by world position. No textures to make or download.

Cost: 3 to 4 days of shader work and tuning per material. Frame cost: shader maths per pixel, cheap to moderate; noise that is too fine can shimmer on a small screen, so it needs a lower-detail version for the phone.

Risks: can look computer-generated or "shader demo" if pushed; more tuning than painting.

## 3. Decals and wear: the lived-in layer

What you'd see: scuff marks and a worn path on the carpet from the lift to the desks, a coffee ring on a desk, tape marks and old poster corners on walls, a water stain under the kitchen sink, cable runs taped to the floor, stickers on the server racks, shoe marks by the lobby doors, a chipped edge on the copier.

Look at: Unpacking (small signs of the people who live there), the Persona 5 hideout rooms.

How it's built: a single atlas of small painted marks (generated locally and approved as one sheet), placed as flat quads just above surfaces, drawn as one instanced mesh per place. Placed by hand at story-relevant spots plus a few rules (worn paths along the walk grid, scuffs by doors).

Cost: 1 to 2 days. Frame cost: small, one or two extra draws per place.

Risks: too much of it looks dirty rather than lived-in; the office in 3-office.png is tidy, so it needs a light hand.

## 4. Vertex colour and baked light

What you'd see: no pattern, but no flat face either. Corners and the bottoms of walls are a little darker, faces facing the windows a little warmer, large floors shade gently from the window side to the far wall, and repeated props (chairs, binders, monitors) each get a slightly different tint so the rows stop looking copy-pasted.

Look at: Monument Valley and Townscaper (gradients doing most of the work on simple shapes), Firewatch (colour doing the texturing).

How it's built: at load, a pass writes vertex colours from a cheap ambient occlusion and window-distance estimate, subdividing big faces so the gradient has vertices to live on, plus a per-instance hue jitter. Works with any of the other avenues.

Cost: 1 day. Frame cost: none at runtime; slightly longer place load.

Risks: it adds richness but not texture, so on its own it may still read as "clean 3D".

## 5. Painted surfaces made from our own art (projection from the play camera)

What you'd see: the floors and walls of each room carry an actual painting of that room in the style of our generated scenes: painted light pools, window glow on the floor, soft grime in corners, all baked in. Closest of all the avenues to the look of our generated images.

Look at: the HD-2D games (Octopath Traveler, Triangle Strategy) for painted detail on simple 3D; pre-rendered backgrounds in older Final Fantasy games for the idea of painting the room from its camera.

How it's built: render each room from its play camera, repaint it with our anime model (img2img at low denoise, with a line or depth control so the layout stays), then project the painting back onto the floor and wall planes as their textures. Props keep their own materials (or get avenue 1 or 2). Every painting goes through Jørgen's approval like any other generated asset.

Cost: 4 to 6 days for the pipeline, then an approval round per room. Frame cost: cheap (plain textures), 1 to 3 MB download per room.

Risks: the paint smears when the camera moves far from the projection angle (fine for our fixed top-down camera, poor for close-ups); lighting baked into the paint no longer follows the day clock; a re-render and re-approval every time a room layout changes.

## 6. Material-aware light: gloss, reflections and sheen

What you'd see: the lobby's stone floor and the office vinyl catch soft reflections of the windows and lamps, metal cabinet edges get a thin highlight, screens glow onto the desks around them, seat fabric has a soft sheen at the edges. The world stays untextured but surfaces start to read as different materials.

Look at: Animal Crossing: New Horizons (glossy floors in simple rooms), Luigi's Mansion 3.

How it's built: an environment map per place (one small cube map rendered at load) for all materials, roughness set per material type, and optionally a half-resolution planar reflection for the lobby floor only.

Cost: 1 to 2 days. Frame cost: the environment map is cheap; the planar reflection redraws the scene once more at half size, which the phone would feel, so it would be desktop only.

Risks: glossy floors can look plastic or wet; doesn't add pattern.

## 7. Trim sheets: one atlas of edges and panel details

What you'd see: the fine detail on man-made things. Panel lines and screws on cabinets, vents on the server racks, rubber edging on desks, a skirting board with a scuffed top edge, door frames with a painted bevel, keyboard keys, label strips on binders. The kind of detail that makes a prop look designed instead of blocked out.

Look at: Animal Crossing: New Horizons furniture; trim sheets are a standard method in most current 3D games.

How it's built: one texture atlas (about 1024 px) with horizontal strips for each kind of detail, painted once. Each prop builder in props.js assigns UVs that map its faces to a strip. Boxes are easy; rounded shapes need care.

Cost: 3 to 5 days, touching every prop builder. Frame cost: very small (one texture for everything).

Risks: the most code churn of any avenue; results depend on how well the one atlas is painted.

## 8. Small modelled detail

What you'd see: more geometry where the eye lands. Chamfered edges on desks and walls, door frames and skirting boards in relief, cables between desk and wall, rims on cups, piles of paper with separate sheets, handles and hinges. Still low-poly and soft, just less boxy.

Look at: Tiny Glade and A Short Hike (small props with just enough shape).

How it's built: by hand in the prop builders, with a shared set of bevel and trim helpers.

Cost: open-ended; about 1 day per room for a visible change. Frame cost: more triangles and some more draws; fine within the current budget if props are merged.

Risks: slow to spread across the whole world; can make the silhouettes busy, and it's the least "texture" of the set.

## How they combine

Avenue 4 goes under anything. 1 or 2 (pick one) plus 3 gives the most surface texture for the cost. 5 is the one most likely to match the polish of our generated images, and also the most work to keep in step with layout changes. 6, 7 and 8 add material and detail rather than texture. The ink lines and cel shading from the style study can sit on top of any of them.

## In the game (2026-09-29)

Jørgen picked 2, 4 and 8 (review style-avenues-room): 2 "as a toggle in graphics settings ... apply it to all the models so also the chair, flower pot gets it", 4 "over the top hard, softer version", 8 "looks good". They are in every day-1 place now, in `game3d/js/look/` (the showcase imports the same code):

- `procedural.js`: avenue 2. Every lit model (people aside) gets a surface kind from its colour or shape (tile, plaster, metal, laminate, fabric, plastic, ceramic, card, painted wood, concrete, stone, soil, a generic paint), patched into its material in place. Settings > Graphics > Surface detail turns it off and on at once (materials recompile; nothing is swapped).
- `bake.js`: avenue 4, SOFT by default (about half the first version's darkening); `?bake=hard` shows the first version.
- `detail.js`: avenue 8. props.js hands wall, door, desk, monitor, office chair, filing cabinet, shelf and plant to it, cast.js the mug.
- `index.js`: `applyLook(place, game)`, called from main.js prepare() after the lift is attached. Flags: `?plainlook` (all off), `?surf=0|1`, `?bake=0|soft|hard`, `?detail=0`.

Shots and numbers: game3d/shots/style-in-game/, review style-in-game.
