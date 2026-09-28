#!/bin/sh
# Push main only if the last commit carries a fresh build stamp.
# stamp.py runs before the commit, so build.json's id ends in the commit *before* HEAD (HEAD~1), and HEAD must
# include build.json. Usage: sh game3d/tools/push.sh
set -e
cd "$(git rev-parse --show-toplevel)"
id=$(python3 -c "import json;print(json.load(open('game3d/build.json'))['id'])")
want=$(git rev-parse --short HEAD~1)
case "$id" in *-"$want") ;; *) echo "REFUSED: build.json id $id does not end in HEAD~1 ($want). Run game3d/tools/stamp.py, amend, retry."; exit 1;; esac
git diff --name-only HEAD~1 HEAD | grep -qx game3d/build.json || { echo "REFUSED: HEAD does not include game3d/build.json"; exit 1; }
git push origin main
echo "pushed, build $id"
