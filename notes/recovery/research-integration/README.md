# Research integration recovery package

This preserves the parked reading-room candidate for #317 and the upstream preservation work in #557. It is a draft awaiting story review, voices, integration and current testing. The preservation branch is `wt/codex-research-integration`. The commit adds only this recovery directory and does not activate the candidate in the game.

The package contains 129 original source and provenance files, the original tracked patch, and the original base HEAD. `manifest.json` records each original path, archive path, byte count and SHA256, together with excluded artifacts and their hashes. `source/tools/assets/render.html.txt` retains the original HTML bytes under a text suffix so the historical tool page is not served as HTML.

Five reference SVGs are included. Existing models and textures depend on the original base asset lock. Thirty-five proposed voice records were reviewed but not generated, and `mori-reference-dozo.mp3` is missing. Original capture images and generated build/cache data remain in the local archive. The two preserved Showcase JSON files identify historical evidence and do not publish it as a current result.

For faithful recovery, create a disposable worktree at the HEAD in `base-head.txt`. Copy every file listed in the manifest from its `archived_path` to its original `path`, preserving bytes. This restores the complete selected source snapshot. Alternatively, apply `original.patch` at that base and copy the selected files absent from the base tree. Do not overlay old full documents or runtime files directly onto current main. Port the scoped changes and refresh the story, voice, visual and test gates before integration.

This package preserves selected public source and the original tracked patch exactly. It does not replace the original local capture archive or the separate older research-reading-room archive, which must remain available.
