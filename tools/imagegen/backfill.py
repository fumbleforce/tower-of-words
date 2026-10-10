"""One-off: put the old rounds' pictures in the dashboard gallery as agent renders, from their prompts*.json logs
(island/private/rewards/**/prompts*.json, art/candidates/portraits/*/prompts*.json). The newest 400 pictures only.
Nothing is copied: each entry points at the picture in its round folder and gets a thumbnail.

  python3 tools/imagegen/backfill.py [--dry-run] [--limit 400]

Safe to run twice: agentlog.add skips a picture that is already logged."""
import argparse, glob, json, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import agentlog, store  # noqa: E402

EXTS = ('.webp', '.png', '.jpg')


def entries(path):
    """(key, item) for every record in a prompts file, whether it is a list with ids or a dict keyed by name."""
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    pairs = ((v.get('id') or v.get('key'), v) for v in data if isinstance(v, dict)) if isinstance(data, list) else data.items()
    for k, v in pairs:
        if k and isinstance(v, dict) and v.get('prompt'):
            yield str(k), v


def find_image(folder, key, item):
    for rel in (item.get('file'), item.get('out')):
        if rel:
            for base in (store.REPO, folder):
                p = os.path.join(base, rel)
                if os.path.isfile(p):
                    return p
    for ext in EXTS:
        p = os.path.join(folder, key + ext)
        if os.path.isfile(p):
            return p
    return None


def number(v, cast=float):
    try:
        return cast(v)
    except (TypeError, ValueError):
        return None


def settings(item):
    """steps, cfg, sampler, scheduler, size, model from the fields rounds use: separate keys, or one 'settings' string."""
    text = str(item.get('settings') or '')
    size = item.get('size') or (re.search(r'(\d{3,4})\s*x\s*(\d{3,4})', text) or [None])[0]
    w, h = item.get('w'), item.get('h')
    if isinstance(size, str):
        m = re.findall(r'\d+', size)
        w, h = (w, h) if len(m) < 2 else (m[0], m[1])
    elif isinstance(size, (list, tuple)) and len(size) == 2:
        w, h = size
    steps = item.get('steps') or (re.search(r'(\d+)\s*steps', text) or [None, None])[1]
    cfg = item.get('cfg') or (re.search(r'cfg\s*([\d.]+)', text, re.I) or [None, None])[1]
    m = re.search(r'(euler_ancestral|euler a|euler|dpmpp\w*|res_multistep)(?:[ ,]+(normal|simple|karras|beta))?', text, re.I)
    sampler = item.get('sampler') or (m and m[1])
    scheduler = item.get('scheduler') or (m and m[2]) or None
    if item.get('sampler') and ' ' in str(sampler):  # "euler_ancestral normal" in one field
        sampler, scheduler = str(sampler).split(None, 1)
    model = item.get('model') or (re.match(r'\s*([A-Za-z][\w .-]*?),', text) or [None, None])[1]
    return dict(w=number(w, int), h=number(h, int), steps=number(steps, int), cfg=number(cfg), model_file={'RDBT Anima': 'rdbtAnima'}.get(model, model),
                sampler=sampler, scheduler=scheduler)


def collect():
    files = glob.glob(os.path.join(store.REPO, 'island/private/rewards/**/prompts*.json'), recursive=True)
    files += glob.glob(os.path.join(store.REPO, 'art/candidates/portraits/*/prompts*.json'))
    out = []
    for path in files:
        folder = os.path.dirname(path)
        try:
            for key, item in entries(path):
                img = find_image(folder, key, item)
                if img:
                    out.append((os.path.getmtime(img), img, key, item, folder))
        except (OSError, ValueError, AttributeError):
            print(f'skipped {path}', file=sys.stderr)
    out.sort(key=lambda x: x[0], reverse=True)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=400)
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    found = collect()[:a.limit]
    added = 0
    for mtime, img, key, item, folder in reversed(found):  # oldest first, so the log stays in time order
        who = os.path.relpath(folder, store.REPO)
        fields = dict(item, **settings(item), owner='backfill', round=agentlog.rel_path(folder), backfilled=True,
                      seed=number(item.get('seed'), int), elapsed=number(item.get('seconds')), at=time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(mtime)),
                      positive=item['prompt'], negative=item.get('negative') or '', extras=[])
        fields.pop('mode', None)
        if a.dry_run:
            print(who, key, fields['seed'], fields['w'], fields['h'], fields['steps'], fields['cfg'], fields['model_file'])
            continue
        if agentlog.add(fields, img, copy=False):
            added += 1
    print(f'{len(found)} pictures found (newest {a.limit}), {added} added')


if __name__ == '__main__':
    main()
