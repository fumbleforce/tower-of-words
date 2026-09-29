# Next creator pass

The chibi creator remains Codex's priority. The current work follows Jørgen's
[base choice](../reviews/creator-base-3/review.json) and
[idle feedback](../reviews/creator-idle-neutral-2/review.json).
Ownership and new handoffs go through [the collaboration protocol](../collab/PROTOCOL.md).
The original experiment's recipe format and controls are in
[the creator README](../tools/creator/README.md).

## Current decisions

| Area | Current state | Next action |
|---|---|---|
| Closed base body | Jørgen chose v15-flat; the simpler v16 is shown dressed beside current Mio/Eric | Read the answer to [creator-base-4](../reviews/creator-base-4/review.json) before another candidate round |
| Neutral idle | New candidate lowers the arms and increases breathing/sway | Read the answer to [creator-idle-neutral-3](../reviews/creator-idle-neutral-3/review.json) before choosing an integration target |
| Clothes and hair | Original layers and one fitted trial are available; neither fit is ready | Use the chosen body to resolve garment clearance while preserving silhouette |
| Recipe tools | Save/load, per-part fit controls and animated GLB export are implemented | Reuse these controls; the closed-base candidates still live in separate review viewers |
| Browser captures | Creator tools use the shared bounded GPU lifecycle | Use the existing capture helpers |

[Comparison evidence](creator-comparisons.md) records candidate versions, captures,
checks and limitations. Earlier attempts remain available. No candidate has been
integrated into the game. The source game models remain the visual references.

## Remaining base acceptance work

The requested result is a complete Eric and Mio base with detachable clothes,
hair and facial hair. Removing a layer must leave the body intact. Judge the
selected candidate beside its source at the same height and camera angle.

- Inspect the bare body from front, back, sides, crown and under the jaw,
  including both scalps and Eric's stubble region.
- Validate welded closure, disconnected pieces, degenerate faces, normals and
  skin weights. Topology checks alone do not establish appearance or clearance.
- Resolve own-clothing fit before exchanged outfits. Check neck, shoulders,
  wrists, waist, ankles and fringe in bind pose, idle and walk. The visible
  sleeves exist in the source top layers; exposed base arms are a fitting issue.
- Keep garment shape while removing intersections. The fit3 trial's pulled hems
  and distorted shoes show that clearance alone is insufficient.
- Check facing direction and clothing through idle/walk transitions. The main
  creator still holds its original idle at 0.4 seconds; the new breathing clip
  is available only in its review viewer.
- Inspect at game scale and close up, on desktop and phone. Show every attempt
  and record remaining seams or intersections on the review page.

The remaining facial-hair issue has a separate
[stubble diagnosis and proposed small change](creator-stubble-diagnosis.md).
It is a candidate proposal, not an implemented or approved replacement.

## Tools and handoff

The [base pipeline README](../tools/creator/base/README.md) documents generation,
viewers and capture commands. `tools/creator/validate_base.py` checks exported
arrays, topology and weights; the deformation sampler covers posed meshes.
Run the checks relevant to the actual change once, then use focused captures to
judge the geometry. Follow the current pace in C-0080 rather than repeating
historical validation batches.

After the body and layers pass, connect the approved candidate to the creator's
existing fit/save/load/export path and verify that round trip. A successful
export of the original cut-part experiment does not prove the closed-base path.
Game integration requires Jørgen's asset choice and a handoff to the integrator.
