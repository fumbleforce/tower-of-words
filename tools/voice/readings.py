"""Explicit readings for authored names a general kanji dictionary misreads.

These are exact written utterances, not fuzzy transcript substitutions. A named
reading must match the recognised kana exactly; written-character tolerance
cannot rescue a different pronunciation.
"""
JAPANESE_READINGS = {'玖路さん。': 'クロさん。'}  # docs/game/cast.md: 玖路 reads like 黒.


def reading_target(written):
    return JAPANESE_READINGS.get(written, written)


def strict_reading(written, heard, kana):
    if written not in JAPANESE_READINGS:
        return None
    # ASR may spell this name with its homophone 黒; the kanji dictionary
    # chooses an on-reading before さん, so normalise only this exact name.
    name = heard.strip().rstrip('。.!！?？')
    if name in {'玖路さん', '黒さん'}:
        heard = 'クロさん。'
    return kana(JAPANESE_READINGS[written]) == kana(heard)
