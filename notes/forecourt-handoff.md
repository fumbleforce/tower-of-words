# Forecourt handoff to Claude

2026-09-30. C-0142 transfers the whole outdoor build and integration to Claude. Codex stopped implementation when notified. Worktree: `/home/jorgen/repo/japanese/.claude/worktrees/codex-forecourt`. This is an unfinished implementation snapshot, not a validated build. Claude owns validation, completion, landing and push; Codex is preserving this snapshot only. No browser or full test suite was run by the runtime implementer.

## What is present

- Runtime order is `train -> gate -> forecourt -> office`; the day still ends in the existing office story. The later return ride, plaza, dorm court and room are untouched.
- New `js/scenes/forecourt.js` and `js/scenes/forecourt/details.js`: west station, east head-office entrance and short cutaway lift lobby, paving, planting, bicycle racks and background massing. Scene builder reported targeted syntax/lint passing; no render reviewed.
- New `js/places/forecourt.js`: camera, picking, registrations, goal markers, station arrival, save/restoration, and a place-owned lift site.
- New `story/forecourt.js`: crossing goal, entrance direction and lift departure; no voiced dialogue added.
- `places/definitions.js`, `catalog.js`, `narrative/events.js`, `main.js`: register forecourt and its required start event.
- `places/lift.js`: reads `place.liftSite || SITES[place.name]`; the source-side ride now belongs to forecourt. Existing B2 arrival and Sales ride content remain.
- Gate scene's former lift bank is one open station exit. Commuters use it. Gate place's tripOut walks Eric through it. Internal `lift`, `lift_front`, `to_lift` ids remain for save compatibility, with label Station exit. Voiced Japanese unchanged; only the two departure goals changed.
- `story/transitions.js`: new gate_to_forecourt slot and renamed forecourt_to_office ride slot.
- `places/forecourt-save.js`: exact prior-node fingerprint migration for the two changed goal arrays, old idle goal/staging text normalization, and old gate->office transition migration. Existing B2 saves finish arrival; gate-side saves take the new forecourt departure. Transition-authoritative legacy migrations clear suspended execution/queue while retaining onceDone and progression.
- `ui/title.js` and `places/catalog-train.js` are small extractions to keep existing module budgets from growing. Budget exceptions were reduced or retired; no waiver added.
- Facts/check source map, fast preload list and trace-clock preload/expectation include forecourt. `docs/game/places.md` builds on root's planned docs commit 839dfae, with built forecourt tables and updated gate/lift route. Affected storyline docs are updated.

## Immediate blocker and unverified edges

1. Scene agent's commit hook stopped at `tools/assets/runtime-data.mjs:19`: `game3d/js/places/forecourt.js: unsupported preview anchor for station_exit`. The new helper is named `anchor`, while that scanner accepts v3/carPt calls or inline arrow functions. Pending minimal fix: direct arrow anchors using the scene coordinates, or a scanner-supported v3 signature. Root authorized this narrow handoff cleanup: the three anchors now use direct arrow functions. The combined commit hook is the only subsequent validation attempt. Its next blocker is recorded below. The obsolete anchor helper was removed as part of the same authorized cleanup.
2. The combined commit attempt failed before CPU checks: `asset sync: FAIL asset library scan failed (KeyError: 'forecourt'); only the roots were read`. It reported 1629 used files and 1673 lock entries, then generic advice to run asset sync push. No upload, retry, full CPU gate or browser run followed. No commit was created. All 27 handoff files, including runtime, scene, facts and this note, are staged in the worktree. The asset library's place/room metadata needs the new forecourt entry. Do not label this snapshot tested.
3. Gate's watched departure heads north in its existing indoor coordinate frame; forecourt arrival heads east out of the station. Both keep Eric visible, but their crossfade framing/turn has not been visually checked. Do not claim seamless alignment from source alone.
4. Forecourt camera uses the scene-provided yaw/elevation/fov; its fit frames the ground route and can crop the tower. Phone, desktop, cutaway lift occlusion and doorway navigation still need the owner's focused check.
5. Forecourt save stores player pose and landing progress; restore currently restores the landing target from progress. During a trip, the existing arrival replay owns the lift's fresh-process reconstruction. Old node fingerprint migration is deliberately restricted; unrelated changed nodes retain existing recovery behavior.
6. No reverse travel mechanism was added. NEXT remains a one-way day-one sequence; do not add `office -> forecourt` to it without addressing story-graph and saved-transition assumptions.

## Scene contract

`buildForecourt()` returns:

- `root`, `scene`, `sun`, `nav` (all local coordinates; character scale remains K=1.18). Nav bounds are x=[-4.4,6.7], z=[-2.32,2.7], with blockers for station/office walls, planting, bike parking and lamp. Its north edge stops before the lift wall.
- `stationExit: [-3.8,0]`, `start: [-2.8,0]`, `officeEntrance: [3.8,0]`, `liftOut: [5.2,-0.7]`; arrival yaw is +PI/2.
- `liftSite: {x:5.2,zBack:-2.5,zFront:-2.32,hole:[4.58,5.82],wallH:2.2,floor:'1',out:[5.2,-0.7],cap:true,shaft:true}`. The attached lift's car extends north of zBack; tower massing starts behind z=-4.3.
- `liftLanding: {leaves,k:()=>lift.k}`, plus `lift: {k,want,leaves}` and `setLiftOpen(0|1)`.
- `update(t,dt)` advances landing door easing. Place.update receives `(dt,t)` and swaps arguments intentionally.
- `camera: {elev:48,fov:26,yaw:-0.18,centre:[0.8,0,-0.1],bounds:[-4.7,7.1,-2.8,2.9]}`.
- `plazaExit:[5.9,2.15]` is geometry data only; no onward trip is registered.

The runtime place explicitly declares things `station_exit/office_entrance/lift`, spots `station_exit/office_entrance/lift_front`, zone `lift_front`, empty resident people/seats, and hooks `liftOpen/liftClose`. Lifecycle injects shared Mio after registration; attachLift adds its hidden Sales riders afterward, as in the existing engine.

## Architectural decisions retained

Use one forecourt place for the outdoor crossing and entrance alcove. The lift remains an attached subscene, not another registered place. Existing lifecycle prebuild/snapshot/crossfade/tripIn stays in charge; no generalized portal framework or checkpoint-format change. `attachLift` must not attach to gate again, because it would overwrite the new outdoor tripOut. Keep new place registries explicit for AST readers. Keep geometry with the scene owner and lifecycle/save behavior with the integration owner.

The longer initial source-based integration plan is `/tmp/codex-forecourt-integration-plan.md`; this handoff records the actual implementation state and supersedes its proposed naming where they differ.
