#!/bin/sh
set -e
cd "$(git rev-parse --show-toplevel)"
exec sh tools/check/install-hooks.sh
