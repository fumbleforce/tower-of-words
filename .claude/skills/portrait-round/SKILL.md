---
name: portrait-round
description: One round of character portraits or expressions on the local GPU (ComfyUI, RDBT Anima), from the staging note to a Review item: render, frame and red-rim checks, glasses check, cut-out, contact sheet, review. Use it for any portrait, expression or concept render of a cast member, including fixes Jørgen asked for on an earlier round.
---

# Portrait round

The art rules are in GUIDE.md (Art) and art/PROMPTS.md. This skill is the order of the steps.

## Before rendering

1. Read the feedback as Jørgen wrote it and the last round's item (`python3 tools/review.py show <id>`). Pick the ONE change this round makes (GUIDE: Don't overcorrect). Sides are hers: "her left (image right)".
2. Write the staging note with the shot-staging skill (~/.agents/skills/shot-staging/SKILL.md). It stays out of the prompt.
3. One recipe per candidate, `<round>/recipes/<candidate>.json`, as art/PROMPTS.md says (How a picture is made; Portraits, expressions and cutouts; the character's own section, such as "Eric (mc) portrait" or "Mio's glasses").

## Render

4. The round folder is art/candidates/portraits/<round>/. Run each recipe with `node tools/subplots/compose.mjs <recipe> --wait --owner <session>/portrait-round`, the same `--seed` for every option. Keep a prompts.json log there (from `--dry-run`).
5. The last recipe gets `--end-session`.

## Check each render

6. `python3 tools/imgqa.py <renders...> --character <who>` straight after rendering (CPU, about 3 s an image). It compares each picture with the approved game portrait and grades red rim, glasses, matte, framing and face drift; what each number means and the thresholds are in its header. It writes imgqa.json and imgqa-sheet.webp. Put the red-rim number and any warn or fail in the option's note. Raw renders show a framing `zoom` until reframed; read that as the crop to make, not a fault.
7. Glasses insets on the sheet: red dots are places on the approved frame line with no frame. Glasses need a reference mask (`tools/imgqa.py make-ref <who>`); Mio and Eric have one.
8. Look at each one yourself for anatomy and physical sense. Perspective is not a fault. The check flags; it filters nothing out.
9. Verdict and fault type on every attempt (art/PROMPTS.md, Verdicts).

## Cut-out, if the round needs one

10. `python3 tools/rmbg_local.py --method isnet-anime <in.png> --out <dir>` (birefnet-hr-matting for soft hair), refine with tools/matte_refine.py, and run imgqa on the cut-outs too, named `<render>-cut.webp` next to the render so the matte check can tell hair gaps from holes.

## Sheet and review

11. A contact sheet of every attempt in order, labelled, beside the approved portrait at the same scale (imgqa-sheet.webp, or the pattern of art/candidates/portraits/mio-phone-3/sheet.py).
12. Post with the post-review-item skill: the sheet as `media`, each attempt an option with recipe, seed and red-rim number in its note.

## When Jørgen picks

13. `node tools/assets/live.mjs promote <round file> game3d/assets/portraits/<who>-<face>.webp --round <round> --review <id>` (`--replace` when replacing a face), then `python3 tools/assets/sync.py push` and commit tools/assets/live.json with the lock file (notes/asset-lifecycle.md). Never render or cut out straight into game3d/assets.
