# Character pipeline: research and recommendation

Work item #171, track C (2026-10-01). Research only; nothing here is built or approved. The target is [mio-ref-clean/final.png](../art/parts/style-concepts/mio-ref-clean/final.png). Budgets are in [PERF.md](PERF.md); art rules (Meshy credits, no simplifying generated meshes, private content) are in [GUIDE.md](../GUIDE.md).

## What the three rejections say

- [char-style-1](../reviews/char-style-1/review.json): nine styles, all rejected.
- [char-face-1](../reviews/char-face-1/review.json): anime face textures on faceted bodies all "look the same" and bad. The picked direction was the picture itself.
- [char-mio-i2i-1](../reviews/char-mio-i2i-1/review.json): matching the silhouette is not the point. The facets have to sit where an artist would put them, with flat colour per face and no projected texture.

So the gap is the modelling itself, edge by edge. Rendering tricks and pipeline plumbing come later.

What the target picture does:
- Every facet is placed on purpose. Hair is a few big planes with sharp tips, and the hoodie folds are long triangles that run with the cloth.
- The colour changes from facet to facet, but this is painted variation, not lighting. The legs alternate light and dark teal by plane.
- The face has almost no facets: flat skin, drawn anime eyes and brows, a one-stroke nose and mouth.
- The outline is thin and dark, only round the silhouette.

## How shipped games do it

- Guilty Gear Xrd (Arc System Works). Every model is built for its shader. The artists edit vertex normals by hand; face normals are transferred from a sphere so the shading reads as one drawn shape. Vertex colours force areas like under the chin into shadow, and outlines are an inverted hull (a slightly bigger copy of the mesh, drawn back-faces only, in black). Sources: [Motomura GDC 2015 talk (PDF)](https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf), [BlenderNation summary](https://www.blendernation.com/2015/07/26/junya-c-motomura-behind-the-scenes-of-guilty-gear-xrd/), [ASW outline control talk](https://www.docswell.com/s/ASW_Academy/5LVY67-GG-Toonline-Eng).
- Genshin / Honkai (miHoYo). Smooth toon shading with ramp textures. Faces skip normal-based light: an SDF face shadow map holds where the shadow falls for each light angle. Outlines are inverted hulls built from smoothed normals. The meshes are tens of thousands of triangles, far over our budget, and the look is smooth, not faceted. Breakdowns: [Adrian Mendez](https://adrianmendez.artstation.com/projects/wJZ4Gg), [face SDF baking](https://github.com/EricHu33/AnimeShadingPlus-Anime-Toon-Shader/blob/main/Anime%20Shading%20Plus(+)%20User%20Manual%20e9875988ae1e41caa5198370d9cc963d/Face%20Shadow%20Map-%20Creation%20&%20Baking%20Workflow%20d3b8769021e04683a2f2ae4cf16ac810.md).
- Wind Waker. The eyes and brows aren't modelled. They are textures on thin shells over the face, drawn after the hair with no depth test, so they show through the fringe like in a drawing. Expressions swap the texture or shift its UVs. Sources: [polycount analysis](https://polycount.com/discussion/104415/zelda-wind-waker-tech-and-texture-analysis-picture-heavy/p2), [shader write-up](https://godotshaders.com/shader/wind-waker-style-eyes-over-hair-shader/).
- A Short Hike. Low-poly Blender models are coloured from a small palette atlas: UV islands are dragged onto colour squares, with no painted textures. Shading is flat and a soft outline keeps the models readable at a low resolution. Source: [PlayStation Blog](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/).
- Modular kits (Synty POLYGON Modular Hero, Quaternius Universal Base Characters with outfits, CC0, glTF): one base body per body type, one skeleton, and hair and outfit parts skinned to that skeleton and swapped by showing and hiding them. The look isn't ours, but the structure is the standard one. Sources: [Quaternius base characters](https://quaternius.com/packs/universalbasecharacters.html), [Quaternius outfits](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html).

At our game camera (56°, phone), a face is a few dozen pixels tall. At that size you can read the hair shape and colour, the outfit's colour blocks, and two eyes. Dialogue close-ups use the 2D portraits. So the detail budget goes into the hair silhouette and the large planes; the face needs big, high-contrast eyes and brows and little else.

## Tools, cost and what to expect

| Tool | What you get | Cost (Oct 2026) | Fit for us |
|---|---|---|---|
| [Meshy](https://docs.meshy.ai/en/api/pricing) | Image to 3D, Low Poly Mode, free remesh, free auto-rig, 600+ animations on paid plans | Pro $20/mo = 1,000 credits; image to 3D 20 to 30 credits | Good for rigging, animations and volume guides. Its facets fall where the remesher puts them, the look already rejected. |
| [Tripo](https://www.tripo3d.ai/pricing) | Image to 3D, Smart Low Poly, auto-rig with T-pose | Pro $20/mo = 3,000 credits (~200 models) | Same as Meshy and cheaper per model |
| [Rodin Gen-2](https://developer.hyper3d.ai/api-specification/rodin-generation-gen2) | Cleanest topology of the services; quad mode at 4k/8k/18k/50k faces | Creator $30/mo (~60 models) | Best generated base mesh to retopologise over. Still not hand-placed facets. |
| [CSM Cube](https://en.wikipedia.org/wiki/Cube_3D) | Image or multi-view to 3D | $20/mo = 100 credits | Nothing the others lack |
| Luma Genie | | [Shut down for new generations, Jan 2026](https://alternativeto.net/software/luma-ai-genie) | Skip |
| [TRELLIS.2](https://www.3daistudio.com/blog/trellis-2-vs-hunyuan-3d-differences-explained) (Microsoft, MIT) | Local image to 3D, 4B parameters | Free, local | Volume guides on our GPU. Untested on the 3080's 10 GB. |
| [Hunyuan3D 2.1](https://arxiv.org/html/2506.15442v1) (Tencent) | Local image or multi-view to 3D with PBR | Free, but the community licence excludes the EU, UK and South Korea | Check the licence before using it for anything shipped |
| [Mixamo](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) | Auto-rig and a large clip library | Free, unmaintained | Source of idle and walk clips to retarget |
| [AccuRIG 2.0](https://www.cgchannel.com/2025/07/rig-and-animate-3d-characters-for-free-with-accurig-2-0/) | Biped auto-rig with fingers, ActorCore clips | Free, commercial use allowed | Good rig for a hand-made base body |
| [UniRig](https://github.com/VAST-AI-Research/UniRig) | Local skeleton and skin-weight prediction | Free, MIT | Fallback if the services won't take a mesh |
| [VRoid Studio](https://vroid.com/en/studio) | Anime body, face, hair and outfit editor; VRM 0/1 export with polygon reduction, material merging and texture atlas | Free; you set the licence of what you make | Strongest ready-made anime base. Proper face expressions (blend shapes), a standard humanoid rig, and [three-vrm](https://pixiv.github.io/three-vrm/packages/three-vrm/examples/) loads it with the MToon toon material and spring-bone hair. The look is smooth anime, not faceted. It's a Windows/macOS desktop app, so it needs Proton on this machine or someone at the controls. |
| Commissioned artist | A base body, rig and kit to our spec | No reliable price found. [Upwork lists](https://www.upwork.com/services/character-modeling/get/low-poly) $80 to $350+ for simple low-poly characters; a skilled faceted anime artist will cost more, so ask for quotes | The surest way to get the hand-crafted look, if the brief is a kit spec (below) and not a one-off model |

Image to 3D, then decimation, gives random facets. That is the "square edges, zero hand-crafted look" result, and GUIDE already rules out simplifying a generated mesh. Generated meshes are useful only as a hidden volume guide under hand-placed geometry, and for their rigs and clips.

## A reusable kit for this game

- One skeleton with VRM humanoid bone names, so VRoid, Mixamo, AccuRIG and Meshy clips retarget by name. Idle, walk and a few talk gestures are made once and shared by the whole cast. tools/creator already plays shared clips on several bodies ([README](../tools/creator/README.md)); reuse its recipe format and shared-skeleton code.
- Two or three base bodies (slim woman, man, older or heavier), modelled nude and complete in the faceted style. The body is split into regions (torso, upper arm, forearm, hand, thigh, shin, foot, neck). Codex's creator showed that bodies cut out of clothed models leave holes.
- Parts per slot: head (face shell), hair, top, bottom, shoes, extra. Each part is skinned to the shared skeleton in Blender and lists which body regions it covers. The loader drops covered regions, so no skin pokes through and hidden triangles aren't drawn.
- Colour: per-face colours come from a small palette atlas (the A Short Hike method), and a character's colours are a palette row. Recolouring a part for another cast member or a background person means a new row, not a new texture.
- Face: a few flat front planes with custom normals pointing straight forward, so light doesn't break the face into triangles. Eyes, brows and mouth sit on a shell texture from a small per-character face atlas, drawn over the hair (the Wind Waker method). Blinking and expressions shift a UV offset uniform. No blend shapes are needed at game size.
- Outline: an inverted hull put into the same mesh, with a vertex flag the shader uses to push it out and colour it dark. That gives an outline without a second draw call.
- Loading in three.js: load the part library GLB once per body type. For each character, merge the chosen parts and uncovered body regions into one SkinnedMesh (BufferGeometryUtils.mergeGeometries, shared skeleton), with one material and the palette and face atlases. That is about one draw call per character plus its shadow; ten people on screen cost about 20 calls of the 200 budget. Rough triangle targets: 3k to 6k for cast, 1.5k to 3k for background people.
- Background people: random recipes from the same kit and palette. If crowds grow past a few dozen, bake the walk into a vertex animation texture and use InstancedMesh.
- Outfit modes: a recipe holds named outfit sets (day, work, revealing). Switching sets rebuilds the merged mesh in a few milliseconds. The revealing parts follow GUIDE's private-content rule: they live in the private area and load only when that mode is on, so the bodies under them must be finished to the same standard from the start.

## Recommendation

Each attempt so far failed on facet placement and the face, so the first tests are small slices of exactly that. Every candidate is Mio's head, hair and face plus the hoodie's upper body, judged at the game camera and close up beside final.png, as one Review item.

1. VRoid baseline (cheapest; also tests whether smooth anime is acceptable). Build Mio in VRoid from her approved portrait and export VRM with reduction (2 materials, 2048 atlas). Load it with three-vrm at the game camera beside the current Meshy Mio. Then make one variant with flat-shaded hair and hoodie, normals split per face. If he likes either, VRoid gives the rig, expressions, outfit editing and the base body for the kit almost for free. Needs one person or agent at the VRoid GUI for an afternoon.
2. Facets traced from the picture (the next step his char-mio-i2i-1 decision asked for). The facets in final.png are flat colour regions, so a segmentation of the picture gives the facet polygons and their corners directly. Lift those corners into 3D over a TRELLIS.2 or Rodin volume guide (hidden, never shipped), keep one flat colour per face from the picture, and build sides and back from a turnaround of the picture made on the local GPU, with every view judged before modelling. Head and hair first, then the hoodie. The face uses the shell texture above, taken from the picture's face.
3. Ask a professional for quotes in parallel. Send final.png and the kit spec above to two or three artists whose portfolios show faceted low-poly anime work: one female and one male base body, the rig, and Mio's and Eric's hair, face and outfits as kit parts. This costs nothing until he picks a quote, and of the three it is the likeliest to look "pretty". Rule out any artist whose portfolio has no faceted or anime characters.

After a pick, build the kit around the winner in this order: base body and rig, Mio and Eric parts, shared idle and walk, the merge loader, then the rest of the cast and background recipes. Meshy credits are only for rigging or clips the free tools can't give.
