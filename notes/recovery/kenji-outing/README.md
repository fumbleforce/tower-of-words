# Kenji outing draft recovery

This preserves the parked candidate for [#339](https://github.com/fumbleforce/tower-of-words/issues/339), under the source-preservation task [#557](https://github.com/fumbleforce/tower-of-words/issues/557). Story review, voices and integration are pending. The current game is unchanged.

The preservation branch is `wt/codex-kenji-outing`. The package contains 42 byte-exact public source and provenance files from the original candidate archive. Two JSON files record the Eric and Carina branch transcripts for future story and voice review. The candidate includes the outing controller, companion interactions, story, tests and supporting documentation. These are historical drafts, not current game facts.

`base-head.txt` records the exact original base commit. `original.patch` is the unchanged tracked patch. `manifest.json` records the source archive and patch hashes, every selected file's size and SHA256, and every excluded artifact's path, size, hash and exclusion reason. Screenshots, generated build and performance data, caches and binaries are excluded. Keep the original local archive as capture evidence.

To recover the draft, create a disposable worktree at the commit in `base-head.txt`. Copy each file under `source/` to the same relative path in that worktree. Verify its byte count and SHA256 against `manifest.json`. This reconstructs the selected source files without the original archive. Alternatively, apply `original.patch` to that base and add the source paths absent from the base tree.

Port scoped changes from that recovered worktree to current main. Do not copy historical full documentation over current files. Refresh story review, voices, integration tests, and visual checks before activating the outing. Original-base assets are reused, and their current remote availability has not been verified here.
