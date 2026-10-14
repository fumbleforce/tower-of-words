# Fullscreen scene performance, 14 October 2026

Runtime commit: `1d99b8558`, based on `6b5b9108b`. The fullscreen presenter already hides the world with `cg-on`. The frame loop now stops hidden world rendering and marker updates while story clocks, movement and tweens continue. Queued world captures get one fresh render, and closing the scene restores rendering immediately. Performance numbers measure presentation frames during the scene. Place budgets exclude those frames.

The desktop comparison ran both versions in one exclusive GPU job on the RTX 3080 with ANGLE OpenGL 4.5.0, High quality, no frame limit, a 2327 × 1196 viewport and DPR 1.1. A generated neutral bitmap covered the world, with a blurred background, slow image movement and a masked opening. Tests blocked service workers and protected routes, with private mode off.

| Covered scene | Baseline | Candidate |
|---|---:|---:|
| Presentation FPS | 60.0 | 60.0 |
| World renders in four seconds | 240 | 0 |
| Sampled world draw calls | 458 | 0 |
| Sampled world triangles | 732,591 | 0 |
| Mean render CPU time | 5.86 ms | 0 ms |
| Marker updates in four seconds | 240 | 0 |
| World clock advance | 4.00 s | 4.00 s |

The reported 7–9 FPS was not reproduced. Both versions already reached 60 FPS in this public reproduction. The measured improvement is removal of hidden world work. The phone check at 390 × 844 used a shared GPU slot and establishes functional behavior, without a performance benchmark claim under concurrent load.

Both sizes passed the normal public `sumimasen` typing prompt through real keys, continued world updates, zero hidden marker updates, shared one fresh world render between two capture callbacks, kept rendering stopped after that capture, and restored rendering and markers on reveal. The covered and restored screenshots were inspected. An independent reviewer found no findings in the committed source and separately probed capture/reveal and metric accounting. The immutable staged CPU gate passed.

The early input smoke test failed because a temporary input did not stop game keybindings. It was replaced with the real public prompt. A later attempted baseline pin missed build query strings and loaded the candidate. The final comparison fixes that route match and asserts that the old runtime really loaded. Completed attempts are retained alongside the final evidence in `game3d/shots/cg-performance-20261014/`.

The combined runtime at `4fd06af9c` includes the separately reviewed physical-matrix optimizations. Full-day checks passed at 1366 × 860 with Eric and 390 × 844 with Carina, with no overrides, overlaps or spins. Both final screenshots were inspected. The checks retain existing performance baseline warnings under shared GPU load and do not establish isolated frame-rate gains.

A final diagnostic-only review found that toggling the cover could reset counters owned by an active `__perfHold` sampler. The follow-up changes one reset condition and adds two actual-metrics regressions. The ownership test fails on `1d99b8558` and passes after the correction. Ordinary gameplay does not use that hold, so its behavior is unchanged. The existing full-day runs are reused for that normal path.

