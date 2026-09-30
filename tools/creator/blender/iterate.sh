#!/bin/sh
# Build a body and compare it with its original: sh tools/creator/blender/iterate.sh <body> <outdir> [show] [frame]
# Renders the original once (kept in <outdir>/orig-<body>), the new model into <outdir>/new-<body>, and writes
# <outdir>/cmp-<body>.webp (original and new side by side, per view). CPU rendering (Cycles), so no GPU lock.
here=$(dirname "$0")
body=$1; out=$2; show=${3:-}; frame=${4:-rest}
sh "$here/bl.sh" build.py "$body"
if [ ! -f "$out/orig-$body-$frame/original-front.png" ]; then
  f=$frame; [ "$f" = rest ] && f=""
  sh "$here/bl.sh" render_original.py "$body" "$out/orig-$body-$frame" CYCLES $f
fi
sh "$here/bl.sh" render_new.py "$body" "$out/new-$body-$frame" new CYCLES "$frame" "$show"
sh "$here/pairs.sh" "$out/cmp-$body-$frame.webp" "$out/orig-$body-$frame" original "$out/new-$body-$frame" new
