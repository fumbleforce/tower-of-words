#!/bin/sh
# Publish game3d's runtime files to GitHub Pages as a single orphan commit on gh-pages.
#
#   sh game3d/tools/deploy-pages.sh            build the site in a temp folder and show what would go up
#   sh game3d/tools/deploy-pages.sh --push     ...and force-push it as the only commit on gh-pages
#   EXTRA="legacy/game legacy/proto2" sh game3d/tools/deploy-pages.sh --push
#                                              also carry other folders, at the same paths as today
#
# Why: today Pages serves the main branch, so every build's binaries (models, audio, shots) stay in main's history
# forever. This publishes only what the game loads, from the committed tree (HEAD), as one fresh commit with no
# parent, every time. gh-pages never has more than one commit, and main stops needing to carry build output.
#
# NOT switched on. It needs the main agent's OK, and one GitHub setting changed (see notes/PERF.md, "Deploy"):
#   Settings > Pages > Build and deployment > Source: "Deploy from a branch", Branch: gh-pages, folder / (root).
# Until that setting changes, pushing gh-pages is harmless: Pages keeps serving main.
#
# The site: /game3d/ with index.html, build.json, css, js, story (.js), fonts, vendor, audio (mp3, json) and the
# assets the game loads. Left out: tools, design, ref, shots, notes (*.md), portrait candidates and contact sheets.
# Only committed files go up (git archive of HEAD), so nothing local or git-ignored can leak.
set -e
ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
PUSH=0; [ "$1" = "--push" ] && PUSH=1
[ -n "$(git status --porcelain game3d/index.html game3d/build.json)" ] && echo "note: game3d/index.html or build.json has uncommitted changes; the site uses the committed version"

STAGE=$(mktemp -d "${TMPDIR:-/tmp}/pages.XXXXXX")
# KEEP=1 keeps the built site folder (to serve and check it locally)
[ -z "$KEEP" ] && trap 'rm -rf "$STAGE" "$STAGE.idx"' EXIT
REV=$(git rev-parse --short HEAD)

# 1. the committed game3d tree, then prune everything the game doesn't load
git archive HEAD game3d | tar -x -C "$STAGE"
G="$STAGE/game3d"
rm -rf "$G/tools" "$G/design" "$G/ref" "$G/shots" "$G/js/shell-qa.js"
find "$G" -name '*.md' -delete
# assets: keep only the folders the code loads from (assets/<folder>/ written in js/), drop loose files
USED=$(grep -rhoE "assets/[A-Za-z0-9_-]+/" "$G/js" | sort -u | sed 's#assets/##; s#/##')
for d in "$G"/assets/*; do n=$(basename "$d"); if [ -d "$d" ]; then echo "$USED" | grep -qx "$n" || rm -rf "$d"; else rm -f "$d"; fi; done
find "$G/assets" \( -name 'check*.png' -o -name 'check*.html' -o -name '*.blend' \) -delete 2>/dev/null || true
for x in $EXTRA; do git archive HEAD "$x" | tar -x -C "$STAGE"; done

# 2. Pages extras: no Jekyll, and the site root sends visitors to the game
touch "$STAGE/.nojekyll"
[ -f "$STAGE/index.html" ] || printf '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=game3d/"><title>Amakawa</title><a href="game3d/">Amakawa</a>\n' > "$STAGE/index.html"

# 3. what goes up
echo "site from $REV: $(find "$STAGE" -type f | wc -l) files, $(du -sh "$STAGE" | cut -f1)"
du -sh "$G"/* 2>/dev/null | sort -h | tail -8 | sed 's#'"$STAGE"'/##'

# 4. one orphan commit of exactly that tree, built with a private index (the working tree and main are untouched)
export GIT_INDEX_FILE="$STAGE.idx"
git --work-tree="$STAGE" add -A -f .
TREE=$(git write-tree)
unset GIT_INDEX_FILE
COMMIT=$(printf 'Pages: game3d from %s\n' "$REV" | git commit-tree "$TREE")
echo "commit $COMMIT (tree $TREE, no parent)"
if [ $PUSH = 1 ]; then
  git push --force origin "$COMMIT:refs/heads/gh-pages"
  echo "pushed gh-pages. Live once Pages serves gh-pages: https://fumbleforce.github.io/tower-of-words/game3d/"
else
  echo "dry run: nothing pushed (add --push)"
fi
[ -n "$KEEP" ] && echo "site kept in $STAGE (python3 -m http.server -d $STAGE)"
exit 0
