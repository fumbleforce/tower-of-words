# Game performance optimization report

Start with loading only the characters and places needed to begin playing, then limit how much scene data stays in memory. Smaller changes can reduce unnecessary rendering while paused and repeated input/UI work. The current renderer already batches geometry, uses lighter phone textures and warms shaders. Those optimizations should be preserved.

This report covers the public game at commit `80276df45`, inspected on 11 October 2026. It proposes work and makes no runtime changes. The three first work packages are tracked in [#465](https://github.com/fumbleforce/tower-of-words/issues/465), [#466](https://github.com/fumbleforce/tower-of-words/issues/466) and [#467](https://github.com/fumbleforce/tower-of-words/issues/467).

**What the fresh measurements show**

Five places were opened separately at phone medium quality and desktop high quality. Phone measurements use a 390 × 844 touch viewport. Desktop measurements use 1366 × 860 and include the overview plus eight follow-camera directions. Draw counts include all render passes. Each view uses the upper median of four frames, with the busiest view reported. These are short diagnostic samples, not a complete playthrough or a physical-phone benchmark.

| Place | Phone draws / triangles | Desktop draws / triangles | Phone textures | Desktop textures |
|---|---:|---:|---:|---:|
| Forecourt | 213 / 310k | 518 / 910k | 61.0 MB | 178.9 MB |
| Plaza | 82 / 221k | 449 / 898k | 47.0 MB | 148.0 MB |
| Office | 166 / 245k | 495 / 783k | 62.6 MB | 222.0 MB |
| Shop street | 86 / 136k | 479 / 635k | 75.1 MB | 260.0 MB |
| East coast | 78 / 152k | 503 / 675k | 57.5 MB | 225.6 MB |
| Normal budget | 200 / 300k | 500 / 800k | 96 MB | 192 MB |

The forecourt, plaza and desktop texture excesses mostly have existing budget exceptions. East coast's 503 draws were slightly above its 500 limit in this sample. After measurement, commit `9c964375c` landed the #456 batching fix, whose author reports a reduction from 505 to 443 draws. This report has not remeasured that change. All five places stayed within geometry-memory budgets. No page errors occurred in these ten loads.

Texture figures are scene-resource estimates from the existing measurement helper, in decimal MB. They exclude render targets and other cached scenes, so they are not total GPU memory. Local phone loads took 5.98–6.94 seconds with 4× CPU throttling. Desktop loads took 2.96–6.07 seconds. Plaza's 6.07 seconds exceeded the 4-second target, including its 15% allowance, and warrants repetition. These loads used a shared desktop GPU, localhost and no network throttling. Treat them as diagnostic ranges, not release download times or phone FPS. Raw results and the probe are in [the measurement folder](../game3d/shots/performance-report-20261011/). Current limits are in [place-budgets.json](../game3d/tools/perf/place-budgets.json).

**1. Load fewer things before play begins. High priority, medium effort.**

`cast3d.js:46–54` awaits the assets for all eight named NPCs during module evaluation. `places/factories.js:2–27` statically imports all 26 places. The player and Mio also load sequentially in `main.js:448–457`. This puts work for later encounters on the startup path.

Load named characters through each place's preparation step, change place factories to dynamic imports, and start the player and Mio loads together. Keep the existing next-place preparation. For web releases, build a small startup bundle and separate place/shared chunks. The current vanilla transform minifies without bundling (`tools/release/flavor.mjs:8–13`).

Expected benefit: earlier title and first playable frame, fewer initial requests and less initial parsing. Measure cold and warm startup on the actual release, including transferred bytes, request count and first conversation readiness. Do not claim a percentage saving until that comparison exists. Follow-up: [#465](https://github.com/fumbleforce/tower-of-words/issues/465).

**2. Put a memory limit on prepared places. High priority, larger effort.**

`places/lifecycle.js:89–144` stores each prepared place indefinitely. Entering another place calls the previous place's `leave()` but does not evict its scene. This makes repeated travel a different memory problem from the isolated-place checks above. The earlier travel sample and its limitations are recorded in [PERF.md](PERF.md#fast-travel-memory).

Keep the current place, likely next destinations and a small recent-place cache. Evict older scenes by estimated memory, with shared-resource ownership so one scene cannot dispose a texture or geometry still used elsewhere. Persist visit and story state independently of scene objects. Three.js GPU resources require explicit disposal, as described in its [cleanup documentation](https://threejs.org/manual/pages/cleanup.html).

Expected benefit: bounded memory during exploration and fewer memory-pressure failures on phones. Verify a repeated route through many places, then revisit them and Continue from a save. Record total retained resources and heap after collection. The success criterion is a stable memory plateau without lost state. Follow-up: [#466](https://github.com/fumbleforce/tower-of-words/issues/466).

**3. Remove repeated rendering and presentation work. High priority, small to medium effort.**

The paused loop still renders every frame (`main.js:363–366`), and every draw refreshes shadows (`perf/view.js:93`). Render a paused world once and invalidate it when the camera, viewport, settings or scene changes. Preserve any intentional animation. This primarily targets battery use and heat while menus are open.

Movement may run several simulation steps per displayed frame, but marker layout and UI updates run inside every step (`main.js:370–438`). Update visual presentation once after the final step while keeping movement and story triggers at their required frequency. Marker writes followed by tooltip layout reads (`engine.js:265–328`, `ui/pin-tip.js:151–170`) also deserve a browser profile for forced layout.

Desktop pointer movement immediately raycasts targets (`main.js:241–253`, `gameplay/pick-volumes.js:164–185`). Coalesce hover picking to once per displayed frame and cache bounds where safe. Keep click picking immediate. Measure paused GPU activity, mouse-movement CPU time and long frames independently. Follow-up: [#467](https://github.com/fumbleforce/tower-of-words/issues/467).

**4. Reduce desktop character texture memory selectively. High priority for lower-memory desktops, medium effort.**

The phone already selects smaller skins through `perf/skin-tex.js`. Desktop generally keeps the original skins, with existing exceptions for some crowd models. The fresh sample puts office, shop street and east coast over the 192 MB target.

Try 1024 textures for characters seen at a distance, retaining 2048 where close shots need it. Halving both dimensions reduces the uncompressed texel storage of that individual texture by 75%. It does not reduce the whole scene's memory by 75%. Compare faces, glasses and clothing in close conversation views before accepting a tier change.

GPU-compressed KTX2 textures are a later alternative if resolution changes lose visible detail. Prototype on a few approved skins first, including decode time and device support. Three.js provides a [KTX2 loader with renderer capability detection](https://archive.threejs.org/docs/examples/en/loaders/KTX2Loader.html). The historical work is #373, but that issue's completed phone pass does not resolve the remaining desktop exceptions.

**5. Target the forecourt and plaza's remaining geometry cost. Medium priority, medium effort.**

The fresh sample confirms excess triangles in both desktop scenes and excess phone work in the forecourt. Existing fixes already include spatial batch splitting and simpler shadow geometry. Further generic batching could increase memory or make culling worse.

Attribute the busiest views to vegetation, characters, carried props and shadow passes first. Then test distance-dependent vegetation detail and tighter visibility bounds while preserving the requested planting and silhouettes. Measure the same camera positions before and after, including arrival and crowd movement. The target is the normal budget, not a higher exception ceiling. Existing exceptions refer to #374, whose completed interior work left these outdoor costs unresolved.

**6. Export animation clips without repeated model meshes. Medium priority, medium effort.**

`avatar.js:261–265` loads walk, run and sit GLBs. Only the walk scene becomes the character model (`:275`), while run and sit contribute animation clips (`:305–308`). Those files can still carry a full duplicate model. The two public crowd models' four run/sit files total about 7.82 MiB, whereas their animation buffer views total about 0.61 MiB. That difference indicates removable payload, not a guaranteed final export saving.

Export one shared model with its clips, or animation-only files that bind to the same skeleton. Check bone names, seated poses, transitions and gait. Measure transfer, parse time and retained CPU arrays. This can improve loading without lowering visual quality.

**7. Make browser updates and offline returns reuse assets. Medium priority for web play, larger effort.**

`index.html:48–65` gives mapped modules a global build version. Several asset loaders also use that version, so unchanged files receive new URLs after a build. If fetching the manifest fails, startup substitutes the current timestamp. No service-worker cache was found in the public runtime.

Use content-based versions for production assets and preserve a coherent last-known build manifest. For browser play on the train, consider downloadable route content with explicit update and storage handling. Verify an offline cold reopen, a saved-game Continue, an interrupted update and storage eviction. Electron's local distribution makes this less urgent for desktop play.

**8. Profile render-target and batch bookkeeping costs before changing them. Lower priority until measured.**

`post.js:311–318` creates a half-float target with four MSAA samples. Test lower sample counts on phone tiers, checking edge quality and outline depth behavior. Also measure `perf/batch.js`'s existing `stats.checkMs`: its per-frame transform/material checks protect moving story objects from stale batches. Optimize proven overhead, starting with unchanged outline membership, before weakening those safeguards.

**How to accept the work**

Use paired release builds on the same device and route. Record cold startup, warm startup, p50/p95 frame time, frames over 50 ms, draw calls, triangles and retained memory over repeated travel. Include a real mid-range phone and a 15-minute session to expose heating and memory growth. The existing phone target is sustained 30 fps with p95 frame time below 50 ms.

The place-budget check complements this work but cannot replace it. It samples a few frames, opens places separately and uses the lower values on retry. Keep raw attempts when comparing changes so retry minima do not hide instability. Any asset-detail or rendering-quality change also needs matched visual inspection. No FPS improvement is established by this report alone.
