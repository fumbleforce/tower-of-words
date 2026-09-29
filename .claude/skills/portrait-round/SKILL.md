---
name: portrait-round
description: One round of character portraits or expressions on the local GPU (ComfyUI, RDBT Anima), from the staging note to a Review item: render, frame and red-rim checks, glasses check, cut-out, contact sheet, review. Use it for any portrait, expression or concept render of a cast member, including fixes Jørgen asked for on an earlier round.
---

# Portrait round

The art rules live in GUIDE.md (Art) and art/PROMPTS.md. This skill is the order of the steps and the tools for each; read the sections it names instead of working from memory.

## Before rendering

1. Read the brief's feedback as Jørgen wrote it, and the last round's item (`python3 tools/review.py show <id>`). Pick the ONE change this round makes (GUIDE: Don't overcorrect). Sides are hers: "her left (image right)" (GUIDE: Left and right on a character mean hers).
2. Write the staging note with the shot-staging skill (~/.agents/skills/shot-staging/SKILL.md). It is for checking; it doesn't go into the prompt (GUIDE: Prompt style).
3. Build the prompt from art/PROMPTS.md: the character's section (e.g. "Eric (mc) portrait", "Mio's glasses"), Structure, and Negative prompt base. Keep the quality tags (tools/production.py `Q`) and the build line from GUIDE (Build lines). Include the weighted red-rim negative from art/PROMPTS.md ("Eric (mc) portrait") on every portrait. Glasses: Mio's are fixed by the method in art/PROMPTS.md "Mio's glasses", not by words; Kuro's lenses are clear (GUIDE: Scope).

## Render

4. Take the GPU lock (GUIDE: GPU lock). Check nvidia-smi.
5. Write the round's gen.py next to its candidates in art/candidates/portraits/<round>/, on tools/comfy.py and tools/production.py, keeping one seed set so the change is the only difference. Examples: kenji-concept3/gen.py (one phrase swapped per option), eric-expressions-1 (face-only repaint). Raw PNGs go to art/production/ (git-ignored); webp copies and a prompts.json log go in the round folder.
6. Release the lock when the renders are done: free ComfyUI's VRAM (POST http://127.0.0.1:8188/free with `{"unload_models": true, "free_memory": true}`), then remove the lock only if the owner file has your name.

## Check each render

7. Headroom: `~/ai/sd/venv/bin/python tools/framecheck.py <png...>`.
8. Red rim: `~/ai/sd/venv/bin/python tools/redrim.py <png...>`; put the number in the option's note.
9. Glasses: compare beside the approved portrait at the same scale and sample the frame colour (art/PROMPTS.md "Mio's glasses"; mio-phone-3/sheet.py does this for Mio). Look for tinted lenses, thin or changing frames, and a see-through frame.
10. Look at each one yourself for anatomy and physical sense (GUIDE: Never open images or pages on his screen). Perspective is not a fault (GUIDE: Scope). Rejects still go on the page.

A single image-QA command (tools/imgqa.py) is proposed but not built (tool pending); run the three checks above for now.

## Cut-out, if the round needs one

11. `python3 tools/rmbg_local.py --method isnet-anime <in.png> --out <dir>` (birefnet-hr-matting for soft hair), refine with tools/matte_refine.py, then `python3 tools/alpha_holes.py check <files>` for holes in hair and glasses (GUIDE: Cutouts).

## Sheet and review

12. Make a contact sheet of every attempt in order, labelled, beside the approved portrait at the same scale. There is no shared sheet tool yet (tool pending); copy the pattern of art/candidates/portraits/mio-phone-3/sheet.py into the round folder.
13. Post the round with the post-review-item skill: the sheet as `media`, each attempt as an option with prompt, seed and red-rim number in its note.
