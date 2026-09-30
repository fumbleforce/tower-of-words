#!/bin/sh
# Publish game3d's runtime files to GitHub Pages as a single orphan commit on gh-pages.
#
#   sh game3d/tools/deploy-pages.sh            build the site in a temp folder and show what would go up
#   sh game3d/tools/deploy-pages.sh --push     ...and force-push it as the only commit on gh-pages
#   EXTRA="legacy/game legacy/proto2" sh game3d/tools/deploy-pages.sh --push
#                                              also carry other folders, at the same paths as today
#
# Why: git keeps no binaries (notes/asset-storage-proposal.md), so the site is built from two sources: the committed
# game3d tree (HEAD) for code and text, and the used binaries listed under game3d/ in HEAD's
# tools/assets/assets.lock.json, copied from this disk after checking each sha256 against the lock file. A file that
# is missing here or differs from the lock file stops the build: run `python3 tools/assets/sync.py pull game3d`, or
# push and commit the lock file first. gh-pages is one fresh commit with no parent every time.
#
# Pages must serve gh-pages (one GitHub setting, see notes/PERF.md, "Deploy"):
#   Settings > Pages > Build and deployment > Source: "Deploy from a branch", Branch: gh-pages, folder / (root).
#
# The creator: /creator/ opens the character creator, staged at its repo paths (tools/creator/..., art/parts/...) from
# the list in tools/creator/base/public.json, so its relative URLs work here and on 127.0.0.1:8771 alike.
#
# The site: /game3d/ with index.html, build.json (stamped here), css, js, story (.js), fonts, vendor, audio (mp3, json) and the
# assets the game loads. Left out: tools, design, ref, shots, notes (*.md) and contact sheets. Only committed files
# and files in the committed lock file go up, so nothing local, private or git-ignored beyond those can leak.
set -e
ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
PUSH=0; [ "$1" = "--push" ] && PUSH=1
[ -n "$(git status --porcelain game3d/index.html)" ] && echo "note: game3d/index.html has uncommitted changes; the site uses the committed version"

STAGE=$(mktemp -d "${TMPDIR:-/tmp}/pages.XXXXXX")
# KEEP=1 keeps the built site folder (to serve and check it locally)
[ -z "$KEEP" ] && trap 'rm -rf "$STAGE" "$STAGE.idx"' EXIT
REV=$(git rev-parse --short HEAD)

# 1. the committed game3d tree, the locked binaries from disk, then prune everything the game doesn't load
git archive HEAD game3d | tar -x -C "$STAGE"
# The creator's committed files go next to it at their repo paths (tools/creator/base/public.json, "code").
CREATOR=tools/creator/base/public.json
git show HEAD:$CREATOR | python3 -c 'import json, sys; print("\n".join(json.load(sys.stdin)["code"]))' | xargs git archive HEAD | tar -x -C "$STAGE"
git show HEAD:tools/assets/assets.lock.json | python3 -c '
import hashlib, json, os, shutil, subprocess, sys
root, stage, creator = sys.argv[1], sys.argv[2], sys.argv[3]
lock = json.load(sys.stdin)["files"]
data = json.loads(subprocess.run(["git", "show", "HEAD:" + creator], capture_output=True, text=True, check=True).stdout)["data"]
unlocked = [p for p in data if p not in lock]
if unlocked:
    sys.exit("creator files not in the lock file: " + ", ".join(unlocked) + " (python3 tools/assets/sync.py push, then commit the lock file)")
files = {p: v for p, v in lock.items() if p.startswith("game3d/") or p in data}
bad = []
for p, v in sorted(files.items()):
    src = os.path.join(root, p)
    if not os.path.isfile(src):
        bad.append(p + ": missing here"); continue
    h = hashlib.sha256()
    with open(src, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""): h.update(chunk)
    if h.hexdigest() != v["sha256"]:
        bad.append(p + ": differs from the lock file"); continue
    os.makedirs(os.path.dirname(os.path.join(stage, p)), exist_ok=True)
    shutil.copy2(src, os.path.join(stage, p))
if bad:
    print("\n".join(bad[:20]) + ("\n..." if len(bad) > 20 else ""), file=sys.stderr)
    sys.exit(f"{len(bad)} locked files are missing or changed: python3 tools/assets/sync.py pull, or push and commit the lock file")
print(f"locked files: {len(files)} from the lock file ({len(data)} of them for the creator), sha256 checked")
' "$ROOT" "$STAGE" "$CREATOR"
G="$STAGE/game3d"
rm -f "$G/js/shell-qa.js"
# build.json is generated, never committed: stamp the staged copy (HEAD's id, the staged module list)
GIT_DIR=$(git rev-parse --absolute-git-dir) python3 "$G/tools/stamp.py" | sed 's/^/build: /'
rm -rf "$G/tools" "$G/design" "$G/ref" "$G/shots"
find "$G" -name '*.md' -delete
# assets: keep only the folders the code loads from (assets/<folder>/ written in js/), drop loose files
USED=$(grep -rhoE "assets/[A-Za-z0-9_-]+/" "$G/js" | sort -u | sed 's#assets/##; s#/##')
for d in "$G"/assets/*; do n=$(basename "$d"); if [ -d "$d" ]; then echo "$USED" | grep -qx "$n" || rm -rf "$d"; else rm -f "$d"; fi; done
find "$G/assets" \( -name 'check*.png' -o -name 'check*.html' -o -name '*.blend' \) -delete 2>/dev/null || true
for x in $EXTRA; do git archive HEAD "$x" | tar -x -C "$STAGE"; done

# 2. Pages extras: no Jekyll, /creator/ opens the creator (keeping a look's ?body=... query), and the site root sends visitors to the game
touch "$STAGE/.nojekyll"
mkdir -p "$STAGE/creator"
printf '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Character creator</title><script>location.replace("../tools/creator/base/dress.html" + location.search)</script><a href="../tools/creator/base/dress.html">Character creator</a>\n' > "$STAGE/creator/index.html"
[ -f "$STAGE/index.html" ] || printf '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=game3d/"><title>Amakawa</title><a href="game3d/">Amakawa</a>\n' > "$STAGE/index.html"

# 3. no secrets in anything that goes up (tools/check/secrets.sh; the pre-push hook scans the commit again)
bash "$ROOT/tools/check/secrets.sh" dir "$STAGE" >"$STAGE.scan" 2>&1 || { cat "$STAGE.scan" >&2; rm -f "$STAGE.scan"; echo "deploy: REFUSED: the secret scan of the site failed; nothing was pushed" >&2; exit 1; }
tail -1 "$STAGE.scan"; rm -f "$STAGE.scan"

# 4. what goes up
echo "site from $REV: $(find "$STAGE" -type f | wc -l) files, $(du -sh "$STAGE" | cut -f1)"
du -sh "$G"/* 2>/dev/null | sort -h | tail -8 | sed 's#'"$STAGE"'/##'

# 5. one orphan commit of exactly that tree, built with a private index (the working tree and main are untouched)
export GIT_INDEX_FILE="$STAGE.idx"
git --work-tree="$STAGE" add -A -f .
TREE=$(git write-tree)
unset GIT_INDEX_FILE
COMMIT=$(printf 'Pages: game3d from %s\n' "$REV" | git commit-tree "$TREE")
echo "commit $COMMIT (tree $TREE, no parent)"
if [ $PUSH = 1 ]; then
  git push --force origin "$COMMIT:refs/heads/gh-pages"
  echo "pushed gh-pages. Live once Pages serves gh-pages: https://fumbleforce.github.io/tower-of-words/game3d/ and .../creator/"
else
  echo "dry run: nothing pushed (add --push)"
fi
[ -n "$KEEP" ] && echo "site kept in $STAGE (python3 -m http.server -d $STAGE)"
exit 0
