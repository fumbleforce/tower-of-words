# Karaoke contacts recovery candidate

This preserves the parked repair for #349. It is a draft repair. Review and current verification are pending. Nothing here is applied to the live game.

`manifest.json` records the original paths, sizes, SHA-256 hashes, archive provenance and exclusions. `source/` holds the six selected source files byte for byte. `original.patch` is the exact original tracked diff, and `original-base-head.txt` records its base commit. Generated build data and caches are excluded. No binaries are required beyond the assets used by the original base.

To reconstruct it, create a separate checkout at the commit in `original-base-head.txt`, then run `git apply` with the absolute path to `original.patch`. Copy each file from `source/` to its original repository path. This last step also restores the new source file that was untracked in the archived checkout. Verify each copied file against the size and SHA-256 in `manifest.json`.

Do not apply this old snapshot over current main. Port the repair into a new task branch, review the source, and rerun the current unit, visual and whole-day checks before integration. The checks preserved here are candidate source, not evidence that it passes current gates. Tracking: #349 and #557.
