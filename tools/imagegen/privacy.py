"""What counts as private in the image gen tool. The public code names no private content: the terms and the private
seed blocks are in one git-ignored file, island/private/imagegen/private.json, read when it exists:

  {"render": {"ratings": [...], "paths": [...], "negative_terms": [...], "positive_terms": [...]},
   "seeds": [{"id", "type", "data", "message"?}, ...]}

A render is private when its rating is one of `ratings`, its file is under one of `paths`, its negative holds one of
`negative_terms` or its prompt one of `positive_terms` (case-insensitive). Without the file, renders rated above safe
and anything filed under island/private/ count as private. Private blocks are the ones in the private preset folder
(store.py). Private mode itself is the /private cookie (tools/review_server.py), checked in server.py."""
import json, os

try:
    from . import store
except ImportError:
    import store

FILE = os.path.join(store.ROOT, 'private.json')
DEFAULT = dict(ratings=['sensitive', 'nsfw'], paths=['island/private/'], negative_terms=[], positive_terms=[])
_cache = {'stamp': None, 'data': {}}


def config():
    try:
        stamp = os.stat(FILE).st_mtime_ns
    except OSError:
        return {}
    if _cache['stamp'] != stamp:
        with open(FILE, encoding='utf-8') as f:
            _cache.update(stamp=stamp, data=json.load(f))
    return _cache['data']


def rules():
    r = dict(DEFAULT)
    for k, v in (config().get('render') or {}).items():
        r[k] = sorted(set(r.get(k, [])) | set(v))
    return r


def seeds():
    """The private seed blocks: the private file's `seeds`, and the older seed-scenes.json beside it."""
    out = list(config().get('seeds') or [])
    scenes = os.path.join(store.ROOT, 'seed-scenes.json')
    if os.path.exists(scenes):
        with open(scenes, encoding='utf-8') as f:
            out += [dict(s, type='scene') for s in json.load(f)]
    return out


def is_private_render(r):
    rule = rules()
    neg, pos = (r.get('negative') or '').lower(), (r.get('positive') or '').lower()
    path = r.get('out_path') or ''
    return (r.get('rating') in rule['ratings'] or any(path.startswith(p) for p in rule['paths'])
            or any(t.lower() in neg for t in rule['negative_terms']) or any(t.lower() in pos for t in rule['positive_terms']))


def is_private_block(p):
    """For sorting existing blocks into the two folders: listed in the private file's `blocks` ("type:id"), or a
    scene or style whose rating is above safe."""
    d = p.get('data') or {}
    rating = d.get('rating') or (d.get('defaults') or {}).get('rating') or 'safe'
    return f"{p['type']}:{p['id']}" in (config().get('blocks') or []) or (p['type'] in ('scene', 'style') and rating != 'safe')


def main(argv):
    """python3 tools/imagegen/privacy.py import <file.json>   write the private file (agents never write it by hand)
       python3 tools/imagegen/privacy.py sort [--dry-run]       put every block in the folder its audience says"""
    if argv[:1] == ['import']:
        with open(argv[1], encoding='utf-8') as f:
            data = json.load(f)
        os.makedirs(store.ROOT, exist_ok=True)
        store._atomic_write(FILE, json.dumps(data, ensure_ascii=False, indent=1))
        print('wrote', FILE)
    elif argv[:1] == ['sort']:
        for t, items in store.all_presets(private=True).items():
            for p in items:
                want = is_private_block(p)
                if want != p['private']:
                    print(f"{t}:{p['id']} -> {'private' if want else 'public'}")
                    if '--dry-run' not in argv:
                        store.set_private(t, p['id'], want)
    else:
        print(main.__doc__)


if __name__ == '__main__':
    import sys
    main(sys.argv[1:])
