# Station south garden (#310)

The garden already existed on the island map, but the shop street stopped short of its benches and planted approach. This bounded build opens a loop from the arcade's west passage to the garden and back along the promenade. It reuses the canonical station and platform-shed exterior. The existing station glass and platform stair boundaries stay in place.

The shared island-west plan supplies the map and world paving. The connector is `[-11.45,23.7,-5.5,25.3]`; the return around the existing southern bench is `[-13.25,25.3,-10.85,26.4]`. The return was added after checking the bench collision footprint. Both benches retain their canonical positions. The garden's covered approach is derived from the actual station-shed walkway dimensions, including overlapping navigation at its corner.

The unnamed grounds worker uses the existing grey worker body. He sweeps at two visible patches, gathers leaves toward a dustpan, carries the tools between patches and leaves them parked in the evening. The broom pole runs through his real wrist; its bristles meet the paving. The dustpan contains collected leaves, and collected ground litter stays collected across Continue. Talk pauses the routine. The first greeting offers only a currently free bench; repeat Talk points to the next visible patch; the brief busy line follows actual collecting.

The root's independent proposal was a quiet worker indicating a usable bench before returning to the job. The merged draft shortened the protagonist's reply and replaced an implied previous-day encounter with the next visible task. No new lesson, ticket, route into security, body or generated image is part of this change.

## Voice sheet and reviewed lines

Approved reader clone for the worker: polite, unhurried Japanese. The worker has a task of his own and does not explain the location to the visitor. No accent imitation or exaggerated mannerism.

- First, pointing to an actually free bench: 「あ、こんにちは。そちらのベンチ、どうぞ。」 Protagonist: “Oh, thanks.”
- Repeat, pointing to the next visible patch: 「次は、あっちを掃いてきます。」
- Busy, after gathering leaves: 「すみません、これだけ集めてしまうので。」 Protagonist: “Sure. I’ll leave you to it.”
- Finished, with tools parked: 「じゃあ、ちょっと休憩します。」

Source review precedes cloned speech generation. Every Japanese line is `overheard: true`; none uses `en:` or adds a vocabulary prompt.

## Staging and evidence

Overview faces down the station axis across the square, keeping the paving, planted beds, benches and tool activity readable. The worker's conversation uses its own saved pair view; the existing cast views retain their scope. The covered roof fades when the player is underneath it. The desktop follow view and the phone overview are separate acceptance cases.

Round 1 is retained under `game3d/shots/station-garden/round1/`. It exposed grass beneath the benches and tool pieces consumed by static merge. Round 2 lays actual square paving and names every moving tool mesh while marking it `noBatch`. The first round-2 retry was deferred once by the GPU queue; it produced no capture. Corrected phone and desktop native views are in `round2/`.

## Final validation

The independent composition critic scored the bounded garden slice 8/10 (A–H each 8), with no blocking defect in the final views. The review covered whole-area views, both benches after Continue, first/continued/finished Talk, evening and morning at 1366 and 390, desktop tool contact, and corrected phone tool contact. This accepts the garden slice using the current approved procedural kit; it does not rescore the repetitive wider lawns.

`final2/` contains the final paired conversation, both bench Continue, evening/morning and desktop follow evidence. Its two phone contact frames are rejected evidence: the worker was outside the camera. `contact-final/390-sweep-contact.png` and `390-collect-contact.png` replace them. The corrected contact views use a closer diagnostic lens after a real walk to the worker, with both actors and all scene geometry present. The ordinary `walking-approach` frame has a passing gull across the tools and is not, by itself, contact proof. A second ordinary view, `approach-clear/390-walking-approach-clear.png`, shows the worker and tools unobstructed after the gull passes, with the same camera and wildlife present. Earlier rounds and rejected frames remain in Showcase with their limitations identified.

Validation passed on the garden branch:

- Full CPU check: 579 tests plus syntax, lint, formatting, module budgets, dependencies, story, language, bonds, Facts and story map.
- Nine focused garden checks cover canonical navigation/capsule margins, excluded glass/platform space, moving tool meshes, hand contact, crowd/player clearance, bench occupancy and routine state transitions. Fourteen integration contract tests cover the explicit place registries and static imported story composition, including rejected unresolved/dynamic composition.
- Full day test at 1366 and 390, with Carina on phone, without overrides. Existing train/forecourt/plaza/dorm performance baseline warnings remain; no baseline was raised for this change.
- Full day-1 route suite: 37/37 routes and 32/32 authored choices.
- Native garden loop both directions, covered approach and boundaries, both benches sit/stand and actual title Continue, all four Talk branches and actual title Continue, release to home FOV, evening disappearance and fresh next morning, and desktop follow. Same-period Continue preserves collected litter; a genuine next morning resets it.
- Native blocked-step fixtures placed an existing resident and crowd body ahead of the worker: each prevented movement. After restoring the fixture bodies, the worker reached the next real patch. That movement assertion does not claim the worker remained inside the ordinary camera throughout.

The final eight voiced clips use the approved reader, Eric and Carina clones. Every exported line has kana-normalized CER 0; the next-patch line required an explicit phonetic TTS override for 掃いて (`はいて`) after the first candidate misread it. The displayed Japanese remains unchanged. The voice manifest check finds all 1,598 collected clips after combining the newly landed ferry room and no escape leftovers. This is quantitative voice QA, not a claim of independent listening. Only the worker's new `sumimasen` span was added; unrelated old span results were not changed.

The root reviewed the final runtime adapter and narrow static story reader without a concrete source finding. The reader resolves the actual imported literal composition and rejects dynamic/unresolved calls; it adds no scanner exemption or budget increase. Showcase and the eight audio files use an explicit asset scope, with no private sources or broad asset pruning.

The public-only Bible check inspected 278 routes and 5,047 distinct references. It reported 307 missing historical worktree references (old reviews/creator/contest media and notes), with no station-garden error. This is a failed broad archive audit, not a passed Bible check; the new Showcase images and entry resolve.
