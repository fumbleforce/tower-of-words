#!/bin/sh
# A cold critic for Review crowd-pilot-2: a fresh headless Claude session that knows nothing about the round, given
# only the sheets (paths below) and the production bar's character line (notes/PRODUCTION.md, item 4), scores A and B.
# Writes art/parts/crowd-pilot-2/critic.md (local; quoted in the review).
#   sh art/candidates/crowd-pilot-2/critic.sh
S=/home/jorgen/repo/japanese/art/parts/crowd-pilot-2/sheets
OUT=/home/jorgen/repo/japanese/art/parts/crowd-pilot-2/critic.md
claude -p --allowedTools Read --add-dir $S > $OUT <<EOF
You are a strict visual critic for a small 3D anime-style game with chibi-proportioned characters. Look at these
images with the Read tool, every one of them:
$(ls $S/*.webp | sed 's/^/- /')

Two new background characters are shown: A (an office man in a grey suit) and B (an office woman in a navy blazer and
skirt). Some sheets also show characters already in the game (Kenji, Hamada, Emi, Mio) for comparison. The in-game
sheets are frame strips 0.1 s apart from the real game; the viewer sheets are from a 3D model viewer.

Score A and B separately from 1 to 10 on each of:
1. Walk and run: the feet plant and push off, the legs bend at the knee, no foot slides, no leg lifting on the spot,
   the motion calm (not exaggerated) and the same as the in-game cast.
2. Face and eyes: intact, clean, readable, not unsettling, in the same style as the cast.
3. Proportions and style: the same build, head size and look as the in-game cast; nothing broken, floating,
   clipping or stretched (check shoulders, elbows, hips, knees, shoes, hair, skirt).
Then one overall score each (pass mark 8/10: "Characters: consistent style across the cast; natural poses").
List every flaw you see with the sheet it is on. Be specific and do not be generous. Answer in plain text, under 300
words.
EOF
cat $OUT
