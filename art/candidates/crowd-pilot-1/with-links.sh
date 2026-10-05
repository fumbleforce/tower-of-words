#!/bin/sh
# Run a command with the git-ignored files the round's viewer loads linked into this worktree from the main checkout
# (art/parts/crowd-pilot-1 and the compared cast's game folders), so the worktree's served copy of the viewer works;
# the links are removed after. Never run tools/assets/sync.py push under it: it takes the linked cast folders for
# deleted files and drops them from the lock file (it did once in this round; the lock was rebuilt from HEAD).
#   sh art/candidates/crowd-pilot-1/with-links.sh <command> [args...]      (from the worktree root)
M=/home/jorgen/repo/japanese
L=""
link() { [ -e "$2" ] || { ln -s "$1" "$2"; L="$L $2"; }; }
mkdir -p art/parts
link $M/art/parts/crowd-pilot-1 art/parts/crowd-pilot-1
for c in kuroda mori emi kuro; do link $M/game3d/assets/characters/$c game3d/assets/characters/$c; done
"$@"; code=$?
rm -f $L
exit $code
