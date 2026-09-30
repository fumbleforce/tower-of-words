#!/bin/sh
# Point git at tools/check/hooks in the main checkout (an absolute path, so every worktree uses the same hooks).
set -e
main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
cd "$main"
existing_hooks=$(git config --get core.hooksPath || true)
case "$existing_hooks" in
  ''|tools/assets/hooks|tools/check/hooks|"$main/tools/check/hooks") ;;
  *) echo "Existing hooksPath: $existing_hooks; integrate it before installing this hook package." >&2; exit 1 ;;
esac
chmod +x tools/check/hooks/pre-commit tools/check/hooks/commit-msg tools/check/hooks/post-commit tools/check/hooks/pre-push
git config core.hooksPath "$main/tools/check/hooks"
echo 'Installed in tools/check/hooks: staged syntax, CPU, binary/private and Facts checks (pre-commit, commit-msg),'
echo 'a background boot check of each commit that touches game3d/ (post-commit), and a secret scan before push (pre-push).'
