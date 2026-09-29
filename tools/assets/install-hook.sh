#!/bin/sh
# Point git at the repo's hooks (tools/assets/hooks), so the pre-commit check runs in every clone and worktree.
set -e
cd "$(git rev-parse --show-toplevel)"
chmod +x tools/assets/hooks/*
git config core.hooksPath tools/assets/hooks
echo "hooks: $(git config core.hooksPath) (pre-commit refuses binaries; see notes/asset-storage-proposal.md)"
