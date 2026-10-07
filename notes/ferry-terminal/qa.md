# Ferry waiting room, issue 308

Scope: the existing terminal ground floor is a local shelter with three recurring generic adults, ordinary Talk, four usable player seats, shared Bag reading and terminal-local eating/drinking. It has no ferry departure, ticket purchase or new lesson. Existing approved voice references are reused; no new casting or crowd model is installed.

## Review history

- Initial blockout `round1` was rejected: bare walls and sterile counter.
- `actions1` completed hooks but showed unacceptable hand gaps; it is retained as failed physical evidence. Later actual wrist carries corrected the bag and leaflet paths.
- `native5` phone was rejected for a central mullion obscuring the ferry, a foreground resident clipping the food shot, and oversized overlapping staff signs.
- Root accepted `native7` corrected window, service and milk closeups. The milk spout follows the rendered hinged spout and carton scale, then adjusts against the moved head. Both protagonists pass a stricter 0.02-unit lip-target assertion. The target is head-relative; visual mouth contact was independently checked, not inferred from a wrist distance.
- Root and the independent garden critic rejected `final-room`: approximately 55–65 of 124 square units were unused; phone framing cropped residents. Independent score was 5/10 under the C15 cap (A8, B8, C5, D7, E8, F8, G8, H6). Closeups remained a separate bounded 8/10.
- `waiting3` adds real central/east seating, a shared reading table, a canonical local-route board with leaflet ledge, supported luggage storage and fitted wall protection. Ordinary phone captures show each half after a real walk. Root and the independent garden critic accepted these actual desktop/phone views at a bounded 8/10. The table supports standing browsing; its distance from the benches is not represented as seated hand contact. The earlier 5/10 remains above.

All rounds, errors and corrected captures remain under `game3d/shots/ferry-terminal/`.

## Meaningful checks

Nine focused tests exercise actual Runner cancellation and consumed-food checkpoint replay, real room navigation, every opening/continuing story loader, original harbour-builder output parity, and registered-place map positions. The map check requires every registered place to produce finite player/goal coordinates and compares this room's origin against the existing harbour doorway and building footprint.

The consumed-food regression uses two identical inventory items. Preparation has its own node; replay starts at `eat_prepared` and cannot issue another receipt. Both native title/Autosave tests capture that exact real automatic checkpoint, reload it, verify the remaining item, and then consume that item through a new deliberate choice.

Both protagonists completed the actual resident menus and bag/leaflet/food actions in `native7`. Both new seats pass native Sit, real pose/exit checks, title Quick-save Continue and map opening in `extra-seats2`. Phone `lifecycle3` passes ordinary doorway exit/re-entry, cancellation during bag pickup and food lifting, seated Continue, all Bag document pages, evening staff closure and outside arrival. The final desktop lifecycle rerun passes the same checks.

The first lifecycle harness incorrectly used Escape on the existing written-text reader. That left it on page one and made the later exit wait time out; the corrected harness reads its pages through the normal advance control. The first receipt harness had an `about:blank` storage-init error; its functional assertions passed, but it was rerun without the invalid navigation and both clean reports are retained.

Full day-one hardware routes after the main cast merge passed at 1366×860 (71s, 12,433 movement steps) and 390×844 (72s, 12,565 steps), with zero overlaps/spins. Existing performance advisories remain in the reports; no thresholds or budgets were relaxed. These routes predate the terminal-only extra seating, which has its own actual native coverage.

## Performance and provenance

The expanded room's normal hardware views sampled a 16.7ms median and 16.8ms p99 at both sizes. Desktop calls/triangles rose from 314/42,175 to 362/46,667; phone from 219/35,033 to 260/36,429. The phone viewpoints differ because the new east waiting area is walked; these are scene-cost observations, not a controlled speedup claim. The scoped ferry/landing builders exactly preserve the original outdoor primitive calls; the full harbour navigation/population is not loaded inside.

Voice generation used a fresh terminal workspace with the cold-read source snapshot. All 38 new selected clips passed reading/pitch checks with zero fallback; actual runtime playback completed 25 keys per protagonist, covering the 12 shared resident clips and 13 protagonist clips each. `voice-acceptance.json` proves the latest main metadata is unchanged, including the inherited `irete` span, and lists the 38 locked binary hashes. This is machine qualification and actual media playback, not claimed human listening approval.

## Asset preview and presentation

The public-only scanner registers the new room and five named room props. The actual asset viewer builds and renders all six without errors, using playable room bounds rather than the sea backdrop. Its six thumbnails and eight selected Showcase PNGs are uploaded through the asset sync API and preserved in main with exact hashes (`showcase-assets.json`). The Showcase uses durable `bible/shots/showcase/ferry-terminal-1/` paths.

Final CPU gate: all 578 unit tests and every repository gate passed. The scoped public Showcase browser check renders all eight images with feedback controls and no page/protected-source errors. Final desktop lifecycle also passes with the original cancellation and contact assertions.
