# Overlay checks

2026-09-29: shared GPU browser slot, 1366×1000 desktop and 390×844 phone.
Both characters loaded, with no page errors or horizontal overflow. Original mesh positions matched the
normalized source array exactly (maximum coordinate difference 0). The original bone-position comparison
was removed after C-0108: both skeletons come from the same source, so it could not detect a bad base export. Exercised front/side/top/back, bare/dressed, face framing,
source colours, wireframe and each model's visibility switch. Screenshots were inspected on desktop and phone.

The baseline remains v16, which Jørgen rejected. Magenta skin visibly protrudes through grey candidate
clothing. This is a tool for seeing the defects, not a repaired model. The static check covers bind pose only.

`v16-face-distances.json` records root Codex's geometric comparison: source head-bone skin triangle corners
and centroids to the nearest v16 base triangle. It is an unsigned surface-distance sample at bind pose,
measured in full source standing-height units. It does not measure textures, silhouette, or animated clearance.


## C-0108 follow-up

One shared GPU browser job checked 1366×1000 desktop and 390×844 phone. Both characters loaded without
page errors or horizontal overflow; source coordinate differences remain 0. The bounds panel now measures
actual vertex positions. For example, Eric’s source x extent is [-0.3013, 0.3002], while the bare v16 base is
[-0.3190, 0.3195]. Mio’s source reaches y=1.0000 and her bare base reaches y=0.8741. Full source bounds include
hair and clothes, whereas base bounds include the hidden scalp/body. These are extent comparisons, not face
matching scores. The existing surface-distance samples above record the rejected face differences separately.

The composite was checked with solid red and blue render inputs, reading the actual WebGL output pixel.
At 65%/65% the pixel was [188, 0, 188], giving equal contributions. At 100%/0% it was [255, 0, 0]; at 0%/100%
it was [0, 0, 255]. Swapping 25%/75% to 75%/25% exchanged the red/blue channels exactly ([137, 0, 225]
and [225, 0, 137]). Both viewport sizes produced the same results. Front/side/back/top, face framing,
bare/dressed, wireframe, source textures and layer visibility still worked. Desktop and phone screenshots
were inspected after the fix.

The review links and viewer now identify v16 and fit3 as local exports. README gives their location and the
source export/v16 generation commands for a clean clone; no candidate asset was committed or uploaded.
