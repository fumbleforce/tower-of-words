#!/bin/sh
set -e
cd "$(git rev-parse --show-toplevel)"
existing_hooks=$(git config --get core.hooksPath || true)
case "$existing_hooks" in
  ''|tools/assets/hooks|tools/check/hooks) ;;
  *) echo "Existing hooksPath: $existing_hooks; integrate it before installing this hook package." >&2; exit 1 ;;
esac
chmod +x tools/check/hooks/pre-commit tools/check/hooks/commit-msg
git config core.hooksPath tools/check/hooks
echo 'Installed staged syntax, CPU, binary/private and Facts checks in tools/check/hooks.'
