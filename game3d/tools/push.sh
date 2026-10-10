#!/bin/sh
# Push main, then deploy the public site when the push changed the game. build.json is generated and never
# committed, so there is no stamp to check in the commit: the site gets its own stamp in deploy-pages.sh, and this
# refreshes the local one so the id shown names the pushed commit. A push alone never updates the public game
# (Pages serves gh-pages), and skipping the deploy left the site 12 hours behind on 2026-10-10.
# Usage: sh game3d/tools/push.sh [--no-deploy]
set -e
cd "$(git rev-parse --show-toplevel)"
id=$(python3 game3d/tools/stamp.py --if-stale | cut -d' ' -f1)
before=$(git rev-parse -q --verify origin/main || true)
git push origin main
echo "pushed main at $(git rev-parse --short HEAD), local build $id"
[ "$1" = "--no-deploy" ] && exit 0
if [ -z "$before" ] || [ -n "$(git diff --name-only "$before" HEAD -- game3d tools/assets/assets.lock.json)" ]; then
  sh game3d/tools/deploy-pages.sh --push
fi
