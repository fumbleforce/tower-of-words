"""Agent renders in the dashboard's gallery. tools/comfy.py run() calls record() after every image it saves, and
backfill.py calls add() for old rounds, so every picture the agents make shows up next to Jørgen's own with its full
prompt, negative, seed, size, steps, cfg, sampler and model, and who made it.

It writes through store.py (same file lock as the dashboard) and never raises: a logging failure must not break a render.
"""
import copy as _copy
import hashlib, os, re, sys

try:
    from . import store
except ImportError:  # run as a plain script, or with tools/imagegen on sys.path
    import store


def rel_path(p):
    """A repo-relative path; a worktree's copy of the repo counts as the repo."""
    p = os.path.abspath(p)
    m = re.search(r'/\.claude/worktrees/[^/]+(/|$)', p)
    if m:
        p = store.REPO + '/' + p[m.end():]
    r = os.path.relpath(p, store.REPO)
    return p if r.startswith('..') else r


def owner_name():
    """GPU_OWNER, else the owner holding gpu.lock (tools/gpu_priority.py), else the script that is running."""
    if os.environ.get('GPU_OWNER'):
        return os.environ['GPU_OWNER']
    try:
        sys.path.insert(0, os.path.join(store.REPO, 'tools'))
        import gpu_priority
        held = gpu_priority.lock_owner()
        if held:
            return held
    except Exception:
        pass
    return rel_path(sys.argv[0]) if sys.argv and sys.argv[0] else 'unknown'


def round_name(out_path):
    cwd = rel_path(os.getcwd())
    return cwd if cwd != '.' else rel_path(os.path.dirname(os.path.abspath(out_path)))


def file_sha(path):
    h = hashlib.sha1()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def add(fields, src, copy=True):
    """Append one agent render. fields: positive, negative, seed, w, h, steps, cfg, sampler, scheduler, model_file, extras,
    mode, denoise, src_image, owner, round, compose, elapsed, at, backfilled. src: the original image.
    compose carries the editor scene (subplotId) and shot (imageSlot) when this render belongs to a scene.
    copy=True puts a webp copy in outputs/<date>/ (live renders); False keeps only a thumbnail and points at src (backfill).
    Returns the new log id, or None when this exact picture is already logged."""
    from PIL import Image
    compose = fields.get('compose')
    if compose is not None and not isinstance(compose, dict):
        raise ValueError('compose must be an object or None')
    out_path = rel_path(src)
    if os.path.join(store.REPO, out_path).startswith(store.OFF_LIMITS + os.sep):
        return None
    sha = file_sha(src)
    with store._log_locked():
        if any(r.get('sha') == sha and r.get('out_path') == out_path for r in store.log_read()):
            return None
        at = fields.get('at') or store.now()
        rid = f"a{at[2:10].replace('-', '')}-{at[11:19].replace(':', '')}-{sha[:6]}"
        rel = f'{at[:10]}/{rid}.webp'
        with Image.open(src) as im:
            w, h = im.size
        e = dict(id=rid, run_id=rid, idx=1, status='done', error=None, file='', thumb=store.make_thumb(src, rel), source='agent',
                 owner=fields.get('owner') or owner_name(), round=fields.get('round') or round_name(src), out_path=out_path, sha=sha,
                 seed=fields.get('seed'), model_file=fields.get('model_file'), w=fields.get('w') or w, h=fields.get('h') or h,
                 steps=fields.get('steps'), cfg=fields.get('cfg'), sampler=fields.get('sampler'), scheduler=fields.get('scheduler'),
                 positive=fields.get('positive') or '', negative=fields.get('negative') or '', extras=fields.get('extras') or [],
                 mode=fields.get('mode'), denoise=fields.get('denoise'), src_image=fields.get('src_image'),
                 overridden=False, presets=None, rating='', scene_text='', characters=[], compose=_copy.deepcopy(compose), elapsed=fields.get('elapsed'),
                 backfilled=bool(fields.get('backfilled')), at=at, star=False, fav=False, reject=False, reject_reason='', note='')
        if copy:
            dst = os.path.join(store.OUTPUTS, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with Image.open(src) as im:
                im.convert('RGB').save(dst, 'WEBP', quality=92)
            e['file'] = rel
        store.log_append(e)
        return rid


def record(parsed, out_path, elapsed=None):
    """Log a finished render: parsed is comfy_log.parse_workflow(workflow). Never raises."""
    try:
        return add(dict(parsed, elapsed=elapsed), out_path)
    except Exception as e:
        print(f'agentlog: not logged ({type(e).__name__}: {e})', file=sys.stderr)
        return None


def associate(render_id, scene_id, image_slot, *, expected_compose):
    """Attach one explicitly identified existing render to an editor scene and shot, without picking it.

    expected_compose must be the record's current compose object (or None). A stale caller cannot overwrite a
    concurrent metadata change. Only the two association keys change; prompts, provenance and ratings stay intact.
    The dashboard queue and agentlog use the same render store, so either source can carry an association.
    """
    if any(not isinstance(v, str) or not v.strip() for v in (render_id, scene_id, image_slot)):
        raise ValueError('render id, scene id and image slot must be nonempty strings')
    if expected_compose is not None and not isinstance(expected_compose, dict):
        raise ValueError('expected_compose must be an object or None')
    with store._log_locked():
        rows = [r for r in store.log_read() if r.get('id') == render_id]
        if len(rows) != 1:
            raise ValueError('Expected exactly one existing render')
        row = rows[0]
        current = row.get('compose')
        if current is not None and not isinstance(current, dict):
            raise ValueError('Existing compose is not an object')
        if current != expected_compose:
            target = {**(expected_compose or {}), 'subplotId': scene_id, 'imageSlot': image_slot}
            if current == target:  # an exact retry is harmless and does not rewrite the log
                return row
            raise ValueError('Render composition changed; read it again before associating')
        target = {**(current or {}), 'subplotId': scene_id, 'imageSlot': image_slot}
        if current == target:
            return row
        return store.log_set(render_id, {'compose': target})[0]
