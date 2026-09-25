# Language data

Runtime data for the adaptive learning model (three tracks: vocabulary, grammar, letters). Built by the scripts in `tools/lang/`. Don't edit the generated files by hand; fix the source or `tools/lang/overrides.json` and rebuild.

## Files

| File | What | Key fields |
|---|---|---|
| `words.json` | 6,745 words: the top 6,000 by frequency, every JLPT N5–N3 word, and every word the game script uses. Keyed by JMdict id. | `k` kanji forms, `r` readings, `g` short English, `p` part of speech, `n` JLPT level (5 = N5), `f` frequency rank, `uk` usually written in kana, `fu` furigana split of the first kanji form |
| `kanji.json` | 2,941 kanji: every kanji in those words plus all jouyou and JLPT kanji | `on`, `kun` (`.` marks okurigana), `m` meanings, `n` JLPT, `gr` school grade, `s` strokes, `f` newspaper rank |
| `lines.json` | Every Japanese line in `game/data/script.js` and `game/notes/day1-draft.md`, tokenised. Keyed by the line as plain text (script markup `{漢字\|かな\|key}` stripped to `漢字`). | per line: `t` tokens, `g` grammar ids, `src`, `kind`. Per token: `s` surface, `r` reading (absent for kana), `b` dictionary form, `id` JMdict id, `p` part of speech, `fu` furigana parts, `num` for counters, `en` for names |
| `grammar.json` | 66 grammar points in teaching order, casual first | `id`, `order`, `week` (of the 12-week probation), `level`, `name`, `pattern`, `example`, `en` |
| `kana.json` | 130 kana with romaji, row and group (basic, dakuten, youon, katakana-only extended), plus look-alike sets | `h`, `k`, `r`, `row`, `group` |
| `romaji.js` | ES module: `toRomaji('カード')` = `kaado`, `toHiragana()` | |
| `profiles.json` | Three reference players (beginner, Jørgen, N3) for the pacing checker and as level-check presets | |

Using it in the game: strip the markup from a line, look it up in `lines.json`, and for each token use `id` to find the word in `words.json` (tap for meaning) and each kanji in `kanji.json` (per-kanji state). `fu` lets you put a reading over only the kanji part (止[と]まって), or show the whole word in kana when a kanji is still hidden. Particles and auxiliaries have ids too, but their meaning lives in the grammar ids of the line.

Words are about 850 KB and kanji 330 KB as plain JSON; the service worker should cache them. If that's too big for the phone, the game can load `lines.json` plus only the ids it references.

## Tools (tools/lang)

Python venv: `~/ai/lang/.venv` (Python 3.12, fugashi, unidic-lite, wordfreq, jaconv; sudachipy is installed too but not used). To recreate: `uv venv --python 3.12 ~/ai/lang/.venv && uv pip install --python ~/ai/lang/.venv/bin/python fugashi unidic-lite wordfreq jaconv`.

- `build.sh`: runs everything below in order.
- `fetch.sh`: downloads the raw sources into `tools/lang/raw/` (gitignored).
- `annotate.py`: tokenises the script and the draft into `lines.json`. `--text "日本語"` annotates one line; `--review file` writes a readable dump for checking. It also compares its readings with the ruby in `script.js` and prints mismatches.
- `build_data.py`: builds `words.json` and `kanji.json`. Frequency comes from wordfreq's Japanese list, lemmatised with unidic and summed per JMdict entry.
- `build_kana.py`: `kana.json` and `romaji.js`.
- `pacing.py`: per line, the length and what is new for a profile (words, grammar, kanji with a reading), with flags for the day-1 budgets. `--profile jorgen`, `--draft path`, `--md out.md`, `--json out.json`.
- `overrides.json`: fixes for the tokeniser: `names`, `readings` (明日 = あした), `ids`, `merge` (set phrases that must stay one token), `lines` (a whole line by hand), `glosses` (shorter English for a JMdict id).

Tokeniser rules on top of unidic: numbers plus counters are one token with the sound changes (九時 くじ, 三階 さんがい, 一人 ひとり, 三か月 さんかげつ); 何 is なに or なん from the next sound; compound nouns and verbs are merged when JMdict has them (企画室, 話しかける); set phrases from JMdict are merged (気にするな, よろしくお願いします).

Known limits: unidic-lite picks one reading per word, so words with context-dependent readings need an override. Frequency ranks for short kana words are rough (a few homophones like 鴨 for かも still rank too high). JLPT levels come from community lists and are approximate.

## Sources and licences

| Source | Licence | Use |
|---|---|---|
| JMdict (EDRDG), via scriptin/jmdict-simplified 3.6.2 | CC BY-SA 4.0 | words, readings, glosses |
| KANJIDIC2 (EDRDG), via jmdict-simplified | CC BY-SA 4.0 | kanji readings, meanings, grade, strokes |
| JmdictFurigana (Doublevil) | MIT code; data derived from JMdict, CC BY-SA 4.0 | furigana splits |
| JLPT vocabulary lists by Jonathan Waller (tanos.co.uk), matched to JMdict by stephenmk/yomitan-jlpt-vocab | CC BY-SA 4.0 (Waller's lists CC BY) | word JLPT levels |
| kanji-data (davidluzgouveia), new JLPT levels from Waller's lists | MIT | kanji JLPT levels |
| wordfreq 3.1 (Robyn Speer) | data CC BY-SA 4.0, code Apache 2.0 | frequency ranks |
| UniDic (unidic-lite 1.0.8, NINJAL) | BSD | tokenisation and readings (build time only) |
| Kana table, grammar list, profiles | our own | |

The EDRDG licence requires attribution. The game's credits or about page must say: "This game uses the JMdict and KANJIDIC2 dictionary files, the property of the Electronic Dictionary Research and Development Group, used in conformance with the Group's licence (https://www.edrdg.org/edrdg/licence.html)." The derived files here (words, kanji, lines) are under CC BY-SA 4.0 as well.
