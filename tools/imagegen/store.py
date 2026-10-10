"""Presets ("blocks") with versions, and the render log. The code is in git; the data never is.

Blocks are the tool's local configuration, git-ignored, in two folders by audience:
  tools/imagegen/config/presets/<type>/<id>.json     public blocks (cast, cameras, plain styles ...)
  island/private/imagegen/presets/<type>/<id>.json   private blocks, listed and served only in private mode
  each {id, type, created, archived, claude_note, claude_note_at, versions: [{v, at, message, data}]}
A fresh checkout seeds the public folder from tools/imagegen/example-config/presets.json; the private seeds and the
private filter terms come from the private config file when it exists (privacy.py).
The rest lives in island/private/imagegen/ (git-ignored):
log.jsonl                 one line per render; star, fav, reject and note are rewritten in place on that line
outputs/<date>/<file>.png the original PNGs from ComfyUI (workflow embedded)
thumbs/<date>/<file>.webp small copies for the grids
"""
import contextlib, fcntl, json, os, threading, time, re

# The data always belongs to the main checkout: a worktree's copy of this code reads and writes the same files.
REPO = re.split(r'/\.claude/worktrees/', os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))[0]
ROOT = os.environ.get('IMAGEGEN_ROOT') or os.path.join(REPO, 'island', 'private', 'imagegen')  # env override for tests
OFF_LIMITS = os.path.join(REPO, 'island', 'private', 'user')  # Jørgen's own folder: nothing here reads it
PRESETS = os.path.join(ROOT, 'presets')  # the private blocks
CONFIG = os.environ.get('IMAGEGEN_CONFIG') or (os.path.join(ROOT, 'config') if os.environ.get('IMAGEGEN_ROOT')
                                               else os.path.join(REPO, 'tools', 'imagegen', 'config'))
PUBLIC_PRESETS = os.path.join(CONFIG, 'presets')  # the public blocks
EXAMPLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'example-config', 'presets.json')
OUTPUTS = os.path.join(ROOT, 'outputs')
THUMBS = os.path.join(ROOT, 'thumbs')
LOG = os.path.join(ROOT, 'log.jsonl')
TYPES = ('character', 'outfit', 'style', 'negative', 'framing', 'camera', 'location', 'pose', 'light', 'scene', 'model')  # web/blocks.js KINDS

# Presets and log lines saved before the 2026-09-28 cleanup point at the old places: approved portraits are now copied
# to art/approved/<id>/, and proto2/, side/, mvp/, game/ and island/ (except island/private) moved to legacy/.
MOVED = ('proto2/', 'proto/', 'mvp/', 'side/', 'game/', 'island/')


def repo_rel(rel):
    """A repo-relative path as stored in presets to where the file is now (unchanged if it still exists)."""
    if os.path.exists(os.path.join(REPO, rel)) or rel.startswith('island/private') or not rel.startswith(MOVED):
        return rel
    name = os.path.basename(rel)
    approved = os.path.join(REPO, 'art', 'approved')
    if rel.startswith('proto2/') and os.path.isdir(approved):
        for d in sorted(os.listdir(approved)):
            if os.path.isfile(os.path.join(approved, d, name)):
                return f'art/approved/{d}/{name}'
    return 'legacy/' + rel

_lock = threading.RLock()


def now():
    return time.strftime('%Y-%m-%dT%H:%M:%S')


def _atomic_write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(text)
    os.replace(tmp, path)


def make_thumb(src, rel):
    """A 480 px webp of src at thumbs/<rel without extension>.webp; returns that relative path. Raises on a bad image."""
    from PIL import Image
    out = os.path.splitext(rel)[0] + '.webp'
    dst = os.path.join(THUMBS, out)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im = Image.open(src).convert('RGB')
    im.thumbnail((480, 480))
    im.save(dst, 'WEBP', quality=82)
    return out


def slug(s):
    s = re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
    return s[:40] or 'preset'


# ---------------------------------------------------------------- presets
def _check(ptype, pid):
    if ptype not in TYPES or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,60}', pid):
        raise ValueError('bad preset id')


def _ppath(ptype, pid, private=False):
    _check(ptype, pid)
    return os.path.join(PRESETS if private else PUBLIC_PRESETS, ptype, pid + '.json')


def _find(ptype, pid):
    """(path, private) of a preset, whichever folder holds it, or (None, False)."""
    for priv in (False, True):
        p = _ppath(ptype, pid, priv)
        if os.path.exists(p):
            return p, priv
    return None, False


def load(ptype, pid):
    with _lock:
        p, priv = _find(ptype, pid)
        if not p:
            return None
        with open(p, encoding='utf-8') as f:
            rec = json.load(f)
        rec['private'] = priv
        return rec


def _save(rec):
    priv = bool(rec.get('private'))
    out = {k: v for k, v in rec.items() if k != 'private'}  # the folder says it
    _atomic_write(_ppath(rec['type'], rec['id'], priv), json.dumps(out, ensure_ascii=False, indent=1))


def create(ptype, pid, data, message='created', private=False):
    with _lock:
        if load(ptype, pid):
            raise ValueError('exists')
        dirs = (os.path.join(PUBLIC_PRESETS, ptype), os.path.join(PRESETS, ptype))
        order = sum(len(os.listdir(d)) for d in dirs if os.path.isdir(d))
        rec = dict(id=pid, type=ptype, created=now(), order=order, archived=False, claude_note='', claude_note_at='',
                   versions=[dict(v=1, at=now(), message=message, data=data)], private=bool(private))
        _save(rec)
        return rec


def save_version(ptype, pid, data, message=''):
    """Every save is a new version; old ones stay. Saving identical data does nothing."""
    with _lock:
        rec = load(ptype, pid)
        if rec is None:
            return create(ptype, pid, data, message or 'created')
        if rec['versions'][-1]['data'] == data:
            return rec
        rec['versions'].append(dict(v=rec['versions'][-1]['v'] + 1, at=now(), message=message, data=data))
        _save(rec)
        return rec


def restore(ptype, pid, v):
    with _lock:
        rec = load(ptype, pid)
        old = next(x for x in rec['versions'] if x['v'] == v)
        return save_version(ptype, pid, json.loads(json.dumps(old['data'])), f'restored v{v}')


def set_note(ptype, pid, text):
    with _lock:
        rec = load(ptype, pid)
        rec['claude_note'] = text
        rec['claude_note_at'] = now()
        _save(rec)
        return rec


def set_archived(ptype, pid, archived):
    with _lock:
        rec = load(ptype, pid)
        rec['archived'] = bool(archived)
        _save(rec)
        return rec


def set_private(ptype, pid, private):
    """Move a preset between the public and the private folder; its versions go with it."""
    with _lock:
        rec = load(ptype, pid)
        if rec is None or rec['private'] == bool(private):
            return rec
        old = _ppath(ptype, pid, rec['private'])
        rec['private'] = bool(private)
        _save(rec)
        os.remove(old)
        return rec


def all_presets(full=False, private=False):
    """{type: [ {id, type, v, data, archived, private, claude_note, versions?} ]} with the current version's data.
    Private blocks are listed only when private is true."""
    out = {t: [] for t in TYPES}
    with _lock:
        for t in TYPES:
            for priv, base in ((False, PUBLIC_PRESETS), (True, PRESETS)):
                d = os.path.join(base, t)
                if (priv and not private) or not os.path.isdir(d):
                    continue
                for fn in sorted(os.listdir(d)):
                    if not fn.endswith('.json'):
                        continue
                    with open(os.path.join(d, fn), encoding='utf-8') as f:
                        rec = json.load(f)
                    cur = rec['versions'][-1]
                    item = dict(id=rec['id'], type=t, v=cur['v'], at=cur['at'], data=cur['data'], archived=rec.get('archived', False),
                                private=priv, claude_note=rec.get('claude_note', ''), claude_note_at=rec.get('claude_note_at', ''),
                                nversions=len(rec['versions']), order=rec.get('order', 999))
                    if full:
                        item['versions'] = rec['versions']
                    out[t].append(item)
            out[t].sort(key=lambda x: (x['order'], x['id']))
    return out


def seed_if_empty():
    """Write the starting blocks once: the public example config, then the private seeds (privacy.py). Existing
    presets are never overwritten."""
    try:
        from . import privacy
    except ImportError:
        import privacy
    seeds = []
    if os.path.exists(EXAMPLE):
        with open(EXAMPLE, encoding='utf-8') as f:
            seeds += [dict(p, private=False) for p in json.load(f)['presets']]
    seeds += [dict(p, private=True) for p in privacy.seeds()]
    made = 0
    for p in seeds:
        if load(p['type'], p['id']) is None:
            create(p['type'], p['id'], p['data'], p.get('message') or 'seeded', private=p['private'])
            made += 1
    return made


# ---------------------------------------------------------------- render log
_flock_depth = 0


@contextlib.contextmanager
def _log_locked():
    """The log is written by the dashboard and by agent scripts (agentlog.py) in other processes: one file lock, taken
    for every append and every read-modify-write, so a rating never wipes a line an agent just added."""
    global _flock_depth
    with _lock:
        if _flock_depth:
            _flock_depth += 1
            try:
                yield
            finally:
                _flock_depth -= 1
            return
        os.makedirs(ROOT, exist_ok=True)
        with open(LOG + '.lock', 'a') as lf:
            fcntl.flock(lf, fcntl.LOCK_EX)
            _flock_depth = 1
            try:
                yield
            finally:
                _flock_depth = 0
                fcntl.flock(lf, fcntl.LOCK_UN)


def log_append(entry):
    with _log_locked():
        os.makedirs(ROOT, exist_ok=True)
        if 'n' not in entry:
            # A permanent short number per picture, shown as #n in the dashboard so Jørgen can name a picture in chat.
            entry = dict(entry, n=max((r.get('n') or 0 for r in log_read()), default=0) + 1)
        with open(LOG, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, ensure_ascii=False) + '\n')


def log_read():
    with _lock:
        if not os.path.exists(LOG):
            return []
        out = []
        with open(LOG, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        out.append(json.loads(line))
                    except ValueError:
                        pass
        return out


RATE_FIELDS = ('star', 'fav', 'reject', 'reject_reason', 'note')


def log_update(rid, fields):
    """Rewrite one render's line with his star, favourite, reject and note."""
    with _log_locked():
        rows = log_read()
        hit = None
        for r in rows:
            if r.get('id') == rid:
                for k in RATE_FIELDS:
                    if k in fields:
                        r[k] = fields[k]
                r['rated_at'] = now()
                hit = r
        if hit is None:
            return None
        _atomic_write(LOG, ''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows))
        return hit


def number_all():
    """Give every logged picture without one a number, in log order (one-off for pictures from before numbering)."""
    with _log_locked():
        rows = log_read()
        top = max((r.get('n') or 0 for r in rows), default=0)
        missing = [r for r in rows if not r.get('n')]
        for r in missing:
            top += 1
            r['n'] = top
        if missing:
            _atomic_write(LOG, ''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows))
        return len(missing)


def log_set(rid_or_pred, fields):
    """Set any fields on the matching render lines (a render id, or a function row -> bool). Returns the changed rows."""
    with _log_locked():
        rows = log_read()
        pred = rid_or_pred if callable(rid_or_pred) else (lambda r: r.get('id') == rid_or_pred)
        hit = []
        for r in rows:
            if pred(r):
                r.update(fields)
                hit.append(r)
        if hit:
            _atomic_write(LOG, ''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows))
        return hit


TRASH = os.path.join(ROOT, 'trash')
PORTRAITS = os.path.join(ROOT, 'portraits')
