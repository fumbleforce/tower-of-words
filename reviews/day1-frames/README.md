# Contextual day-1 review

The viewer reads frozen source excerpts from frames.json. build-data.mjs verifies source hashes before regenerating them. No story runtime is imported or changed. Each comparison applies one decision independently; neighboring proposals remain original in its context.

Each option shows its complete passage in a separate card, side by side on desktop and stacked on phone. Differing lines have a subtle highlight; conditional routes have their own labeled groups. Each card has its own Use this button. A decision advances to the next undecided passage across all three sections. The selector marks completed passages; Previous and Next allow revisiting them. Japanese source lines have review-only readings and translations, checked when generating the data.

The existing POST /api/review/day1-frames endpoint saves feedback.json: picked IDs mean apply the shown revision; options[id].reject means keep the original; neither means undecided. Comments remain per passage. The normal bible review uses the same meaning (picking a proposed change applies it). Browser drafts survive failed sends; the sticky Save button shows the unsent change count and sends them. Selected decisions have a check mark and a filled button. Tests intercept the POST and never write Jørgen’s feedback.
