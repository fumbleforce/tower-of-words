#!/bin/sh
# Push main. build.json is generated and never committed, so there is no stamp to check in the commit: the site
# gets its own stamp in deploy-pages.sh, and this refreshes the local one so the id shown names the pushed commit.
# Usage: sh game3d/tools/push.sh
set -e
cd "$(git rev-parse --show-toplevel)"
id=$(python3 game3d/tools/stamp.py --if-stale | cut -d' ' -f1)
git push origin main
echo "pushed main at $(git rev-parse --short HEAD), local build $id"
