"""Tokeniser core: fugashi + unidic-lite, mapped onto JMdict entries, with counters,
compound merging, furigana alignment, overrides and grammar tagging.

Run inside the venv at ~/ai/lang/.venv (fugashi, unidic-lite).
"""
import json
import os
import re

import fugashi

from common import (HERE, KANJI_RE, entry_common, entry_readings, has_kanji, hira2kata,
                    is_kana, kanji_in, kata2hira, load_all, nfkc, pos_short)

OVERRIDES = os.path.join(HERE, 'overrides.json')

PUNCT_POS = ('補助記号', '空白')
GRAMMAR_POS = ('助詞', '助動詞')

# unidic pos1 -> JMdict part-of-speech tags it is compatible with (prefix match)
POS_COMPAT = {
    '動詞': ('v1', 'v5', 'vk', 'vs-', 'vz', 'aux-v'), '形容詞': ('adj-i', 'aux-adj'),
    '助動詞': ('aux', 'cop'), '助詞': ('prt', 'conj'),
    '名詞': ('n', 'pn', 'num', 'ctr', 'adj-no', 'vs', 'adj-na', 'exp'), '形状詞': ('adj-na', 'adj-no', 'n'),
    '副詞': ('adv', 'exp'), '感動詞': ('int', 'exp'), '接尾辞': ('suf', 'n-suf', 'ctr'), '接頭辞': ('pref', 'n-pref'),
    '代名詞': ('pn', 'n'), '連体詞': ('adj-pn',), '接続詞': ('conj',),
}
STRICT_POS = ('助詞', '助動詞')
TE_PARTICLE = 2654270  # JMdict て/で 'and' (conjunctive particle of the te-form)


def pos_ok(entry, upos):
    tags = {t for s in entry['sense'] for t in s['partOfSpeech']}
    pre = POS_COMPAT.get(upos, ())
    return any(t == p or t.startswith(p) for t in tags for p in pre)


# ---------------------------------------------------------------- numbers and counters
DIGITS = {'〇': 0, '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9}
UNITS = {'十': 10, '百': 100, '千': 1000, '万': 10000}
ONES = {1: 'いち', 2: 'に', 3: 'さん', 4: 'よん', 5: 'ご', 6: 'ろく', 7: 'なな', 8: 'はち', 9: 'きゅう'}


def parse_number(s):
    s = nfkc(s)
    if s.isdigit():
        return int(s)
    total, cur = 0, 0
    for c in s:
        if c in DIGITS:
            cur = cur * 10 + DIGITS[c] if cur else DIGITS[c]
        elif c in UNITS:
            u = UNITS[c]
            if u == 10000:
                total = (total + (cur or 1)) * u
            else:
                total += (cur or 1) * u
            cur = 0
        else:
            return None
    return total + cur


def read_number(n):
    """Plain reading of an integer, with the standard sound changes (さんびゃく, はっせん...)."""
    if n == 0:
        return 'ゼロ'
    out = ''
    if n >= 10000:
        out += read_number(n // 10000) + 'まん'
        n %= 10000
    th = {1: 'せん', 2: 'にせん', 3: 'さんぜん', 4: 'よんせん', 5: 'ごせん', 6: 'ろくせん', 7: 'ななせん', 8: 'はっせん', 9: 'きゅうせん'}
    hu = {1: 'ひゃく', 2: 'にひゃく', 3: 'さんびゃく', 4: 'よんひゃく', 5: 'ごひゃく', 6: 'ろっぴゃく', 7: 'ななひゃく', 8: 'はっぴゃく', 9: 'きゅうひゃく'}
    if n >= 1000:
        out += th[n // 1000]
        n %= 1000
    if n >= 100:
        out += hu[n // 100]
        n %= 100
    if n >= 10:
        out += ('' if n // 10 == 1 else ONES[n // 10]) + 'じゅう'
        n %= 10
    if n:
        out += ONES[n]
    return out


def last_digit_changes(reading, n, table):
    """Replace the reading of the last digit using a per-counter table {digit: reading}."""
    last = n % 10 if n % 10 else (10 if n % 100 == 10 or n == 10 else None)
    if n % 100 == 0 or last is None or last not in table:
        return None
    base = read_number(n)
    tail_default = {10: 'じゅう'}.get(last, ONES.get(last, ''))
    if not base.endswith(tail_default):
        return None
    return base[: len(base) - len(tail_default)] + table[last]


# Counter readings. `table` changes the last digit (or 10); 'rendaku' maps first-kana changes.
COUNTERS = {
    '時': {'r': 'じ', 'table': {4: 'よじ', 7: 'しちじ', 9: 'くじ'}},
    '時間': {'r': 'じかん', 'table': {4: 'よじかん', 7: 'しちじかん', 9: 'くじかん'}},
    '階': {'r': 'かい', 'table': {1: 'いっかい', 3: 'さんがい', 6: 'ろっかい', 8: 'はっかい', 10: 'じゅっかい'}},
    '回': {'r': 'かい', 'table': {1: 'いっかい', 6: 'ろっかい', 8: 'はっかい', 10: 'じゅっかい'}},
    '個': {'r': 'こ', 'table': {1: 'いっこ', 6: 'ろっこ', 8: 'はっこ', 10: 'じゅっこ'}},
    'か月': {'r': 'かげつ', 'table': {1: 'いっかげつ', 6: 'ろっかげつ', 8: 'はっかげつ', 10: 'じゅっかげつ'}},
    'ヶ月': {'r': 'かげつ', 'table': {1: 'いっかげつ', 6: 'ろっかげつ', 8: 'はっかげつ', 10: 'じゅっかげつ'}},
    '部': {'r': 'ぶ', 'table': {}},
    '分': {'r': 'ふん', 'table': {1: 'いっぷん', 3: 'さんぷん', 4: 'よんぷん', 6: 'ろっぷん', 8: 'はっぷん', 10: 'じゅっぷん'}},
    '本': {'r': 'ほん', 'table': {1: 'いっぽん', 3: 'さんぼん', 6: 'ろっぽん', 8: 'はっぽん', 10: 'じゅっぽん'}},
    '杯': {'r': 'はい', 'table': {1: 'いっぱい', 3: 'さんばい', 6: 'ろっぱい', 8: 'はっぱい', 10: 'じゅっぱい'}},
    '匹': {'r': 'ひき', 'table': {1: 'いっぴき', 3: 'さんびき', 6: 'ろっぴき', 8: 'はっぴき', 10: 'じゅっぴき'}},
    '枚': {'r': 'まい', 'table': {}},
    '円': {'r': 'えん', 'table': {4: 'よえん'}},
    '年': {'r': 'ねん', 'table': {4: 'よねん'}},
    '歳': {'r': 'さい', 'table': {1: 'いっさい', 8: 'はっさい', 10: 'じゅっさい'}},
    '才': {'r': 'さい', 'table': {1: 'いっさい', 8: 'はっさい', 10: 'じゅっさい'}},
    '週間': {'r': 'しゅうかん', 'table': {1: 'いっしゅうかん', 8: 'はっしゅうかん', 10: 'じゅっしゅうかん'}},
    '番': {'r': 'ばん', 'table': {}},
    '人': {'r': 'にん', 'table': {4: 'よにん'}, 'special': {1: 'ひとり', 2: 'ふたり'}},
    '日': {'r': 'にち', 'table': {}, 'special': {1: 'ついたち', 2: 'ふつか', 3: 'みっか', 4: 'よっか', 5: 'いつか', 6: 'むいか', 7: 'なのか', 8: 'ようか', 9: 'ここのか', 10: 'とおか', 14: 'じゅうよっか', 20: 'はつか', 24: 'にじゅうよっか'}},
    'つ': {'r': 'つ', 'table': {}, 'special': {1: 'ひとつ', 2: 'ふたつ', 3: 'みっつ', 4: 'よっつ', 5: 'いつつ', 6: 'むっつ', 7: 'ななつ', 8: 'やっつ', 9: 'ここのつ'}},
}


def counter_reading(num_text, counter):
    n = parse_number(num_text)
    if n is None:
        return None
    c = COUNTERS.get(counter)
    if not c:
        return None
    if n in c.get('special', {}):
        return c['special'][n]
    changed = last_digit_changes(read_number(n), n, c['table'])
    if changed:
        return changed
    return read_number(n) + c['r']


def unidic_forms(m):
    """Forms to look up for a morpheme. unidic's lemma is the best evidence when it is spelled with kanji
    (いる -> 居る, not 要る), unless the text itself uses different kanji."""
    lem = m['lemma']
    if lem and has_kanji(lem) and not has_kanji(m['base']):
        return [lem, m['base'], m['s']]
    return [m['base'], m['s'], lem]


def to_fullwidth(s):
    return ''.join(chr(ord(c) + 0xFEE0) if '!' <= c <= '~' else c for c in s)


def nani_reading(nxt):
    """何 is なん before d/t/n sounds, の and counters; なに before か, に, を, が, も and at the end."""
    if not nxt or nxt[0] in '？?！!、。…　 」':
        return 'なに'
    if nxt[0] in 'だでですとてつのなねにん' and not nxt.startswith(('に', 'な')) or nxt.startswith('の'):
        return 'なん'
    if nxt[0] in COUNTERS or nxt[0] in '時人回個分本年日階枚':
        return 'なん'
    return 'なに'


# ---------------------------------------------------------------- furigana alignment
def kanji_candidates(ch, kanji):
    k = kanji.get(ch)
    if not k:
        return []
    out = set()
    for r in k['on'] + k['kun'] + k.get('nanori', []):
        r = kata2hira(r.replace('-', ''))
        stem = r.split('.')[0]
        for x in (stem, r.replace('.', '')):
            if not x:
                continue
            out.add(x)
            # rendaku
            first = x[0]
            voiced = {'か': 'が', 'き': 'ぎ', 'く': 'ぐ', 'け': 'げ', 'こ': 'ご', 'さ': 'ざ', 'し': 'じ', 'す': 'ず', 'せ': 'ぜ', 'そ': 'ぞ',
                      'た': 'だ', 'ち': 'ぢ', 'つ': 'づ', 'て': 'で', 'と': 'ど', 'は': 'ば', 'ひ': 'び', 'ふ': 'ぶ', 'へ': 'べ', 'ほ': 'ぼ'}
            if first in voiced:
                out.add(voiced[first] + x[1:])
            if first in 'はひふへほ':
                out.add({'は': 'ぱ', 'ひ': 'ぴ', 'ふ': 'ぷ', 'へ': 'ぺ', 'ほ': 'ぽ'}[first] + x[1:])
            # gemination (いち -> いっ)
            if len(x) >= 2 and x[-1] in 'つちくき':
                out.add(x[:-1] + 'っ')
    return sorted(out, key=len, reverse=True)


def split_run(run, reading, kanji):
    """Split a run of kanji over its reading one kanji at a time, if KANJIDIC readings allow it."""
    if len(run) == 1:
        return [[run, reading]]
    if run[1:2] == '々':
        return None
    first = run[0]
    for cand in kanji_candidates(first, kanji):
        if reading.startswith(cand) and len(reading) > len(cand):
            rest = split_run(run[1:], reading[len(cand):], kanji)
            if rest:
                return [[first, cand]] + rest
    return None


def align(surface, reading, data):
    """Return furigana parts [[text, rt], ...] covering the surface, rt '' for kana parts."""
    if not has_kanji(surface):
        return None
    f = data['furigana'].get((surface, reading))
    reading = kata2hira(reading)
    f = f or data['furigana'].get((surface, reading))
    if f:
        return [[t, '' if t == r else r] for t, r in f]
    # segments: kanji runs and kana runs
    segs = re.findall(r'[㐀-鿿々〆ヶ]+|[^㐀-鿿々〆ヶ]+', surface)
    pat = ''.join('(.+?)' if KANJI_RE.match(s[0]) else '(' + re.escape(kata2hira(s)) + ')' for s in segs)
    orig = surface
    m = re.fullmatch(pat, reading)
    if not m:
        return [[surface, reading]]
    out = []
    for s, r in zip(segs, m.groups()):
        if KANJI_RE.match(s[0]):
            parts = split_run(s, r, data['kanji'])
            out.extend(parts if parts else [[s, r]])
        else:
            out.append([s, ''])
    return out


# ---------------------------------------------------------------- the tokeniser
class Tokenizer:
    def __init__(self, data=None):
        self.data = data or load_all()
        self.tagger = fugashi.Tagger()
        self.ov = json.load(open(OVERRIDES, encoding='utf-8')) if os.path.exists(OVERRIDES) else {}
        self.names = self.ov.get('names', {})
        self.readings = self.ov.get('readings', {})
        self.ids = self.ov.get('ids', {})
        merge = {}
        for x in self.ov.get('merge', []):
            x = x if isinstance(x, dict) else {'s': x}
            merge[x['s']] = x
        for n in self.names:
            merge.setdefault(n, {'s': n, 'name': True})
        self.merge_info = merge
        self.merge = sorted(merge, key=len, reverse=True)

    # -- JMdict lookup
    def lookup(self, forms, readings, upos=None, want_common=True):
        E = self.data['entries']
        FI = self.data['form_index']
        readings = [kata2hira(r) for r in readings if r]
        best, best_score = None, -10 ** 9
        seen = set()
        forms = [f for f in forms if f]
        forms += [to_fullwidth(f) for f in forms if to_fullwidth(f) != f]
        for fi, form in enumerate(forms):
            for eid in FI.get(form, []):
                if eid in seen:
                    continue
                seen.add(eid)
                e = E[eid]
                score = 0
                kforms = [k['text'] for k in e['kanji']]
                if form in kforms:
                    score += 3 + (1 if kforms.index(form) == 0 else 0)
                else:
                    score += 2
                score -= 3 * fi  # earlier forms are better evidence
                ers = [kata2hira(x) for x in entry_readings(e, form)]
                if readings and any(r in ers for r in readings):
                    score += 6
                elif readings and has_kanji(form):
                    score -= 4
                if entry_common(e):
                    score += 2
                if eid in self.data['jlpt']:
                    score += 1
                if upos and upos in POS_COMPAT:
                    if pos_ok(e, upos):
                        score += 3
                    elif upos in STRICT_POS:
                        continue
                if not has_kanji(form) and e['kanji'] and 'uk' in (e['sense'][0].get('misc') or []):
                    score += 3
                if best is None or score > best_score or (score == best_score and eid < best):
                    best, best_score = eid, score
        return best

    def parse(self, text):
        """Raw unidic morphemes as dicts."""
        out = []
        for w in self.tagger(text):
            f = w.feature
            lemma = (f.lemma or '').split('-')[0] if f.lemma else None
            out.append({
                's': w.surface, 'pos1': f.pos1, 'pos2': f.pos2, 'pos3': f.pos3,
                'cType': f.cType, 'cForm': f.cForm, 'lemma': lemma, 'base': f.orthBase or w.surface,
                'kana': kata2hira(f.kana) if f.kana else None,
                'kanaBase': kata2hira(f.kanaBase) if f.kanaBase else None,
                'lForm': kata2hira(f.lForm) if f.lForm else None,
                'ws': w.white_space,
            })
        return out

    def reading_of(self, m):
        s = m['s']
        if is_kana(s):
            return s
        if m['kana'] and m['kana'] != '*':
            return m['kana']
        return None

    def annotate(self, text):
        """Tokens for a plain Japanese line."""
        text = text.strip()
        if text in self.ov.get('lines', {}):
            fixed = self.ov['lines'][text]
            return [dict(t, _m=[], _merge='lex', _g=fixed.get('g', [])) if i == 0 else dict(t, _m=[], _merge='lex')
                    for i, t in enumerate(fixed['t'])]
        ms = self.parse(text)
        toks = []
        i = 0
        while i < len(ms):
            m = ms[i]
            # overrides: forced merges on surface text
            joined = ''.join(x['s'] for x in ms[i:])
            hit = next((p for p in self.merge if joined.startswith(p)), None)
            if hit:
                j, acc = i, ''
                while acc != hit and j < len(ms) and len(acc) < len(hit):
                    acc += ms[j]['s']
                    j += 1
                if acc == hit:
                    span = ms[i:j]
                    info = self.merge_info[hit]
                    r = info.get('r') or ''.join(self.reading_of(x) or x['s'] for x in span)
                    base = info.get('b', hit)
                    if info.get('name'):
                        tok = {'s': hit, 'p': 'name', '_m': span}
                    else:
                        tok = self.make(hit, r, base, 'exp', span, eid=info.get('id'))
                        if not info.get('id') and 'id' in tok:
                            e = self.data['entries'][tok['id']]
                            tok['p'] = pos_short(e['sense'][0]['partOfSpeech'])
                    tok['_merge'] = 'lex'
                    toks.append(tok)
                    i = j
                    continue
            # numbers + counter
            if m['pos2'] == '数詞':
                j = i
                num = ''
                while j < len(ms) and ms[j]['pos2'] == '数詞':
                    num += ms[j]['s']
                    j += 1
                span = ms[i:j]
                ctr = None
                if j < len(ms) and (ms[j]['pos3'] == '助数詞可能' or ms[j]['pos3'] == '助数詞' or ms[j]['s'] in COUNTERS):
                    ctr = ms[j]
                    # 時間, 週間
                    if j + 1 < len(ms) and (ms[j]['s'] + ms[j + 1]['s']) in COUNTERS:
                        ctr = dict(ctr, s=ms[j]['s'] + ms[j + 1]['s'])
                        j += 1
                    j += 1
                if ctr:
                    surf = num + ctr['s']
                    r = counter_reading(num, ctr['s']) or (''.join((self.reading_of(x) or '') for x in ms[i:j]))
                    tok = self.make(surf, r, ctr['s'], 'ctr', ms[i:j], counter=True)
                    tok['num'] = parse_number(num)
                    toks.append(tok)
                else:
                    n = parse_number(num)
                    r = None if nfkc(num).isdigit() else (read_number(n) if n is not None else None)
                    toks.append(self.make(num, r, num, 'num', span))
                i = j
                continue
            # sentence-initial で + も is the conjunction でも
            if m['s'] == 'で' and i + 1 < len(ms) and ms[i + 1]['s'] == 'も' and (i == 0 or ms[i - 1]['pos1'] in PUNCT_POS):
                tok = self.make('でも', 'でも', 'でも', 'conj', ms[i:i + 2], eid=1008460)
                tok['_merge'] = 'lex'
                toks.append(tok)
                i += 2
                continue
            # greedy compound merge (longest first)
            merged = self.try_merge(ms, i)
            if merged:
                tok, j = merged
                toks.append(tok)
                i = j
                continue
            toks.append(self.single(m))
            i += 1
        for k, t in enumerate(toks):
            if t['s'] == '何':
                t['r'] = nani_reading(toks[k + 1]['s'] if k + 1 < len(toks) else '')
            self.apply_override(t)
        return toks

    def try_merge(self, ms, i):
        FI = self.data['form_index']
        E = self.data['entries']
        for j in range(min(len(ms), i + 5), i + 1, -1):
            span = ms[i:j]
            if any(x['pos1'] in PUNCT_POS or x['pos2'] == '数詞' for x in span):
                continue
            last = span[-1]
            head = ''.join(x['s'] for x in span[:-1])
            head_r = ''.join((self.reading_of(x) or '') for x in span[:-1])
            nounish = all(x['pos1'] in ('名詞', '接頭辞', '接尾辞', '形状詞') for x in span)
            inflecting = last['pos1'] in ('動詞', '形容詞', '助動詞')
            verbish = last['pos1'] in ('動詞', '形容詞') and all(
                x['pos1'] in ('動詞', '名詞', '接頭辞', '形状詞') and (x['pos1'] != '動詞' or x['cForm'].startswith('連用形')) for x in span[:-1])
            variants = []
            surf_v = (head + last['s'], head_r + (self.reading_of(last) or ''))
            if not inflecting:
                variants.append(surf_v)
            else:
                variants.append((head + last['base'], head_r + (last['kanaBase'] or '')))
                if span[0]['pos1'] == '接頭辞' and (last['cForm'] or '').startswith('連用形'):
                    variants.append(surf_v)
                    nounish = True
            for base_form, r_full in variants:
                cand_forms = [base_form, to_fullwidth(base_form)]
                cands = [(f, eid) for f in cand_forms for eid in FI.get(f, [])
                         if kata2hira(r_full) in [kata2hira(x) for x in entry_readings(E[eid], f)]]
                if not cands:
                    continue
                eid = self.lookup([cands[0][0]], [r_full])
                e = E[eid]
                ps = {pos_short(s['partOfSpeech']) for s in e['sense']}
                is_exp = 'exp' in ps
                lexical = bool(ps & {'exp', 'adv', 'int', 'conj'}) and entry_common(e) and span[0]['pos1'] not in GRAMMAR_POS
                ok = nounish or verbish or (lexical and len(base_form) >= 3 and last['pos1'] not in ('助詞',)) or (
                    lexical and len(base_form) >= 4)
                if not ok:
                    continue
                surf = head + last['s']
                read = head_r + (self.reading_of(last) or '')
                tok = self.make(surf, read, base_form, pos_short(e['sense'][0]['partOfSpeech']), span, eid=eid)
                tok['_merge'] = 'verb' if verbish else 'lex'
                return tok, j
        return None

    def make(self, surf, reading, base, pos, span, eid=None, counter=False):
        tok = {'s': surf}
        if reading and not is_kana(surf) and reading != surf:
            tok['r'] = reading
        if base and base != surf:
            tok['b'] = base
        if eid is None:
            if counter:
                m = [x for x in span if x['pos2'] != '数詞']
                cr = COUNTERS.get(base, {}).get('r')
                eid = self.lookup([base, m[0]['lemma'] if m else None], [cr] if cr else [], '接尾辞') if m else None
            else:
                eid = self.lookup([base], [reading] if reading else [])
        if eid:
            tok['id'] = eid
        tok['p'] = pos
        tok['_m'] = span
        return tok

    def single(self, m):
        s = m['s']
        if m['pos1'] in PUNCT_POS:
            return {'s': s, 'p': 'punct', '_m': [m]}
        if m['pos2'] == '固有名詞' or s in self.names:
            tok = {'s': s, 'p': 'name', '_m': [m]}
            r = self.names.get(s, {}).get('r') if isinstance(self.names.get(s), dict) else None
            r = r or self.reading_of(m)
            if r and not is_kana(s):
                tok['r'] = kata2hira(r)
            return tok
        forms = unidic_forms(m)
        readings = [m['kanaBase'], m['lForm']]
        eid = self.lookup(forms, readings, m['pos1'])
        if m['pos2'] == '接続助詞' and s in ('て', 'で'):
            eid = TE_PARTICLE
        tok = {'s': s}
        r = self.reading_of(m)
        if r and not is_kana(s):
            tok['r'] = r
        if m['base'] and m['base'] != s:
            tok['b'] = m['base']
        if eid:
            tok['id'] = eid
        up = m['pos1']
        tok['p'] = {'動詞': 'v', '形容詞': 'adj-i', '形状詞': 'adj-na', '名詞': 'n', '代名詞': 'pn', '副詞': 'adv',
                    '助詞': 'prt', '助動詞': 'aux', '接尾辞': 'suf', '接頭辞': 'pref', '感動詞': 'int',
                    '連体詞': 'adj-pn', '接続詞': 'conj'}.get(up, up)
        if m['pos1'] == '名詞' and m['pos2'] == '数詞':
            tok['p'] = 'num'
        tok['_m'] = [m]
        return tok

    def apply_override(self, t):
        s = t['s']
        if s in self.names:
            n = self.names[s]
            t['p'] = 'name'
            t.pop('id', None)
            if isinstance(n, dict) and n.get('r') and not is_kana(s):
                t['r'] = n['r']
            if isinstance(n, dict) and n.get('en'):
                t['en'] = n['en']
        if s in self.readings and t.get('r') != self.readings[s]:
            t['r'] = self.readings[s]
            if t.get('p') != 'name':
                eid = self.lookup([t.get('b', s)], [t['r']])
                if eid:
                    t['id'] = eid
        if s in self.ids:
            t['id'] = self.ids[s]
        if t.get('r') and has_kanji(s):
            f = align(s, t['r'], self.data)
            if f and not (len(f) == 1 and f[0][0] == s and f[0][1] == t['r']):
                t['fu'] = f


# ---------------------------------------------------------------- grammar detection
def detect_grammar(toks):
    """Grammar point ids used in one line (see data/lang/grammar.json)."""
    if toks and '_g' in toks[0]:
        return list(toks[0]['_g'])
    ms = []
    for t in toks:
        mode = t.get('_merge')
        if mode == 'lex':
            continue
        ms.extend(t['_m'][-1:] if mode == 'verb' else t['_m'])
    g = []

    def add(x):
        if x not in g:
            g.append(x)

    n = len(ms)
    for i, m in enumerate(ms):
        s, p1, p2, cf, lem, base = m['s'], m['pos1'], m['pos2'], m['cForm'] or '', m['lemma'], m['base']
        nxt = ms[i + 1] if i + 1 < n else None
        nxt2 = ms[i + 2] if i + 2 < n else None
        prv = ms[i - 1] if i > 0 else None
        end = nxt is None or nxt['pos1'] == '補助記号' or (nxt['pos2'] == '終助詞')
        if p1 == '助詞':
            if s == 'は' and p2 == '係助詞':
                add('wa')
            elif s == 'が' and p2 == '格助詞':
                add('ga')
            elif s == 'を':
                add('o')
            elif s == 'へ' and p2 == '格助詞':
                add('he')
            elif s == 'に' and p2 == '格助詞':
                if prv and prv['s'] in ('の', 'ん') and prv['pos2'] == '準体助詞' and (nxt is None or nxt['pos1'] == '補助記号'):
                    pass
                elif prv and prv['s'] == 'まで':
                    add('made-ni')
                else:
                    add('ni')
            elif s == 'で' and p2 == '格助詞':
                add('de')
            elif s == 'の' and p2 == '格助詞':
                add('no-mod')
            elif s in ('の', 'ん') and p2 in ('準体助詞', '終助詞'):
                if nxt and nxt['s'] == 'に' and (nxt2 is None or nxt2['pos1'] == '補助記号'):
                    add('noni')
                elif p2 == '終助詞' or (nxt and nxt['lemma'] in ('だ', 'です')):
                    add('no-explain')
            elif s == 'も' and p2 == '係助詞':
                if prv and prv['s'] in ('て', 'で') and prv['pos1'] == '助詞':
                    add('temo')
                    if nxt and nxt['lemma'] in ('良い', 'いい'):
                        add('te-mo-ii')
                else:
                    add('mo')
            elif s == 'と' and p2 == '格助詞':
                if nxt and nxt['lemma'] == '思う':
                    add('to-omou')
                else:
                    add('to-and')
            elif s == 'か' and p2 == '終助詞':
                add('ka')
            elif s == 'ね' and p2 == '終助詞':
                add('ne')
            elif s == 'よ' and p2 == '終助詞':
                add('volitional' if prv and prv['pos1'] == '動詞' and (prv['cForm'] or '').startswith('未然形') else 'yo')
            elif s == 'から':
                add('kara-reason' if p2 == '接続助詞' else 'kara-made')
            elif s == 'まで':
                if not (nxt and nxt['s'] == 'に'):
                    add('kara-made')
            elif s == 'ので':
                add('node')
            elif s in ('けど', 'けれど', 'けれども', 'だけど'):
                add('kedo')
            elif s == 'のに':
                add('noni')
            elif s == 'し' and p2 == '接続助詞':
                add('shi')
            elif s == 'より':
                add('yori-hou')
            elif s == 'って':
                add('tte')
            elif s == 'っけ':
                add('kke')
            elif s in ('て', 'で') and p2 == '接続助詞':
                v = prv
                follow = nxt['lemma'] if nxt else None
                if follow in ('居る', 'いる'):
                    add('te-iru')
                elif follow in ('来る', '行く') and nxt['pos1'] == '動詞':
                    add('te-kuru')
                elif follow in ('見る',) and nxt['pos2'] == '非自立可能':
                    add('te-miru')
                elif follow in ('置く',):
                    add('te-oku')
                elif follow in ('下さる', 'くださる'):
                    add('te-kudasai')
                elif follow in ('貰う', 'もらう', 'くれる', '呉れる', 'あげる', '上げる'):
                    add('morau-kureru')
                    if nxt and nxt['base'] in ('いただける', '頂ける'):
                        add('keigo-request')
                elif follow in ('頂く', 'いただく', '頂ける', 'いただける'):
                    add('keigo-request')
                elif v and v['lemma'] == 'ない' and v['pos1'] == '助動詞':
                    add('nai-de')
                elif follow in ('良い', 'いい') and nxt['pos1'] == '形容詞':
                    add('te-mo-ii')
                elif nxt and nxt['s'] == '、':
                    add('te-and')
                elif follow is None or nxt['pos1'] == '補助記号' or (nxt['pos2'] == '終助詞' and nxt['s'] in ('ね', 'よ', 'ば')):
                    add('te-request')
                    if v and v['pos1'] == '動詞':
                        ct = v['cType'] or ''
                        if 'サ行' in ct and '五段' in ct:
                            add('te-su')
                        elif 'ガ行' in ct:
                            add('te-gu')
                        elif v['cForm'] == '連用形-撥音便':
                            add('te-bu-mu-nu')
                        elif v['cForm'] == '連用形-促音便' and v['lemma'] != '行く':
                            add('te-u-tsu-ru')
                        elif v['cForm'] == '連用形-イ音便' or v['lemma'] == '行く':
                            add('te-ku')
                        else:
                            add('te-ichidan')
        elif p1 == '助動詞':
            if lem == 'だ':
                if cf.startswith('意志推量形'):
                    add('deshou')
                elif cf.startswith('連用形-融合') or s == 'じゃ':
                    if nxt and nxt['lemma'] in ('無い', 'ない'):
                        add('janai')
                elif nxt and nxt['lemma'] == 'た':
                    add('adj-past' if prv and prv['pos1'] == '形状詞' else 'da')
                else:
                    add('da')
            elif lem == 'です':
                if cf.startswith('意志推量形'):
                    add('deshou')
                elif nxt and nxt['lemma'] == 'た':
                    add('polite-past')
                else:
                    add('desu')
            elif lem == 'ます':
                if s.startswith('ましょ'):
                    add('mashou')
                elif nxt and nxt['lemma'] == 'た':
                    add('polite-past')
                elif s == 'ませ' and nxt and nxt['s'] == 'ん' and nxt2 and nxt2['s'] == 'か':
                    add('mashou')
                add('masu')
            elif lem == 'た':
                if s == 'たら' or cf.startswith('仮定形'):
                    add('tara')
                elif prv and prv['lemma'] == 'ない' and prv['pos1'] == '助動詞':
                    add('nakatta')
                elif prv and prv['pos1'] == '形容詞':
                    add('adj-past')
                elif prv and prv['lemma'] in ('だ', 'です', 'ます'):
                    pass
                else:
                    add('past')
            elif lem == 'ない':
                if cf.startswith('仮定形-融合') or s in ('なきゃ', 'なくちゃ'):
                    add('nakya')
                else:
                    add('nai')
            elif lem == 'たい':
                add('tai')
            elif lem == 'てる':
                add('te-iru')
            elif lem in ('ちゃう', 'じゃう'):
                add('chau')
            elif lem in ('とく', 'どく'):
                add('te-oku')
            elif lem == 'う' or lem == 'よう':
                add('volitional')
            elif lem in ('れる', 'られる'):
                if prv and prv['cType'] and ('一段' in prv['cType'] or 'カ行変格' in prv['cType']) and lem == 'られる':
                    add('potential')
                else:
                    add('passive')
        elif p1 == '動詞':
            if cf.startswith('命令形') and lem not in ('下さる', 'くださる'):
                add('imperative')
            elif cf.startswith('意志推量形'):
                add('volitional')
            elif cf.startswith('終止形') and (nxt is None or nxt['pos1'] == '補助記号'):
                add('dict-form')
            # godan potential written as its own verb: 読める (lemma 読む), もらえる (lemma 貰う)
            kb, lf = m['kanaBase'] or '', m['lForm'] or ''
            e_row = {'え': 'う', 'け': 'く', 'げ': 'ぐ', 'せ': 'す', 'て': 'つ', 'ね': 'ぬ', 'べ': 'ぶ', 'め': 'む', 'れ': 'る'}
            if len(kb) >= 2 and kb.endswith('る') and kb[-2] in e_row and lf == kb[:-2] + e_row[kb[-2]]:
                add('potential')
            if lem in ('過ぎる',) and prv and prv['pos1'] in ('動詞', '形容詞'):
                pass
        elif p1 == '形容詞':
            if cf.startswith('連用形') and nxt and nxt['lemma'] in ('無い', 'ない') and nxt['pos1'] in ('形容詞', '助動詞'):
                add('adj-neg')
        elif p1 == '形状詞' and s == '好き':
            add('suki')
        elif p1 == '名詞' and s in ('ほう', '方') and nxt and nxt['s'] == 'が':
            add('yori-hou')
    for t in toks:
        if t['p'] == 'ctr':
            add('counters')
    if toks and toks[-1]['s'] in ('？', '?') or any(t['s'] in ('？', '?') for t in toks):
        add('question')
    return g


def strip_markup(s):
    """Game script markup {kanji|kana|key} or {kana} -> plain text; also returns author readings."""
    readings = []

    def rep(m):
        parts = m.group(1).split('|')
        if len(parts) >= 2:
            readings.append((parts[0], parts[1]))
        return parts[0]
    return re.sub(r'\{([^}]*)\}', rep, s), readings


def public(tok):
    return {k: v for k, v in tok.items() if not k.startswith('_')}
