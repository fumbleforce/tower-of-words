#!/usr/bin/env bash
# Rebuild data/lang from the raw sources and the current game script.
# First time: python venv at ~/ai/lang/.venv with fugashi, unidic-lite, wordfreq (see data/lang/README.md).
set -euo pipefail
cd "$(dirname "$0")"
PY=${PY:-$HOME/ai/lang/.venv/bin/python}
[ -f raw/jmdict-eng.json ] || ./fetch.sh
"$PY" annotate.py          # data/lang/lines.json (script.js + day1-draft.md)
"$PY" build_data.py        # data/lang/words.json, kanji.json
"$PY" build_kana.py        # data/lang/kana.json, romaji.js
"$PY" pacing.py --md raw/pacing-latest.md
echo "pacing report for all profiles: tools/lang/raw/pacing-latest.md"
