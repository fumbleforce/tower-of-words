# Desktop follow camera QA

Public fresh-storage tests, private mode off; requests for protected sources fail the harness. Main baseline 68607925 plus reviewed train fix 9d287cc0 (local 6451dfba). No new art or voice assets.

## Native controls and scene ownership

`MODE=native MC=eric node game3d/tools/follow-camera-check.mjs` uses a private Xvfb display and real XTest relative input through the standard browser/GPU queue. CDP absolute mouse movement does not exercise pointer lock correctly. Passed mouse orbit, camera-relative WASD, held Shift run gait, actual focus-loss capture/key release, first Escape release/second Escape pause, map handoff, captured E on the actual izakaya door, authored dialogue, F5/F9 Continue at the same saved position, and returning to Overview through Settings.

The Continue check removes the debug `?place` override before saving/reloading. Earlier captures with that override were insufficient Continue evidence and are superseded.

## Phone

390×844 Carina selected a saved desktop preference: follow remained inactive, the capture button and desktop-only Settings row stayed hidden, and native touch map/overview worked. Full day-one phone route passed with zero overlaps, spins or sustained gait failures.

## Obstruction

1366×860 Carina, real relative mouse turns in train, office, izakaya and shop street. Finite nonzero camera distance throughout. Exact source-mesh collisions include batched originals, moving doors and instanced walls. Actor roots and render-only batches are excluded. Both normal and large-mesh paths retain exact triangle hits.

Large background lookup reduced shotengai collision median from 5.6 ms to 0.4 ms (p95 6.7 to 0.5 ms). Other medians: train 0.5 ms, office 0.3 ms, izakaya 0.1 ms. These headed Vulkan runs shared the GPU; whole-frame medians of 22–23 ms are not a quiet 60 fps claim. Raw `rooms-1366-carina.json` includes frame distribution, calls and triangles.

## Regressions found and repaired

- Deferred pointer-lock grant and Escape listener ordering are guarded.
- The authored lens is restored before fitting, menus and scenes; movement basis is cleared at handoff.
- Position-attribute identity/version and instanced geometry bounds invalidate camera caches.
- Rendered follow frustum is retained for crowd animation culling while authored lens is temporarily restored.

The first desktop route exposed ten sustained gait episodes; after visibility correction, four forecourt crowd episodes remained. Focused real-time investigation and final result follow below. No gait threshold was changed.

## Final route finding

The normal 8× desktop route now passes with zero overlaps, spins or sustained gait failures and no overrides. Obstruction was running once per physics substep, up to sixteen times per rendered frame. It now runs once on the final drawn step. All physics, gait and authored camera steps remain unchanged. The earlier trace records every moving visible crowd sample advancing phase; under amplified frame cost, .48–.72 game-second samples were nearly a whole stride cycle apart. No animation or test threshold was relaxed. The 4× full route and identical 8× overview baseline also pass. A focused real-time forecourt check records 427 gait windows with no strict-threshold episode. Raw failed reports and traces remain here.

Physical follow-only room closure now uses the actual shared-shell bounds, doorway apertures and ceiling height. Office partitions use their original wall calls. Extensions do not participate in overview light baking or shadowing; own procedural materials match the existing world. Unit raycasts verify the door opening, header and wall remain distinct. Overview and authored scenes hide this geometry.

## Custom interiors and native travel

The station closure follows its existing 3.4 m shadow-shell boundary and glass entrance header. Native standing bounds measured Eric at 1.416 m and the visible commuter at 1.330 m; the former 1.2 m doorway was too low. The actual glass/frame and matching upper-wall opening now share 1.75 m clear height, with navigation unchanged. Dorm room 203, kitchen and laundry use separate occupied-room regions, including the translated 3F frame; the outdoor corridor and roof do not gain a ceiling or height clamp. The original fading fronts are cloned with independent geometry/materials. Room entry, return to corridor and native stairs to the laundry passed. Small ceiling emission supplies approximate indirect light where existing fixtures sit above the old cutaway; it does not replace geometry. Close-range player hiding scales with the rig so a large head cannot cover the laundry view, then restores before authored rendering.

Seven-room cap fixtures verify the closure and actual setting change back to overview. Menus are intentionally disabled by the existing cap mode, so the earlier cap-pause harness attempts are failures of that fixture; native Settings/Escape are covered separately by the non-cap native matrix. Restaurant native E exit passed. Canteen native exit and re-entry are covered separately, awaiting the existing camera release before checking follow.
