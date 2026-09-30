"""Collect every scripted line of the island slice for voicing.
Source: legacy/island/content/voice_lines.json when the writer has produced it; otherwise the tables in legacy/island/content/storyboard.md
(Who | Japanese | Reading | Meaning), the "Lines the gates add" table in gates.md, and the level variants in variants.md.
Signs are skipped (they're read, not heard). The lift gets every floor it can stop at, since the panel has all the buttons.
Line id: <speaker>-<romaji of the reading, max 28 chars>-<4 hex of fnv1a(speaker|text)>, e.g. emi-a-kita-1f0c. The same speaker and text
anywhere in the script share one id, so the id only changes when the words change.
Writes ~/ai/island-audio/voice/lines.json and prints a report of quoted lines in the prose that no table voices.
Run: ~/ai/tts-bench/.venv/bin/python tools/island_audio/lines.py"""
import json, os, re, sys
import pykakasi

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
C = f'{REPO}/legacy/island/content'
OUT = os.path.expanduser('~/ai/island-audio/voice/lines.json')
kks = pykakasi.kakasi()


def fnv(s):
    x = 0x811c9dc5
    for ch in s:
        x ^= ord(ch)
        x = (x * 0x01000193) & 0xffffffff
    return f'{x:08x}'


def romaji(s):
    r = ''.join(x['hepburn'] for x in kks.convert(s))
    r = re.sub(r'[^a-z0-9]+', '-', r.lower()).strip('-')
    return r[:28].strip('-') or 'x'


SPEAKERS = [('you', 'player'), ('emi', 'emi'), ('mio', 'mio'), ('rei', 'rei'), ('ishibashi', 'ishibashi'), ('staff', 'staff'),
            ('salaryman', 'salaryman'), ('lift', 'lift'), ('vending', 'vending'), ('voice (sales', 'sales'), ('sign', None)]


def speaker(who):
    w = who.strip().lower()
    for pre, sp in SPEAKERS:
        if w.startswith(pre):
            return sp, ('message' if ('message' in w or 'chat' in w) else 'off' if '(off)' in w else 'line')
    raise ValueError(f'unknown speaker: {who}')


def clean(jp):
    return jp.strip().replace('　', ' ')


def reading(jp, rd):
    rd = rd.strip()
    if rd == 'same' or rd.startswith('('):
        # "same" means the line is kana already; "(kādo)" or "(kādo) は？" gives romaji for a katakana word
        return jp
    return rd


lines = {}
order = []


def add(sp, kind, jp, rd, en, where, who, tier='main', note=None):
    jp = clean(jp)
    rd = reading(jp, rd)
    key = f'{sp}|{jp}'
    if key not in lines:
        lid = f'{sp}-{romaji(rd)}-{fnv(key)[:4]}'
        lines[key] = {'id': lid, 'speaker': sp, 'jp': jp, 'reading': rd, 'en': en.strip(), 'kind': kind, 'tier': tier,
                      'uses': []}
        if note:
            lines[key]['note'] = note
        order.append(key)
    L = lines[key]
    if tier == 'main' and L['tier'] != 'main':
        L['tier'] = 'main'
    if kind == 'line' and L['kind'] != 'line':
        L['kind'] = 'line'
    L['uses'].append({'where': where, 'who': who.strip(), 'en': en.strip()})


def rows(md):
    """Yield (heading, cells) for every table row, with the nearest ### heading."""
    head = ''
    header = None
    for raw in md.splitlines():
        if raw.startswith('#'):
            head = raw.lstrip('#').strip()
            header = None
            continue
        if not raw.startswith('|'):
            header = None
            continue
        cells = [c.strip() for c in raw.strip().strip('|').split('|')]
        if header is None:
            header = [c.lower() for c in cells]
            continue
        if set(''.join(cells)) <= set('-: '):
            continue
        yield head, dict(zip(header, cells))


# The writer's speakers -> the voice that says them; $target and $witness are decided at runtime, so they're voiced once per listener.
VOICE_OF = {'employee': 'salaryman', 'sales_voice': 'sales'}
RUNTIME = {'$target': ['emi', 'mio', 'rei', 'ishibashi', 'staff'], '$witness': ['emi', 'mio', 'rei', 'ishibashi', 'staff', 'salaryman']}
WORDLESS = {'……？': '……ん？', '？': 'ん？'}  # a puzzled look has no words: voiced as a puzzled 「ん？」
SONG = {'n03_mio_hikare_memory', 'n03_emi_hikare_memory'}  # the chorus as she sang it: cut from the song's guide vocal, not TTS


def from_voice_lines(p):
    """voice_lines.json -> TTS items (one per voice and text, reusing the takes already made for the storyboard's lines) and the
    writer's lines, each pointing at its TTS item (`raw`)."""
    d = json.load(open(p))
    old = {}
    ps = os.path.expanduser('~/ai/island-audio/voice/lines_storyboard.json')
    if os.path.exists(ps):
        for l in json.load(open(ps))['lines']:
            old[(l['speaker'], l['jp'])] = l['id']
    items, order_, out = {}, [], []
    for it in d['lines']:
        jp = clean(it['jp'])
        kana = it.get('kana') or jp
        tier = 'variant' if it.get('variant') in ('easy', 'hard') else 'main'
        base = {'id': it['id'], 'speaker': it['speaker'], 'jp': jp, 'reading': kana, 'en': it.get('en', ''), 'kind': it.get('kind', 'line'),
                'variant': it.get('variant'), 'scene': it.get('scene'), 'delivery': it.get('delivery'), 'note': it.get('note')}
        if it['id'] in SONG:
            out.append(dict(base, raw=None, source='song'))
            continue
        voices = RUNTIME.get(it['speaker'], [VOICE_OF.get(it['speaker'], it['speaker'])])
        for v in voices:
            tts = WORDLESS.get(jp)
            key = (v, jp)
            if key not in items:
                raw = old.get(key) or f'{v}-{romaji(tts or kana)}-{fnv(f"{v}|{jp}")[:4]}'
                items[key] = {'id': raw, 'speaker': v, 'jp': jp, 'reading': tts or kana, 'en': it.get('en', ''), 'tier': tier,
                              'kind': it.get('kind', 'line'), 'uses': []}
                if tts:
                    items[key]['tts'] = tts
                order_.append(key)
            if tier == 'main':
                items[key]['tier'] = 'main'
            items[key]['uses'].append({'where': it.get('scene', ''), 'who': it['speaker'], 'en': it.get('en', ''), 'id': it['id']})
            out.append(dict(base, raw=items[key]['id'], voice=v, file_id=it['id'] if len(voices) == 1 else f'{it["id"]}_{v}'))
    return [items[k] for k in order_], out


def main():
    vl = f'{C}/voice_lines.json'
    source = []
    if os.path.exists(vl) and '--storyboard' not in sys.argv:
        tts, script = from_voice_lines(vl)
        ids = [l['id'] for l in tts]
        assert len(ids) == len(set(ids)), 'duplicate tts ids'
        json.dump({'source': ['legacy/island/content/voice_lines.json'], 'lines': tts, 'map': script}, open(OUT, 'w'), ensure_ascii=False, indent=1)
        by = {}
        for l in tts:
            by.setdefault(l['speaker'], [0, 0])[0 if l['tier'] == 'main' else 1] += 1
        print(len(script), 'script lines ->', len(tts), 'voice items;', {k: f'{a} main + {b} variant' for k, (a, b) in by.items()})
        print('from the song:', [l['id'] for l in script if l.get('source') == 'song'])
        return
    else:
        sb = open(f'{C}/storyboard.md').read()
        for head, r in rows(sb):
            if 'who' not in r or 'japanese' not in r:
                continue
            sp, kind = speaker(r['who'])
            if sp is None:
                continue
            add(sp, kind, r['japanese'], r.get('reading', 'same'), r.get('meaning', ''), head.split('·')[0].strip(), r['who'])
        gt = open(f'{C}/gates.md').read()
        for head, r in rows(gt):
            if head.startswith('Lines the gates add') and 'who' in r:
                sp, kind = speaker(r['who'])
                if sp:
                    add(sp, kind, r['japanese'], r.get('reading', 'same'), r.get('meaning', ''), 'gates', r['who'])
        source += ['legacy/island/content/storyboard.md', 'legacy/island/content/gates.md']
        # Every floor the lift can announce (gates.md, the lift: R, 5 to 1, B1 to B3).
        for jp, rd, en in [('五階です。', 'ごかいです。', 'Floor 5.'), ('四階です。', 'よんかいです。', 'Floor 4.'), ('二階です。', 'にかいです。', 'Floor 2.')]:
            add('lift', 'line', jp, rd, en, 'lift panel', 'Lift (voice)', note='added: the panel has every floor button')
        # Level variants: the speaker comes from the default line (same speaker at every level).
        va = open(f'{C}/variants.md').read()
        by_text = {}
        for k in order:
            by_text.setdefault(lines[k]['jp'], lines[k]['speaker'])
        pending = []
        for head, r in rows(va):
            if 'level' not in r or 'line' not in r:
                continue
            pending.append((head, r))
        # group rows into tables of three (beginner, default, N4)
        groups, cur = [], []
        for head, r in pending:
            if r['level'].lower().startswith('beginner') and cur:
                groups.append(cur)
                cur = []
            cur.append((head, r))
        if cur:
            groups.append(cur)
        unresolved = []
        for g in groups:
            default = next((r for h, r in g if r['level'].lower().startswith('default')), None)
            head = g[0][0]
            parts_default = [p.strip() for p in default['line'].split(' / ')] if default else []
            sp = next((by_text.get(clean(p)) for p in parts_default if by_text.get(clean(p))), None)
            if sp is None:
                hl = head.lower()
                sp = next((s for pre, s in SPEAKERS if s and pre.split(' ')[0] in hl), None)
            if sp is None:
                unresolved.append(head)
                continue
            for h, r in g:
                lvl = r['level'].lower()
                if lvl.startswith('default'):
                    continue
                parts = [p.strip() for p in r['line'].split(' / ')]
                rds = [p.strip() for p in r.get('reading', 'same').split(' / ')]
                for i, p in enumerate(parts):
                    if not p or p.startswith('('):
                        continue
                    rd = rds[i] if i < len(rds) else 'same'
                    add(sp, 'line', p, rd, r.get('meaning', ''), h.split('·')[0].strip() + (' beginner' if lvl.startswith('beg') else ' N4'),
                        f'{sp} ({r["level"]})', tier='variant')
        source.append('legacy/island/content/variants.md')
        if unresolved:
            print('variants with no speaker:', unresolved, file=sys.stderr)
    out = [lines[k] for k in order]
    ids = [l['id'] for l in out]
    assert len(ids) == len(set(ids)), 'duplicate ids'
    json.dump({'source': source, 'lines': out}, open(OUT, 'w'), ensure_ascii=False, indent=1)
    by = {}
    for l in out:
        by.setdefault(l['speaker'], [0, 0])[0 if l['tier'] == 'main' else 1] += 1
    print(len(out), 'lines;', {k: f'{a} main + {b} variant' for k, (a, b) in by.items()})
    # quoted lines in the prose that no table voices (commands the player types are expected here)
    voiced = {re.sub(r'[……。！？、\s〜ー]', '', l['jp']) for l in out}
    seen = set()
    for f in ('storyboard.md', 'gates.md'):
        for q in re.findall(r'「([^」]+)」', open(f'{C}/{f}').read()):
            n = re.sub(r'[……。！？、\s〜ー]', '', q)
            if n and n not in voiced and n not in seen:
                seen.add(n)
    print('quoted but not voiced (mostly typed commands):', ' '.join(sorted(seen)))


if __name__ == '__main__':
    main()
