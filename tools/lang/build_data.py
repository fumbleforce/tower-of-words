"""Build data/lang/words.json, kanji.json and freq info from the raw sources.

Word set: the top CORE_N words by frequency, every JLPT N5-N3 word, and every word used in
data/lang/lines.json (run annotate.py first so game words are included).
Frequency: wordfreq's Japanese list (CC BY-SA 4.0), lemmatised with unidic and summed per JMdict entry.
Usage (venv): ~/ai/lang/.venv/bin/python tools/lang/build_data.py
"""
import json
import os
from collections import defaultdict

import wordfreq

from common import (OUT, entry_common, entry_readings, has_kanji, kanji_in, kata2hira, load_all,
                    pos_short, short_gloss)
from tokens import Tokenizer, align, unidic_forms

CORE_N = 6000
WF_N = 120000


def frequency_ranks(tk):
    """JMdict id -> rank (1 = most frequent)."""
    fd = wordfreq.get_frequency_dict('ja')
    words = sorted(fd, key=lambda w: -fd[w])[:WF_N]
    score = defaultdict(float)
    cache = {}
    for w in words:
        f = fd[w]
        ms = tk.parse(w)
        # the whole string, if it is itself a dictionary word
        if len(ms) > 1:
            eid = tk.lookup([w], [])
            if eid and not has_kanji(w):
                e = tk.data['entries'][eid]
                if e['kanji'] and 'uk' not in (e['sense'][0].get('misc') or []):
                    eid = None
            if eid:
                score[eid] += f
                continue
        for m in ms:
            if m['pos1'] in ('補助記号', '空白', '記号') or m['pos2'] == '数詞' and not has_kanji(m['s']):
                continue
            # a lone kana out of context is usually a fragment (い from いる), not the noun unidic guesses
            if len(ms) == 1 and len(m['s']) == 1 and not has_kanji(m['s']) and m['pos1'] not in ('助詞', '助動詞'):
                continue
            key = (m['base'], m['lemma'], m['kanaBase'], m['pos1'])
            if key not in cache:
                cache[key] = tk.lookup(unidic_forms(m), [m['kanaBase'], m['lForm']], m['pos1'])
            eid = cache[key]
            if eid and not has_kanji(w) and len(ms) == 1:
                # out of context, a kana word maps to a homophone noun (たい -> 鯛, かも -> 鴨). Only trust it when
                # the entry is normally written in kana or has no kanji form.
                e = tk.data['entries'][eid]
                kana_ok = not e['kanji'] or 'uk' in (e['sense'][0].get('misc') or []) or m['pos1'] in ('助詞', '助動詞')
                if not kana_ok:
                    eid = None
            if eid:
                score[eid] += f
    # readings fixed in overrides.json (私 = わたし): give the right entry the frequency of the one unidic picked
    for surf, r in tk.readings.items():
        right = tk.lookup([surf], [r])
        m = tk.parse(surf)
        wrong = tk.lookup([surf], [m[0]['kana']]) if len(m) == 1 else None
        if right and wrong and right != wrong:
            score[right] = max(score[right], score.pop(wrong, 0))
    ranked = sorted(score, key=lambda e: -score[e])
    return {eid: i + 1 for i, eid in enumerate(ranked)}


def word_record(e, eid, data, rank, glosses):
    misc = e['sense'][0].get('misc', []) if e['sense'] else []
    kforms = [k['text'] for k in e['kanji'] if 'iK' not in k.get('tags', []) and 'sK' not in k.get('tags', [])]
    kforms = sorted(kforms, key=lambda t: not any(k['text'] == t and k.get('common') for k in e['kanji']))[:3]
    readings = [r['text'] for r in e['kana'] if 'ik' not in r.get('tags', []) and 'sk' not in r.get('tags', [])]
    readings = sorted(readings, key=lambda t: not any(r['text'] == t and r.get('common') for r in e['kana']))[:3]
    rec = {}
    if kforms:
        rec['k'] = kforms
    rec['r'] = readings or [e['kana'][0]['text']]
    rec['g'] = glosses.get(str(eid)) or short_gloss(e)
    rec['p'] = pos_short(e['sense'][0]['partOfSpeech']) if e['sense'] else ''
    if eid in data['jlpt']:
        rec['n'] = data['jlpt'][eid]
    if rank:
        rec['f'] = rank
    if 'uk' in misc:
        rec['uk'] = 1
    if kforms:
        rd = [r for r in entry_readings(e, kforms[0]) if r in rec['r']] or rec['r']
        fu = align(kforms[0], rd[0], data)
        if fu:
            rec['fu'] = fu
    return rec


def main():
    data = load_all()
    tk = Tokenizer(data)
    E = data['entries']
    glosses = tk.ov.get('glosses', {})
    print('ranking frequencies...')
    ranks = frequency_ranks(tk)
    ids = set(eid for eid, r in ranks.items() if r <= CORE_N)
    ids |= {eid for eid, n in data['jlpt'].items() if n >= 3 and eid in E}
    lines_path = os.path.join(OUT, 'lines.json')
    game_ids = set()
    if os.path.exists(lines_path):
        for v in json.load(open(lines_path, encoding='utf-8'))['lines'].values():
            for t in v['t']:
                if t.get('id'):
                    game_ids.add(t['id'])
    ids |= game_ids
    words = {}
    for eid in sorted(ids, key=lambda e: ranks.get(e, 10 ** 9)):
        if eid in E:
            words[str(eid)] = word_record(E[eid], eid, data, ranks.get(eid), glosses)
    # kanji: everything used by those words, plus all JLPT and jouyou kanji
    chars = set()
    for w in words.values():
        for k in w.get('k', []):
            chars.update(kanji_in(k))
    for ch, k in data['kanji'].items():
        if k.get('jlpt') or (k.get('grade') and k['grade'] <= 8):
            chars.add(ch)
    kanji = {}
    for ch in sorted(chars, key=lambda c: (data['kanji'].get(c, {}).get('freq') or 9999, c)):
        k = data['kanji'].get(ch)
        if not k:
            continue
        rec = {'on': k['on'][:4], 'kun': k['kun'][:5], 'm': k['m'][:3]}
        if k.get('jlpt'):
            rec['n'] = k['jlpt']
        if k.get('grade'):
            rec['gr'] = k['grade']
        if k.get('strokes'):
            rec['s'] = k['strokes']
        if k.get('freq'):
            rec['f'] = k['freq']
        kanji[ch] = rec
    meta = {
        'jmdict': data['jmdict_version'],
        'counts': {'words': len(words), 'kanji': len(kanji), 'game_words': len(game_ids)},
    }
    with open(os.path.join(OUT, 'words.json'), 'w', encoding='utf-8') as f:
        json.dump({'about': 'Words keyed by JMdict id. k kanji forms, r readings, g short English, p part of speech, '
                            'n JLPT level (5 = N5), f frequency rank (wordfreq, lemmatised), uk usually written in kana, '
                            'fu furigana parts of the first kanji form [[kanji, reading], [kana, ""]].',
                   'meta': meta, 'words': words}, f, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(OUT, 'kanji.json'), 'w', encoding='utf-8') as f:
        json.dump({'about': 'Kanji from KANJIDIC2. on readings (hiragana), kun readings (. marks okurigana), m meanings, '
                            'n JLPT level (new levels, Waller lists via kanji-data), gr school grade (8 = other jouyou, '
                            '9-10 = jinmeiyou), s strokes, f newspaper frequency rank.',
                   'kanji': kanji}, f, ensure_ascii=False, separators=(',', ':'))
    print(meta)
    miss = [t for t in game_ids if str(t) not in words]
    print('game ids missing from words:', miss)


if __name__ == '__main__':
    main()
