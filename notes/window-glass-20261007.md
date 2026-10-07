# Street-trial window correction (#321)

User feedback in `showcase/diorama-street-20261007/feedback.json`:
"Good progress, but what are the black boxes in every window?"

The eight-cell pane atlas paints a dark 39 × 25/34 rectangle in every window and
repeats that silhouette as a 65% shadow in the emission map. At street distance
these appear attached to the glass. The candidate removes those rectangles,
retaining the existing recessed ceiling/side reveal, room shading, varied blinds
and curtains, mullions, per-room evening brightness and procedural reflections.

Shot staging: this is the existing forecourt trial (`diorama=1`), viewed from the
paved public paths toward the office and station. The unchanged overview camera
looks down from its authored 48-degree angle. Foreground paving, planters and
people establish scale; the window surfaces remain behind the frames. Morning
uses the place's daytime light, evening its existing period callback. The same
near, far and oblique player positions are used before and after; native D input
moves along the office frontage so view-dependent reflections can be inspected.
A final lift-front view checks the existing facade cutaway. Desktop 1366 × 860,
wide 2560 × 1440 and phone 390 × 844 are separate captures. No lens or geometry is
changed to improve these comparisons.

Evidence is under `game3d/shots/window-glass/`; the initial five-view daylight
route is under `game3d/shots/diorama-street/windows-baseline-day-1366/`. Every
attempt is retained. Root released Review/Showcase metadata after its audit;
the new `windows-20261007-*` options append all 66 captures in eight groups.
Earlier rounds, feedback and review status are preserved.

The source change removes four lines from `reflections.js`; material setup,
shaders, geometry, collision, camera and the opt-in flag are unchanged. The
candidate is based on `044582f6`. Baselines use main's unchanged window atlas.
The existing ordinary glass material retains its original color and has no
trial map or environment map, verified by the native helper.

`baseline1-1366` failed because the old inspector destination (20, 1.3) was
blocked; its two completed frames and failure frame remain. The matched runs
use reachable (18.5, 1.5): baseline2/candidate1 at desktop, baseline3/candidate2
at phone, baseline4/candidate3 at wide. All six pass without console or page
errors. Every candidate frame was inspected individually. Desktop native D
input moves beside the office panes in both lighting periods. Phone framing
is unchanged and crops much of the facade; desktop and wide are the decisive
glass comparisons. Evening uses the existing lighting callback while the
story HUD remains on morning.

The captures include performance reports, with matching baseline/candidate
medians of 33.3/33.3 ms desktop, 16.7/16.7 ms phone and 66.7/66.7 ms wide. These
are screenshot-heavy shared-GPU runs, not isolated performance benchmarks or
mobile-device clearance. The change adds no textures, draws or triangles;
it removes two canvas paint operations per atlas cell. Six focused diorama
unit tests pass. Broad CPU checks pass, including all 659 unit tests, syntax,
lint, formatting, budgets, dependency and fact gates. The window comparisons
have less than 0.1 world unit of ordinary camera settling difference. The lift
cutaway views are traversal sanity, not pixel-matched pairs. Independent final
review is required before landing.

Full fast routes with `Q='&diorama=1'` and public-only interception pass at
1366 × 860 and 390 × 844, without overrides. Both have zero overlaps, spins
and long gait findings. The first phone run reached the ending but failed one
gate Kuroda gait window (idle/gait off, before the trial); a single phone-only
repeat passed. Both original attempts and the repeat remain under
`game3d/shots/fast/2026-10-07T13-00-14-*` and
`game3d/shots/fast/2026-10-07T13-02-42-699Z-2782100/`. This does not establish
that the intermittent gate animation finding is fixed.

All 66 WebPs (24,085,740 bytes) are uploaded with exact asset-lock entries,
copied to main and SHA-256 verified. The raw capture reports and asset manifest
remain in `game3d/shots/window-glass/`. No island-wide style adoption is implied.
