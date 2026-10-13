#!/usr/bin/env bash
# Rebuild tools/lang/data from the raw sources and notes/day1-draft.md.
# First time: python venv at ~/ai/lang/.venv with fugashi, unidic-lite, wordfreq (see tools/lang/data/README.md).
set -euo pipefail
cd "$(dirname "$0")"
PY=${PY:-$HOME/ai/lang/.venv/bin/python}
[ -f raw/jmdict-eng.json ] || ./fetch.sh
"$PY" annotate.py          # tools/lang/data/lines.json (day1-draft.md)
"$PY" build_data.py        # tools/lang/data/words.json, kanji.json
"$PY" build_kana.py        # tools/lang/data/kana.json, romaji.js
"$PY" pacing.py --md raw/pacing-latest.md
echo "pacing report for all profiles: tools/lang/raw/pacing-latest.md"
