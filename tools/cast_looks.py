"""Every cast member's look for image prompts, read from art/cast-looks.json (the one source; see its "about").

    import cast_looks
    cast_looks.line('mio')            # 'Mio, a 30-year-old woman with pale skin, <hair>, <eyes>, <glasses>, <signature>, <build>, wearing <outfit>'
    cast_looks.line('mio', sep=': ')  # 'Mio: a 30-year-old woman ...' (the one-block-per-character scene form)
    cast_looks.short('mio')           # the short form for group pictures
    cast_looks.negative('mio')        # her own negative words ('' if none)
    cast_looks.preset('mio')          # the image gen dashboard's character preset data

    python3 tools/cast_looks.py [id ...]          print the lines
    python3 tools/cast_looks.py --sync-dashboard  new preset versions in the image gen dashboard where a look changed

Tools never keep their own copy of a cast look (node tools/facts/cast-looks.mjs fails on one)."""
import json, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FILE = os.path.join(ROOT, 'art', 'cast-looks.json')
_cache = None


def load():
    """{id: entry} in file order."""
    global _cache
    if _cache is None:
        with open(FILE, encoding='utf-8') as f:
            _cache = {e['id']: e for e in json.load(f)['cast']}
    return _cache


def get(cid):
    try:
        return load()[cid]
    except KeyError:
        raise KeyError(f'{cid!r} is not in art/cast-looks.json') from None


def _join(*parts):
    return ', '.join(p.strip() for p in parts if p and p.strip())


def age_phrase(cid):
    """'a 30-year-old woman with pale skin', or the entry's own age_words."""
    e = get(cid)
    if e.get('age_words'):
        return _join(e['age_words'], f"with {e['skin']}" if e.get('skin') else '')
    return f"a {e['age']}-year-old {e['who']}" + (f" with {e['skin']}" if e.get('skin') else '')


def look(cid, glasses=True):
    """Hair, eyes, glasses and the other face details, as one phrase."""
    e = get(cid)
    parts = [p.strip() for p in (e['hair'], e['eyes'], e['glasses'] if glasses else '', e['extra']) if p and p.strip()]
    return ', '.join(parts[:-1]) + ' and ' + parts[-1] if len(parts) > 1 else ''.join(parts)


def line(cid, outfit=True, signature=True, glasses=True, sep=', '):
    """The full character block: name, age, look, signature, build and (unless outfit=False) the outfit.
    glasses=False leaves the glasses out (for a scene that names them, or takes them off, itself)."""
    e = get(cid)
    rest = _join(age_phrase(cid), look(cid, glasses), e['signature'] if signature else '', e['build'],
                 f"wearing {e['outfit']}" if outfit and e.get('outfit') else '')
    return f"{e['name']}{sep}{rest}"


def short(cid):
    return get(cid)['short']


def negative(cid):
    return get(cid).get('negative', '')


def portrait(cid):
    return get(cid)['portrait']


def preset(cid):
    """The dashboard's character preset data (tools/imagegen): the prompt there is "<name>, <age>, <look>, <signature>, <build>"."""
    e = get(cid)
    return dict(name=e['name'], gender=e['gender'], age=age_phrase(cid), look=look(cid), signature=e['signature'],
                build=e['build'], outfit=e['outfit'], short=e['short'], negative=e['negative'], portrait=e['portrait'])


def entry_hash(cid):
    import hashlib
    return hashlib.sha1(json.dumps(get(cid), sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:8]


def sync_dashboard(dry=False):
    """Save each cast member's look as a new version of their character preset in the image gen dashboard, through its
    store.py (old versions stay). A preset already synced from this exact entry is left alone, so a change Jørgen makes
    in the dashboard stays until the entry itself changes. Fields the looks don't own (notes, rating cap) are kept.
    Returns [(id, 'created' | 'new version' | 'same')]."""
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import comfy
    d = comfy._imagegen_tools_dir()
    if d is None:
        raise RuntimeError('tools/imagegen (the image gen dashboard) is not on this machine')
    if d not in sys.path:
        sys.path.append(d)
    from imagegen import store
    out = []
    for cid in load():
        tag = f'cast looks {entry_hash(cid)}'
        msg = f'{tag}: from art/cast-looks.json (cast.md and the approved portrait)'
        rec = store.load('character', cid)
        if rec is None:
            data = dict(preset(cid), rating_cap='', generic=False, notes='')
            out.append((cid, 'created'))
            if not dry:
                store.create('character', cid, data, msg)
            continue
        cur = rec['versions'][-1]['data']
        data = dict(cur, **preset(cid))
        if data == cur or any(v.get('message', '').startswith(tag) for v in rec['versions']):
            out.append((cid, 'same'))
            continue
        out.append((cid, 'new version'))
        if not dry:
            store.save_version('character', cid, data, msg)
    return out


if __name__ == '__main__':
    import sys
    if sys.argv[1:2] in (['--sync-dashboard'], ['--sync-dashboard-dry']):
        for cid, what in sync_dashboard(dry=sys.argv[1].endswith('dry')):
            print(f'{cid}: {what}')
        sys.exit(0)
    for cid in sys.argv[1:] or load():
        print(f'{cid}: {line(cid)}\n  short: {short(cid)}\n  negative: {negative(cid)}')
