# Room 203 kitchen-to-bedroom passage

Issue #325 follows the in-game feedback saved in `notes/feedback-game/2026-10-07_105012/`.
The camera-retention half of that feedback is handled separately by #324.

The original follow enclosure capped the doorway at 1.0 room units. Eric's default
body is 1.416 units tall and Carina's is 1.322 in this room. The opening was 0.74
wide, with its two navigation blockers repeating the endpoints as literals.

The opening is now 0.96 wide and 1.48 high, below the existing 1.55 ceiling.
The wall meshes, threshold and navigation share the layout dimensions. Two
frosted telescoping leaves park beside the opening and fit within the existing
right wall. Their lower portions appear in overview; the matching upper portions
appear with the full room enclosure. The kitchenette, bath and exterior door
retain their layout. Character scale is unchanged.

## Captures and checks

All attempts are retained in `game3d/shots/dorm-doorway/` and listed in the Showcase
entry `dorm-doorway-20261007`. The native checker walks Eric and Carina through
both directions at desktop size and walks Eric through both in phone overview.
It checks camera yaw after real relative mouse input, arrival positions, the
newly accessible width of the walk grid and public-only loading. Close range
uses the existing follow camera's first-person compression; third-person frames
show the characters as they clear the opening. No camera policy changed.

- `baseline1`: the test's missing settings version reset the requested camera
  mode; retained failure image.
- `baseline2`, `candidate1`: successful movement, but the initial native mouse
  turn was sent before pointer capture settled. Direction labels are unreliable.
- `candidate2`: the added direction assertion caught a native turn mismatch.
- `baseline3`, `candidate3`: verified directions and successful walkthroughs.
- `baseline4`, `candidate4`: same walkthroughs with the game's full-frame
  performance recorder. Earlier raw renderer counters show only the final
  postprocessing pass and are not valid total draw counts.
- `candidate5`, `candidate6`: the 2560×1440 turn hit the native harness’s 1600px
  display edge; both assertion failures are retained.
- `candidate7`: partial 2560×1440 capture; Carina’s second native pointer capture
  timed out after viewport resize. All frames and the failure are retained.
- `candidate8`: 2560×1440 walkthrough renders, with native turns made at 1366×860
  within the harness display before restoring the larger viewport, plus phone overview.

CPU checks pass, including two geometry regressions: default Eric head-height
clearance with solid jambs/lintel, and parked leaves that do not block the opening
or protrude beyond the flat. The native test also checks the walk grid at x=-0.42,
inside the newly widened side of the passage. Full day tests pass at 1366×860 and 390×844 with no overrides.
The CPU run passed all 649 unit tests. Logs and full-day artifacts are retained
alongside the capture evidence.

At quality 1, phone median/peak draw calls remained 110/132, and median triangles
rose from 80,754 to 80,790. Native desktop median calls rose from 229 to 230;
peaks rose 325 to 329 for Eric and 331 to 335 for Carina. Phone median/p99 frames
were 16.7/16.8 ms in both runs. These are this machine's GPU results, not phone
hardware measurements; desktop tail frame times include entry and capture work.

The checker is `game3d/tools/dorm-doorway-check.mjs`. `URL` selects the served
checkout; `OUT` selects a unique capture folder. Its default URL targets the
main local game after landing. It never posts feedback or loads protected assets.

Independent source and visual review found no blocking issue and scored the
scoped doorway 8/10. It explicitly excluded the inherited northbound follow-camera
framing (6/10): close range hides the protagonist, then brings the head close to
the lens as space opens up. This patch does not claim whole-room or camera
acceptance. The full review is retained with the capture evidence.
