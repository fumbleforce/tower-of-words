"""Shared loaders for the language data tools (tools/lang).

Raw sources live in tools/lang/raw (run fetch.sh first). Parsed dictionaries are cached
in raw/cache.pickle so the other scripts start fast.
"""
import csv
import json
import os
import pickle
import re
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'data', 'lang')
CACHE = os.path.join(RAW, 'cache.pickle')

KANJI_RE = re.compile(r'[㐀-䶿一-鿿豈-﫿々〆ヶ]')
KATA_RE = re.compile(r'[ァ-ヺー]')
HIRA_RE = re.compile(r'[ぁ-ゖ]')
JA_RE = re.compile(r'[぀-ヿ㐀-鿿々〆ヶ]')


def kata2hira(s):
    if not s:
        return s
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)


def hira2kata(s):
    return ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in s)


def is_kana(s):
    return bool(s) and all(HIRA_RE.match(c) or KATA_RE.match(c) or c in 'ーゝゞヽヾ' for c in s)


def has_kanji(s):
    return bool(KANJI_RE.search(s or ''))


def kanji_in(s):
    return [c for c in s if KANJI_RE.match(c) and c not in '々〆ヶ']


def nfkc(s):
    return unicodedata.normalize('NFKC', s)


POS_SHORT = {
    'n': 'n', 'pn': 'pn', 'adj-i': 'adj-i', 'adj-na': 'adj-na', 'adj-no': 'n', 'adv': 'adv', 'exp': 'exp',
    'int': 'int', 'conj': 'conj', 'prt': 'prt', 'ctr': 'ctr', 'num': 'num', 'suf': 'suf', 'pref': 'pref',
    'aux-v': 'aux', 'aux': 'aux', 'aux-adj': 'aux', 'cop': 'cop', 'adj-pn': 'adj-pn', 'n-suf': 'suf', 'n-pref': 'pref',
    'adv-to': 'adv', 'vs': 'n-vs', 'vs-i': 'v', 'vs-s': 'v', 'vk': 'v', 'vz': 'v',
}


def pos_short(pos_list):
    for p in pos_list:
        if p in ('aux-v', 'aux-adj', 'aux', 'cop'):
            return POS_SHORT[p]
    for p in pos_list:
        if p.startswith('v5') or p.startswith('v1') or p in ('vk', 'vs-i', 'vs-s', 'vz'):
            return 'v'
    for p in pos_list:
        if p in POS_SHORT:
            return POS_SHORT[p]
    return pos_list[0] if pos_list else ''


def short_gloss(entry, max_len=48):
    """First sense, up to three glosses, trimmed. Parenthetical notes dropped."""
    out = []
    for sense in entry['sense'][:1]:
        for g in sense['gloss']:
            t = re.sub(r'\s*\([^)]*\)', '', g['text']).strip()
            if t and t not in out:
                out.append(t)
            if len(out) >= 3:
                break
    s = '; '.join(out)
    while len(s) > max_len and len(out) > 1:
        out.pop()
        s = '; '.join(out)
    return s[:max_len]


def load_all(force=False):
    if not force and os.path.exists(CACHE):
        with open(CACHE, 'rb') as f:
            return pickle.load(f)
    data = {}
    jm = json.load(open(os.path.join(RAW, 'jmdict-eng.json'), encoding='utf-8'))
    entries = {}
    form_index = {}   # written form (kanji or kana) -> [entry ids]
    for w in jm['words']:
        eid = int(w['id'])
        entries[eid] = w
        for k in w['kanji']:
            form_index.setdefault(k['text'], []).append(eid)
        for r in w['kana']:
            form_index.setdefault(r['text'], []).append(eid)
    data['jmdict_version'] = jm['version'] + ' ' + jm['dictDate']
    data['entries'] = entries
    data['form_index'] = form_index

    kd = json.load(open(os.path.join(RAW, 'kanjidic2-en.json'), encoding='utf-8'))
    kanji = {}
    for c in kd['characters']:
        on, kun, mean = [], [], []
        rm = c.get('readingMeaning') or {}
        for g in rm.get('groups', []):
            for r in g.get('readings', []):
                if r['type'] == 'ja_on':
                    on.append(kata2hira(r['value']))
                elif r['type'] == 'ja_kun':
                    kun.append(r['value'])
            for m in g.get('meanings', []):
                if m['lang'] == 'en':
                    mean.append(m['value'])
        misc = c['misc']
        kanji[c['literal']] = {
            'on': on, 'kun': kun, 'nanori': rm.get('nanori', []), 'm': mean,
            'grade': misc.get('grade'), 'strokes': (misc.get('strokeCounts') or [None])[0],
            'freq': misc.get('frequency'), 'jlpt_old': misc.get('jlptLevel'),
        }
    kdata = json.load(open(os.path.join(RAW, 'kanji-data.json'), encoding='utf-8'))
    for ch, v in kdata.items():
        if ch in kanji and v.get('jlpt_new'):
            kanji[ch]['jlpt'] = v['jlpt_new']
    data['kanji'] = kanji

    # JLPT: by the list's JMdict id, and also by form, because the id matching in the community list
    # sometimes picks a sibling entry (これ N5 points at a different entry than the one for 此れ/これ).
    jlpt = {}  # entry id -> level (the easiest level wins if listed twice)
    by_form = {}  # (kanji or '', kana) -> level
    for n in (1, 2, 3, 4, 5):
        with open(os.path.join(RAW, f'jlpt-n{n}.csv'), encoding='utf-8') as f:
            for row in csv.DictReader(f):
                key = (row.get('kanji') or '', row.get('kana') or '')
                by_form[key] = max(by_form.get(key, 0), n)
                try:
                    eid = int(row['jmdict_seq'])
                except (ValueError, TypeError):
                    continue
                jlpt[eid] = max(jlpt.get(eid, 0), n)
    for eid, w in entries.items():
        kanas = [r['text'] for r in w['kana']]
        uk = not w['kanji'] or any('uk' in (s.get('misc') or []) for s in w['sense'][:1])
        best = jlpt.get(eid, 0)
        for k in w['kanji']:
            for r in kanas:
                best = max(best, by_form.get((k['text'], r), 0))
        if uk:
            for r in kanas:
                best = max(best, by_form.get(('', r), 0))
        if best:
            jlpt[eid] = best
    data['jlpt'] = jlpt

    furi = {}
    with open(os.path.join(RAW, 'JmdictFurigana.json'), encoding='utf-8-sig') as f:
        for x in json.load(f):
            furi[(x['text'], x['reading'])] = [[p['ruby'], p.get('rt', '')] for p in x['furigana']]
    data['furigana'] = furi

    with open(CACHE, 'wb') as f:
        pickle.dump(data, f, protocol=pickle.HIGHEST_PROTOCOL)
    return data


def entry_readings(entry, form=None):
    """Kana readings of an entry, restricted to those that apply to `form` if given."""
    out = []
    for r in entry['kana']:
        ap = r.get('appliesToKanji', ['*'])
        if form is None or not has_kanji(form) or '*' in ap or form in ap:
            out.append(r['text'])
    return out


def entry_common(entry):
    return any(k.get('common') for k in entry['kanji']) or any(r.get('common') for r in entry['kana'])
