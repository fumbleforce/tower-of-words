# Independent flock-spacing review

Codex reviewer, 2026-10-07. Reviewed the #338 candidate against `495d1585`, including birds.js, motion.js, ground-spacing.js, focused tests, the browser helper and the places.md fact change. No remaining correctness findings. This is an independent Codex review, not cross-team approval.

Two findings were corrected during review: the original radius missed a pigeon touchdown vertex (0.349523 versus 0.345 at unit scale), and unrelated sparrows could satisfy the original return observer. The final radius uses 1.2; an actual touchdown/settling geometry test covers the first issue. The observer now requires the approached pigeons to leave the ground and at least three to return.

Independently ran the six focused tests: all passed. Reviewed all ten images in `game3d/shots/flock-spacing/final3/`, plus the previous final attempt and selected baseline comparisons. Final3 reports 1,807 desktop and 1,873 phone samples, zero ground-clearance violations, 496/486 walking or hopping observations, maximum ground populations of 8/6, and pigeon departure and return at both sizes. The phone diagnostic shows all four pigeons clear of the HUD.

Visual score under notes/VISUAL_QA.md: 8/10 for the final native views and flock diagnostics; A8, B8, C8, D8, E8, F9, G8, H8. No visible bird overlap in the final captures. Grounding, scale, spacing and existing scene materials remain coherent.

Limits: the browser measures conservative horizontal clearance circles, not triangle intersections or airborne paths. Browser coverage is Works at 1366 and 390 pixels, supplemented by multi-scale, cross-group and pending-arrival unit coverage. Stills do not independently establish animation smoothness. The author reports both strict full-day routes passed; this reviewer independently reran only the six focused tests.
