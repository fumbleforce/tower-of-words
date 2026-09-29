# Overlay checks

2026-09-29: shared GPU browser slot, 1366×1000 desktop and 390×844 phone.
Both characters loaded, with no page errors or horizontal overflow. Original mesh positions matched the
normalized source array exactly (maximum coordinate difference 0); all 24 original/candidate bones had
coincident world positions (maximum distance 0). Exercised front/side/top/back, bare/dressed, face framing,
source colours, wireframe and each model's visibility switch. Screenshots were inspected on desktop and phone.

The baseline remains v16, which Jørgen rejected. Magenta skin visibly protrudes through grey candidate
clothing. This is a tool for seeing the defects, not a repaired model. The static check covers bind pose only.

`v16-face-distances.json` records root Codex's geometric comparison: source head-bone skin triangle corners
and centroids to the nearest v16 base triangle. It is an unsigned surface-distance sample at bind pose,
measured in full source standing-height units. It does not measure textures, silhouette, or animated clearance.
