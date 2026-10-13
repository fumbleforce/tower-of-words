# Carina: Jørgen's own render from the image gen dashboard (2026-10-05)

Render r261005-203349-2fd-1, seed 390617760, rdbtAnima, 896x1152, style preset "Reward, round-2 recipe", no reference, positive edited by hand.
He made this himself after rounds 1 to 8; it is the look he wants. It is the new base for Carina (portrait, then the Meshy body).

## Positive
masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, anime screenshot, anime coloring, 2d, cel shading, 1girl, solo, a beautiful Swedish anime woman in her late twenties, pale skin, perky breasts, (attractive:1.2), fair skin, flat skin colour, light natural makeup, (slim narrow build, narrow shoulders, small bust:1.3), soft relaxed teal eyes, high cheekbones, strong defined brows, strong straight nose, thin lips, long face, soft jaw, very wide-set eyes, wide space between the eyes, (blonde hair with dark roots and a few dark stripes, honey blonde and golden lengths:1.5), (shoulder-length hair:1.4), sleek long bob to the shoulders, side parting, one side tucked behind her left ear (image right), tight black knit sweater, 1 metal ear ring piercing, 2 brow piercings,  arms relaxed at her sides, three-quarter view

## Negative
worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, bad anatomy, bad hands, missing fingers, extra fingers, long fingernails, claws, extra limbs, merged limbs, text, watermark, signature, 3d, 2girls, realistic, photorealistic, render, chubby, child, loli, fat, obese, plump, closed eyes, (rim light, red rim light, red outline, backlighting:1.4), holding, holding object, tool, screwdriver, pen, pencil, cup, phone, papers, book, undercut, shaved sides, sunglasses, tinted eyewear, colored background, green background, gradient background, red hair, orange hair, cropped head, head out of frame, from behind, profile, side view, from side, black hair, (ash blond hair, grey hair, silver hair, white hair, platinum hair, dull hair, muted colours:1.3), (large breasts, huge breasts, wide shoulders, broad shoulders:1.3), canary yellow hair, neon yellow hair, (very long hair, hair past the chest, waist-length hair:1.3), (close-set eyes, narrow space between the eyes:1.3), circle, halo, shy, sad, frown, tan skin, glossy, shiny hair, specular highlights, glossy skin, wet skin, oily skin, airbrushed, smooth gradient shading, 3d render, glossy lips, lens flare, glasses, eyewear, green sweater, multiple ear piercings

## What differs from the agent rounds (round 7 tile 9), and probably why this works
- Eyes: "soft relaxed teal eyes" instead of "pale grey eyes". The darker, coloured iris gives a normal pupil and iris, not the stare.
- Dropped: "long eyelashes", "soft pink full lips" (now "thin lips"), "company lanyard", "thin gold chain necklace", "both eyes visible, looking at the viewer", the whole smile phrase, the head-margin weights (2.4 / 1.6) and "plain light grey background:1.3".
- "very wide-set eyes, wide space between the eyes" is kept without a weight (the agents had it at 1.5).
- Added: "1 metal ear ring piercing, 2 brow piercings", "perky breasts", "pale skin", "tight black knit sweater" (vs "fitted black knit top and small silver studs"), and "anime screenshot ... 2d, cel shading" with no "clean lineart" and no matte/thick-outline style weight.
- Negative: removed "nude, nsfw, cleavage" and added "2girls", "green sweater", "multiple ear piercings".

## Jørgen's note (2026-10-05)
"yes this is carina, also helped to say swedish anime girl rather than just swedish girl". Put "anime" in the subject of every character prompt ("a beautiful Swedish anime woman ...").

## Sweater (Jørgen, 2026-10-05: "specify her knit shirt more too so it is consistent, now every img has different sweater")
Every render came out with a different black knit. Replace "tight black knit sweater" in the positive with:
"tight black ribbed knit sweater, fine vertical ribbing, round crew neckline, long sleeves, plain, no collar, no pattern"
and add to the negative: "v-neck, turtleneck, cardigan, collar, buttons, zipper, hoodie, pattern, logo". Nothing else changes.
