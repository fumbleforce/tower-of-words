# Selected pool body derivations

The selected source files are in `../pool-swimwear-1/game/`. Their appearance approval is recorded in `reviews/pool-swimwear-1/feedback.json`. This folder preserves every local motion-repair attempt; it does not add a new appearance choice.

Current runtime candidate: `stance-17`, based on `ankle-bind-seat-8`. Only Eric/Carina need the motion corrections. Emi and Kuro B remain exact selected bytes. Runtime copies are under `game3d/assets/characters/swimwear-{eric,carina,emi,kuro}/`.

`skin_diagnostics.py`, `ankle_bind.py` and `seat_pose.py` retain the measured ankle/seat derivation. `verify_preservation.py` proves the neutral-body/weight preservation. `verify_stance.py` proves candidate 17 changes only eight lower-body rotation tracks relative to attempt 8, preserving all pelvis and upper-body animation. Rejected weight and pelvis-lift derivations remain beside them.

The final stance exporter is `game3d/tools/pool-outfit-stance-bake.mjs`. Run it once with a fresh `ATTEMPT=reproduce-raw`, then with `ATTEMPT=reproduce-final SMOOTH_FROM=reproduce-raw`. Each pass refuses to overwrite an attempt. The second pass smooths the first pass’s raw support/orientation profile. This two-pass derivation reproduced candidate 17 byte for byte; its SHA audit is `stance-17/reproduction-audit.json`. The original trial-15 profile remains local with the other attempts. Candidate 17 adds source-flight clearance to the same leg-contact solve. `pool-outfit-ground-probe.mjs` checks 721 equally spaced phases, including between authored/baked keys. Native and fixed-extrema capture tools live beside the exporter.

`publish_evidence.py` makes Showcase WebP copies of all owned PNG attempts. Source PNGs and videos remain intact. Only the used runtime binaries and Showcase copies are uploaded; unused candidate GLBs remain local. The complete results and acceptance limits live in `notes/pool-swimwear-integration.md`.
