#!/usr/bin/env bash
# Download the raw language sources into tools/lang/raw (gitignored).
# Run: tools/lang/fetch.sh   (needs curl, unzip; gh optional for the latest JMdict release)
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p raw && cd raw

# JMdict + KANJIDIC2 as JSON (scriptin/jmdict-simplified, CC BY-SA 4.0, data (c) EDRDG)
TAG=${JMDICT_TAG:-$(curl -s https://api.github.com/repos/scriptin/jmdict-simplified/releases/latest | python3 -c 'import json,sys;print(json.load(sys.stdin)["tag_name"])')}
BASE=https://github.com/scriptin/jmdict-simplified/releases/download/$TAG
for f in jmdict-eng-$TAG.json.zip kanjidic2-en-$TAG.json.zip; do
  [ -f "$f" ] || curl -sSL -o "$f" "$BASE/${f//+/%2B}"
done
rm -f jmdict-eng.json kanjidic2-en.json
unzip -o -q "jmdict-eng-$TAG.json.zip"; mv jmdict-eng-*.json jmdict-eng.json
unzip -o -q "kanjidic2-en-$TAG.json.zip"; mv kanjidic2-en-*.json kanjidic2-en.json
echo "$TAG" > jmdict-version.txt

# JLPT vocab lists (Jonathan Waller's lists matched to JMdict ids; stephenmk/yomitan-jlpt-vocab, CC BY-SA 4.0)
for n in 1 2 3 4 5; do
  curl -sSL -o jlpt-n$n.csv https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/main/original_data/n$n.csv
done

# Kanji with new-JLPT levels (davidluzgouveia/kanji-data, MIT; JLPT levels from Waller's lists)
curl -sSL -o kanji-data.json https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json

# Per-kanji furigana split for JMdict words (Doublevil/JmdictFurigana, MIT; data derived from JMdict, CC BY-SA 4.0)
[ -f JmdictFurigana.json ] || curl -sSL -o JmdictFurigana.json https://github.com/Doublevil/JmdictFurigana/releases/latest/download/JmdictFurigana.json

ls -la
