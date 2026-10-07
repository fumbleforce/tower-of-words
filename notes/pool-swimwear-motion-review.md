# Independent pool motion review, 2026-10-07

Reviewer: `codex-exec:pool_motion_critic`, a fresh agent with no implementation history. Scope: the selected ordinary pool bodies, motion repair and their pool integration. Source base: a7152582, with the owned pool changes and exact `stance-17` runtime files. [Runtime hashes](../art/parts/pool-swimwear-runtime-1/stance-17/runtime-copy-audit.json) identify the reviewed binaries and JSON clips. [Integration audit](pool-swimwear-integration.md) records the implementation and rejected attempts.

## Reviewer result

Bounded verdict: **8/10; no observed blocker** for the approved pool-body integration.

Feet, ankles and knees read coherently; diagnostic heads and feet remain framed; seated pairs, water poses and dialogue remain readable. Scores within the affected scope: A/B/C/D/E 8, F 9. Approved designs and the wider environment were not rescored.

No abrupt whole-body lift was identified in sampled frames. Preserve the distinction between steady head ranges and full run-window ranges: Eric 13.14 cm, Carina 7.57 cm. Source audits establish unchanged steady head tracks and preserved source run-flight samples; they do not alone prove continuous smoothness.

The temporal review used decoded frames at 2 fps, plus Eric’s final actual-strides segment at 8 fps, approximately 15.3–17.3 seconds. Those frames show forward travel, alternating support and expected recovery bend. The recording holds the last mid-stride pose from approximately 16.5 seconds onward, so it does not visually establish a fully settled idle. Sampled frames cannot certify continuous real-time smoothness.

The uncut and tail videos retain earlier setup where characters can leave the frame. The strict full-body framing assertion covers the measured diagnostic stride segment, not that earlier setup. The rejected stance16 late Eric run capture remains preserved.

All eight final diagnostic stills show complete heads and feet. All eight Runner6 stills keep the active protagonist and speaker readable, the bench pair clear, water poses coherent, and text legible. Reports confirm actual dry bench contact and cleared swimming state after title Continue.

## Evidence inspected

All paths below are relative to the repo root. The source captures remain intact; public copies are indexed in [Showcase](../showcase/pool-swimwear-20261007/entry.json).

- `game3d/shots/pool-outfits/stance18/1366-eric-{walk,run}-{4,12}.png` and `390-carina-{walk,run}-{4,12}.png`: all eight stills, plus `report.json`.
- `game3d/shots/pool-outfits/stance18/1366-eric-actual-strides.webm`, `1366-eric-strides-tail.webm`, and `390-carina-strides-tail.webm`: decoded temporal samples.
- `art/parts/pool-swimwear-runtime-1/head-phases-17/stance-17-eric-{walk,run}-{min,max}.png`: all four fixed-lens head extrema.
- `art/parts/pool-swimwear-runtime-1/stance-17/flight-head-audit.json`: steady head and run-flight audit.
- `game3d/shots/pool-outfits/runner6/1366-eric-club_swimming_{pool,slow,length,sit}.png` and `390-carina-club_swimming_{pool,slow,length,sit}.png`: all eight ordinary pool story/Continue stills.
- `game3d/shots/pool-outfits/runner6/1366-eric-report.json` and `390-carina-report.json`: actual Runner state/contact reports.
