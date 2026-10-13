# Works facades candidate archive

This optional draft preserves the unfinished Works facade pass for #418. Preservation is tracked in #557. It includes recessed windows, reflective glass and industrial facade details. The glass and overall appearance still need visual review before adoption. The preservation branch is `wt/codex-works-facades`. These archived files do not change the live game.

The original base is recorded in `base-head.txt`. `original.patch` preserves the original tracked diff unchanged. `source/` contains five complete final source, documentation and test files, totalling 272,004 bytes. `manifest.json` records their paths, sizes and SHA256 hashes, plus the original archive and patch hashes and excluded artifacts. Generated build data, Python caches and preview binaries remain outside this package.

To reconstruct the candidate faithfully, create a disposable clean worktree at the commit in `base-head.txt`, then copy each file below `source/` to the same repository path. Verify its bytes against `manifest.json`. This restores all changed tracked files and all three new source or test files without the original tar archive. Alternatively, apply `original.patch` at that base and copy the paths absent from that base out of `source/`.

For adoption on current main, review and port the scoped patch using the original base and snapshots. Do not overwrite modern documentation with the historical full snapshot. Refresh tests and visual checks on desktop and phone, including close views of the reflective glass, before integrating anything into the live game. The candidate reuses assets from its original base and adds no indispensable binary asset. Original local capture evidence remains separate.
