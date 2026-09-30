"""Read legacy/island/content/lyrics_v2.md (two versions of the karaoke lyrics) into ~/ai/island-audio/song/v2/versions.json:
per version its YuE2 lyric block (for song_gen3.py), its lines as song_build.py wants them ([section, English, [[surface, reading,
dictionary key, catchable], ...]]) and the commands that must be heard. Run: ~/ai/tts-bench/.venv/bin/python tools/island_audio/lyrics_v2.py"""
import json, os, re
import pykakasi

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = f'{REPO}/legacy/island/content/lyrics_v2.md'
OUT = os.path.expanduser('~/ai/island-audio/song/v2/versions.json')
kks = pykakasi.kakasi()
GODAN = {'れ': 'る', 'け': 'く', 'せ': 'す', 'て': 'つ', 'え': 'う', 'め': 'む', 'べ': 'ぶ', 'ね': 'ぬ', 'げ': 'ぐ'}
IRREGULAR = {'しろ': 'する', '来い': '来る'}
ICHIDAN = {'起きろ', '見ろ', '上げろ', '覚えろ', '忘れろ', '入れろ', '開けろ', '止めろ', '寝ろ', '食べろ'}


def key_of(c):
    """Dictionary form of a command: 〜な drops the な, する and 来る are their own, ichidan ろ -> る, godan え-row -> う-row."""
    if c.endswith('な') and len(c) > 2:
        return c[:-1]
    if c in IRREGULAR:
        return IRREGULAR[c]
    if c in ICHIDAN or (c.endswith('ろ') and c not in GODAN):
        return c[:-1] + 'る'
    return c[:-1] + GODAN.get(c[-1], c[-1])


def hira(s):
    return ''.join(x['hira'] for x in kks.convert(s))


def words_of(jp, reading, catches):
    """Split a line at its punctuation into phrases, and split a catchable command off the end of its phrase."""
    parts = re.split(r'([、！!？?。])', jp)
    rparts = re.split(r'([、！!？?。])', reading)
    out = []
    for ph, rp in zip(parts, rparts):
        if not ph:
            continue
        if ph in '、！!？?。':
            out.append([ph, '', None, False])
            continue
        c = next((c for c in catches if ph.endswith(c)), None)
        if c and c != ph:
            cr = c if re.fullmatch(r'[぀-ゟ]+', c) else hira(c)
            if rp.endswith(cr):
                pre, prer = ph[:-len(c)], rp[:-len(cr)]
                out.append([pre, prer, None, False])
                out.append([c, cr, key_of(c), True])
                continue
        out.append([ph, rp, key_of(c) if c else None, bool(c)])
    return out


def main():
    md = open(SRC).read()
    versions = {}
    for m in re.finditer(r'^## Version (\w): (.+)$', md, re.M):
        v, title = m.group(1).lower(), m.group(2).strip()
        body = md[m.end():]
        body = body[:re.search(r'^## ', body, re.M).start()]
        lines, sec = [], None
        for ln in body.splitlines():
            h = re.match(r'^### \[([\w-]+)\]', ln)
            if h:
                sec = h.group(1)
                continue
            cells = [c.strip() for c in ln.strip().strip('|').split('|')] if ln.startswith('|') else []
            if len(cells) >= 6 and cells[0].isdigit():
                jp, rd, en, catch = cells[1], cells[2], cells[3], cells[5]
                cs = [re.sub(r'\(.*?\)', '', c).strip() for c in catch.split(',') if c.strip()]
                lines.append([sec, en, words_of(jp, rd, [c for c in cs if c])])
        blk = re.search(rf'Version {m.group(1)} as YuE2 takes it:\n\n((?:    .*\n|\n)+)', md)
        lyrics = '\n'.join(l[4:] for l in blk.group(1).rstrip().splitlines()).strip() if blk else ''
        l14 = next((w[0] for w in lines[13][2] if w[3]), None) if len(lines) >= 14 else None
        versions[v] = {'title': title, 'lyrics': lyrics, 'lines': lines, 'must_hear': ['光れ', '来い'] + ([l14] if l14 else [])}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(versions, open(OUT, 'w'), ensure_ascii=False, indent=1)
    for v, s in versions.items():
        n = sum(len(w[1]) for _, _, ws in s['lines'] for w in ws)
        print(v, s['title'], len(s['lines']), 'lines,', n, 'kana; must hear', s['must_hear'])
        for sec, en, ws in s['lines']:
            print('  ', sec, ' '.join(f'{w[0]}' + (f'[{w[2]}]' if w[3] else '') for w in ws))
        print(s['lyrics'][:80].replace('\n', ' / '))


if __name__ == '__main__':
    main()
