# Character timeline validation

Request #280: a Gantt-style bible view of character-by-character storyline progression.

The relationship view reads ten character plans and all six bond stages from cast.md and the bond model. A matching authored scene descriptor is labelled Script written, never inferred playable. The opening-day view reads cast membership from existing story documents; stories on one day are not represented as prerequisites for one another. Character and text filters, selection details and source links work on both scales.

- Two model tests pass against the real cast plans and authored scene descriptors.
- Actual browser checks pass at 2560×1440 and 390×844: all routes/stages, character filter, search/empty state, day scale, selection, keyboard focus and no document overflow.
- All browser requests were restricted to public sources; no private source requested.
- Full CPU gate passes. Game runtime is unchanged, so no additional full-day playthrough is required for this UI-only change.
- The wider public bible checker inspected 253 routes and 4,531 resources. It still reports 195 historical missing assets, legacy notes and stale quotes, the same count as the independent exterior branch check. None refers to this timeline or its Showcase. The new timeline has its own direct browser coverage.
- Three final screenshots are backed up in the asset lock under bible/shots/showcase/story-timeline-1; no image binaries are committed.

Local route: bible/#story-timeline. The existing public GitHub Pages bible remains limited to Review/Showcase/Work; this task adds the local bible view and does not change publishing scope.
