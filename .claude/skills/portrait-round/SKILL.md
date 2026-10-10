---
name: portrait-round
description: One round of character portraits or expressions on the local GPU (ComfyUI, RDBT Anima), from the staging note to a Review item: render, frame and red-rim checks, glasses check, cut-out, contact sheet, review. Use it for any portrait, expression or concept render of a cast member, including fixes Jørgen asked for on an earlier round.
---

# Portrait round

The art rules live in GUIDE.md (Art) and art/PROMPTS.md. This skill is the order of the steps and the tools for each; read the sections it names instead of working from memory.

## Before rendering

1. Read the brief's feedback as Jørgen wrote it, and the last round's item (`python3 tools/review.py show <id>`). Pick the ONE change this round makes (GUIDE: Don't overcorrect). Sides are hers: "her left (image right)" (GUIDE: Left and right on a character mean hers).
2. Write the staging note with the shot-staging skill (~/.agents/skills/shot-staging/SKILL.md). It is for checking; it doesn't go into the prompt (GUIDE: Prompt style).
3. Build the prompt from art/PROMPTS.md: take the look from art/cast-looks.json through tools/cast_looks.py (`line(<id>)`, `negative(<id>)`), never typed in (Cast prompt lines); then the character's section (e.g. "Eric (mc) portrait", "Mio's glasses"), Structure, and Negative prompt base. Keep the quality tags (tools/production.py `Q`); the build line is part of the look. Include the weighted red-rim negative from art/PROMPTS.md ("Eric (mc) portrait") on every portrait. Base portraits hold no props; the rule and the negative words are in art/PROMPTS.md "Negative prompt base". Glasses: Mio's are fixed by the method in art/PROMPTS.md "Mio's glasses", not by words; Kuro's lenses are clear (GUIDE: Scope).

## Render

4. Take the GPU lock (GUIDE: GPU lock). Check nvidia-smi.
5. Write the round's gen.py next to its candidates in art/candidates/portraits/<round>/, on tools/comfy.py and tools/production.py, keeping one seed set so the change is the only difference. Examples: kenji-concept3/gen.py (one phrase swapped per option), eric-expressions-1 (face-only repaint). Raw PNGs go to art/production/ (git-ignored); webp copies and a prompts.json log go in the round folder.
6. Release the lock when the renders are done: free ComfyUI's VRAM (POST http://127.0.0.1:8188/free with `{"unload_models": true, "free_memory": true}`), then remove the lock only if the owner file has your name.

## Check each render

7. Run the image QA on every render of the round, straight after rendering: `python3 tools/imgqa.py <renders...> --character <who>` (it re-runs itself in ~/ai/consist/.venv; CPU only, about 3 s an image). It compares each picture with the approved game portrait (game3d/assets/portraits/<who>-neutral.webp, or `--ref`) and gives pass / warn / fail with a number for red rim, glasses, matte (cut-outs), framing and face drift. It writes imgqa.json and imgqa-sheet.webp next to the first image (or `--out DIR`). Put the red-rim number and any warn or fail in the option's note. See "Reading imgqa" below.
8. Look at the sheet's glasses insets: red dots are places on the approved frame line where this picture has no frame (or, on a cut-out, a see-through one). Glasses need a reference mask (tools/imgqa-ref/<who>-glasses.json, made with `tools/imgqa.py make-ref <who>`); Mio and Eric have one. For Mio the fix is the method in art/PROMPTS.md "Mio's glasses", not words.
9. Look at each one yourself for anatomy and physical sense (GUIDE: Never open images or pages on his screen). Perspective is not a fault (GUIDE: Scope). The check flags; it filters nothing out: rejects and fails still go on the page.
10. Required: give every attempt you reject its one-line reason in the dashboard, `python3 tools/verdict.py <image> --reject "<reason>"`, so it shows in the History viewer's reject-reason field (art/PROMPTS.md, Verdicts).

## Cut-out, if the round needs one

11. `python3 tools/rmbg_local.py --method isnet-anime <in.png> --out <dir>` (birefnet-hr-matting for soft hair), refine with tools/matte_refine.py, then run tools/imgqa.py on the cut-outs too (name them `<render>-cut.webp` next to the render, so the matte check can tell hair gaps from holes) (GUIDE: Cutouts).

## Sheet and review

12. Make a contact sheet of every attempt in order, labelled, beside the approved portrait at the same scale. imgqa-sheet.webp is one (approved first, then the images in the order given); for a side-by-side at the same scale, copy the pattern of art/candidates/portraits/mio-phone-3/sheet.py.
13. Post the round with the post-review-item skill: the sheet as `media`, each attempt as an option with prompt, seed and red-rim number in its note.

## When Jørgen picks

14. Install the pick with `node tools/assets/live.mjs promote <round file> game3d/assets/portraits/<who>-<face>.webp --round <round> --review <id>` (`--replace` when a face is being replaced: the old file goes to art/production/retired/). Then `python3 tools/assets/sync.py push` and commit tools/assets/live.json with the lock file (notes/asset-lifecycle.md). Never render or cut out straight into game3d/assets.

## Reading imgqa

What each number means is in the header of tools/imgqa.py; the lines are THRESH there. Calibrated on 2026-09-29 against rounds mio-phone-2 to 5 and eric-portrait-anime-2 to 5 (195 images), where Jørgen's picks and rejections are known:

- Red rim: the 5 renders with a visible red outline measure 12 to 27% and all fail; the other 102 Eric renders are under 4.6% (3 warn, none fail).
- Glasses, `cover`: all 33 with wrong frames (every mio-phone-2 render and cut-out, "the glasses are not the same"; the black and green ipa-3201/3202) are 0.69 to 0.86 and fail; the 54 with her real frame (the transplants of rounds 3 to 5 and her game portraits) are 0.875 to 1.0 (48 pass, 6 warn). The gap between the two is narrow (0.862 against 0.875). `dE` is noisy on Eric's silver frame.
- Frame gaps: the thin frame going see-through on cut-outs (`matte frame`) fails all round-3 pick cut-outs (0.15 to 0.22, "transparent frame on the top of the left glass") and passes all 4 accepted round-5 ones (0 to 0.04). Round 4 ("none of these fixes it") is only partly caught: the pick and its 0.25 twin warn (render `worst` 0.56 to 0.58 on the top inner corner of her left lens, cut-out 0.07); the other two round-4 options pass.
- Drift, `ccip`: Mio's approved portraits and transplants are 0 to 0.043 (all pass); the off-model renders (txta, ipa-32xx) are 0.053 to 0.104 (4 warn, 1 fail). Eric round 2: his two picks 0.016 and 0.047 pass, the five he rejected 0.099 to 0.17 all fail. `ssim` follows the pose, so it is shown but not graded.
- Framing: `zoom` is the scale the game crop needs so the face fits FACE (1.00 = a plain resize); `top` is how much of that crop is above the picture (needs padding or an outpaint). Both only warn. Eric's pick r4-909 ("might need a crop") gives zoom 1.54 and top 7%, the crop that was then used (y -47 of 1152). Raw 896x1152 renders all show zoom 0.9 to 1.7 until reframed, so read those as the crop to make, not a fault. Headroom under 3% warns and under 1% fails (hair touching the top edge).
- Matte holes are only graded when the render the cut-out came from sits beside it with the same framing; without it the count includes gaps between hair strands.
- Limits: a head turned the other way is fitted with the frame flipped. On Eric's round 5 (all with the right glasses) 19 of 27 pass, 7 warn and 1 fails, on `dE` (22): his silver frame's highlights make the colour number noisy. Characters without a mask get no glasses check.
