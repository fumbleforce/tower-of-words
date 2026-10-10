"""Image gen dashboard: a small, project-specific front end for local ComfyUI (Anima-family models).

Run: tools/imagegen/run.sh  ->  http://127.0.0.1:8772/
Code is in git (tools/imagegen). Blocks are local configuration (store.py says where); outputs, the render log and session
state are in island/private/imagegen (git-ignored).
Workflows come from tools/comfy.py anima(); the GPU lock rules are in GUIDE.md and gpu.py."""
import json, mimetypes, os, random, re, signal, sys, threading, time, traceback, urllib.parse, urllib.request, uuid
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
import comfy  # noqa: E402  (tools/comfy.py)
import store, gpu, consist, privacy  # noqa: E402

PORT = int(os.environ.get('IMAGEGEN_PORT', 8772))
WEB = os.path.join(HERE, 'web')
MODELS_DIR = os.path.expanduser('~/ai/ComfyUI/models/diffusion_models')
NOT_ANIMA = ('wan', 'causal', 'pixal3d', 'trellis', 'dasiwa', 'put_')
ALWAYS_NEG = 'child, loli'
DASH_LOG = os.path.join(store.ROOT, 'dashboard.log')
CLIENT_ID = uuid.uuid4().hex


def log(msg):
    os.makedirs(store.ROOT, exist_ok=True)
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')} {msg}"
    with open(DASH_LOG, 'a', encoding='utf-8') as f:
        f.write(line + '\n')
    print(line, flush=True)


session = gpu.Session(os.path.join(store.ROOT, 'session.json'), log)

# ---------------------------------------------------------------- job queue
JOBS = []          # newest last; kept in memory for progress (the log has the permanent record)
JOBS_LOCK = threading.RLock()
BY_PROMPT = {}     # ComfyUI prompt_id -> job


def busy():
    with JOBS_LOCK:
        return any(j['status'] in ('queued', 'running') for j in JOBS)


session.busy = busy


def on_progress(pid, value, mx):
    j = BY_PROMPT.get(pid)
    if j:
        j['progress'] = value / max(1, mx)


def ensure_negative(neg):
    n = neg.strip().rstrip(',')
    have = {t.strip().lower() for t in n.split(',')}
    for t in ALWAYS_NEG.split(', '):
        if t not in have:
            n = (n + ', ' if n else '') + t
    return n


def make_thumb(src, rel):
    try:
        return store.make_thumb(src, rel)
    except Exception as e:
        log(f'thumbnail failed: {e}')
        return None


def _queue_and_fetch(j, wf, out_path, timeout=900):
    """Queue one workflow, wait, and save its first image to out_path (keeps the embedded workflow)."""
    t0 = time.time()
    pid = comfy._post('/prompt', {'prompt': wf, 'client_id': CLIENT_ID})['prompt_id']
    j['prompt_id'] = pid
    j['progress'] = 0
    BY_PROMPT[pid] = j
    while time.time() - t0 < timeout:
        if j.get('cancel'):
            try:
                comfy._post('/interrupt', {})
            except Exception:
                pass
        hist = json.loads(comfy._get(f'/history/{pid}'))
        if pid in hist:
            st = hist[pid].get('status', {})
            if st.get('status_str') == 'error':
                msgs = st.get('messages', [])
                if any(m[0] == 'execution_interrupted' for m in msgs):
                    raise InterruptedError('cancelled')
                raise RuntimeError(json.dumps(msgs)[:600])
            for node in hist[pid]['outputs'].values():
                for img in node.get('images', []):
                    q = urllib.parse.urlencode({'filename': img['filename'], 'subfolder': img['subfolder'], 'type': img['type']})
                    os.makedirs(os.path.dirname(out_path), exist_ok=True)
                    with open(out_path, 'wb') as f:
                        f.write(comfy._get('/view?' + q))
                    return out_path
            raise RuntimeError('no image in the outputs')
        time.sleep(0.7)
    raise TimeoutError('no result after 15 minutes')


def run_job(j):
    wf = comfy.anima(j['positive'], j['negative'], model=j['model_file'], w=j['w'], h=j['h'], steps=j['steps'], cfg=j['cfg'],
                     sampler=j['sampler'], scheduler=j['scheduler'], seed=j['seed'])
    wf['9']['inputs']['filename_prefix'] = 'imagegen/' + j['run_id']
    ipa = j.get('ipa')
    if ipa:
        consist.ipa(wf, consist.resolve(ipa['ref']), ipa['strength'], ipa.get('cutout'))
    t0 = time.time()
    day = time.strftime('%Y-%m-%d')
    rel = f"{day}/{j['id']}-{j['tag']}-s{j['seed']}.png"
    out = os.path.join(store.OUTPUTS, rel)
    j['phase'] = 'render'
    _queue_and_fetch(j, wf, out)
    rp = j.get('repaint')
    if rp:
        # second pass: repaint her head beside the portrait; the unrepainted render is kept as raw_file
        if not gpu.owner_is_me():
            raise RuntimeError('GPU lock lost before the repaint pass')
        raw_rel = rel[:-4] + '-raw.png'
        os.replace(out, os.path.join(store.OUTPUTS, raw_rel))
        j['raw_file'] = raw_rel
        j['phase'] = 'repaint'
        t1 = time.time()
        try:
            prep = consist.repaint_prepare(os.path.join(store.OUTPUTS, raw_rel), consist.resolve(rp['ref']), j['id'])
            rwf = consist.repaint_workflow(prep, rp['prompt'], j['negative'], j['model_file'], j['seed'], rp['denoise'],
                                           steps=j['steps'], cfg=j['cfg'], sampler=j['sampler'], scheduler=j['scheduler'])
            rwf['9']['inputs']['filename_prefix'] = 'imagegen/' + j['run_id'] + '-repaint'
            work = os.path.join(consist.CACHE, f"work-{j['id']}.png")
            _queue_and_fetch(j, rwf, work)
            consist.repaint_paste(os.path.join(store.OUTPUTS, raw_rel), work, prep['box'], out)
            j['repaint'] = dict(rp, box=prep['box'], secs=round(time.time() - t1, 1))
        except InterruptedError:
            raise
        except Exception as e:
            # keep the plain render as the result and say why the repaint didn't happen
            os.replace(os.path.join(store.OUTPUTS, raw_rel), out)
            j['raw_file'] = None
            j['repaint'] = dict(rp, skipped=str(e)[:200])
            log(f"repaint skipped for {j['id']}: {e}")
    j['file'] = rel
    j['thumb'] = make_thumb(out, rel)
    j['phase'] = 'done'
    j['elapsed'] = round(time.time() - t0, 1)


def log_entry(j):
    keep = ('id', 'n', 'run_id', 'idx', 'status', 'error', 'file', 'thumb', 'seed', 'model_file', 'w', 'h', 'steps', 'cfg', 'sampler',
            'scheduler', 'positive', 'negative', 'overridden', 'presets', 'rating', 'scene_text', 'characters', 'compose', 'elapsed',
            'ipa', 'repaint', 'raw_file')
    e = {k: j.get(k) for k in keep}
    e['at'] = store.now()
    e.update(star=False, fav=False, reject=False, reject_reason='', note='')
    return e


def worker():
    while True:
        try:
            with JOBS_LOCK:
                j = next((x for x in JOBS if x['status'] == 'queued'), None)
            if j is None or session.s['state'] != 'on':
                time.sleep(0.5)
                continue
            if not gpu.owner_is_me():  # GUIDE: check the owner before every job, not only at the start
                session.lost()
                continue
            j['status'], j['started'] = 'running', time.time()
            session.touch()
            try:
                run_job(j)
                j['status'] = 'done'
            except InterruptedError:
                j['status'] = 'cancelled'
            except Exception as e:
                j['status'], j['error'] = 'error', str(e)[:600]
                log(f"job {j['id']} failed: {e}")
            j['progress'] = 1
            session.touch()
            if j['status'] in ('done', 'error'):
                store.log_append(log_entry(j))
        except Exception:
            log('worker error: ' + traceback.format_exc())
            time.sleep(2)


def _clean_ipa(x):
    if not x or not x.get('ref'):
        return None
    consist.resolve(x['ref'])  # fail early if the reference is missing
    return dict(ref=x['ref'], strength=max(0.0, min(2.0, float(x.get('strength', 0.6)))), cutout=bool(x.get('cutout')), method='anima-ipa')


def _clean_repaint(x):
    if not x or not x.get('ref') or not x.get('prompt'):
        return None
    consist.resolve(x['ref'])
    return dict(ref=x['ref'], denoise=max(0.1, min(1.0, float(x.get('denoise', 0.65)))), prompt=x['prompt'], method='lllite-head-repaint')


def new_run(body):
    run_id = 'r' + time.strftime('%y%m%d-%H%M%S') + '-' + uuid.uuid4().hex[:3]
    count = max(1, min(8, int(body.get('count', 1))))
    if body.get('seeds'):
        seeds = [int(s) for s in body['seeds']][:8]
    elif body.get('seed_mode') == 'fixed':
        base = int(body.get('seed', 0))
        seeds = [base + i for i in range(count)]
    else:
        seeds = [random.randint(1, 2**31 - 1) for _ in range(count)]
    model_file = body['model_file']
    if not os.path.exists(os.path.join(MODELS_DIR, model_file)):
        raise ValueError(f'model file not found: {model_file}')
    chars = body.get('characters') or []
    tag = '-'.join(c for c in chars)[:40] or 'scene'
    jobs = []
    for i, s in enumerate(seeds):
        jobs.append(dict(
            id=f'{run_id}-{i + 1}', run_id=run_id, idx=i + 1, tag=tag, status='queued', progress=0, seed=s,
            positive=body['positive'].strip(), negative=ensure_negative(body['negative']), overridden=bool(body.get('overridden')),
            model_file=model_file, w=int(body['w']), h=int(body['h']), steps=int(body.get('steps', 30)), cfg=float(body.get('cfg', 5)),
            sampler=body.get('sampler', 'euler_ancestral'), scheduler=body.get('scheduler', 'normal'),
            presets=body.get('presets', {}), rating=body.get('rating'), scene_text=body.get('scene_text', ''),
            characters=chars, compose=body.get('compose', {}), created=time.time(),
            ipa=_clean_ipa(body.get('ipa')), repaint=_clean_repaint(body.get('repaint'))))
    with JOBS_LOCK:
        JOBS.extend(jobs)
        del JOBS[:-400]
    session.touch()
    log(f'queued {run_id}: {len(jobs)} x {model_file} {tag}')
    return run_id, jobs


def public_job(j):
    return {k: j.get(k) for k in ('id', 'n', 'run_id', 'idx', 'status', 'progress', 'seed', 'file', 'thumb', 'error', 'w', 'h', 'elapsed',
                                  'positive', 'negative', 'overridden', 'compose', 'model_file', 'star', 'fav', 'reject', 'reject_reason', 'note',
                                  'presets', 'characters', 'rating', 'deleted', 'ipa', 'repaint', 'raw_file', 'phase')}


# ---------------------------------------------------------------- delete, trash, portraits
def _move(src_base, dst_base, rel):
    if not rel:
        return
    src, dst = os.path.join(src_base, rel), os.path.join(dst_base, rel)
    if os.path.exists(src):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        os.replace(src, dst)


def _mark_job(rid, **kw):
    with JOBS_LOCK:
        for j in JOBS:
            if j['id'] == rid:
                j.update(kw)


def delete_renders(pred):
    """Move the images to trash/ and mark the log lines deleted (the lines stay, so tuning stays honest)."""
    rows = [r for r in store.log_read() if pred(r) and not r.get('deleted')]
    for r in rows:
        _move(store.OUTPUTS, os.path.join(store.TRASH, 'outputs'), r.get('file'))
        _move(store.OUTPUTS, os.path.join(store.TRASH, 'outputs'), r.get('raw_file'))
        _move(store.THUMBS, os.path.join(store.TRASH, 'thumbs'), r.get('thumb'))
        _mark_job(r['id'], deleted=True)
    ids = {r['id'] for r in rows}
    store.log_set(lambda r: r.get('id') in ids, {'deleted': True, 'deleted_at': store.now()})
    if ids:
        log(f'deleted {len(ids)} render(s): {sorted(ids)[:5]}')
    return sorted(ids)


def restore_render(rid):
    rows = [r for r in store.log_read() if r.get('id') == rid and r.get('deleted') and not r.get('purged')]
    for r in rows:
        _move(os.path.join(store.TRASH, 'outputs'), store.OUTPUTS, r.get('file'))
        _move(os.path.join(store.TRASH, 'outputs'), store.OUTPUTS, r.get('raw_file'))
        _move(os.path.join(store.TRASH, 'thumbs'), store.THUMBS, r.get('thumb'))
        _mark_job(rid, deleted=False)
    store.log_set(rid, {'deleted': False, 'deleted_at': ''}) if rows else None
    return bool(rows)


def trash_list(private=False):
    rows = [r for r in store.log_read() if r.get('deleted') and not r.get('purged') and (private or not is_private_render(r))]
    rows.sort(key=lambda r: r.get('deleted_at', ''), reverse=True)
    return [{k: r.get(k) for k in ('id', 'n', 'run_id', 'thumb', 'file', 'raw_file', 'seed', 'characters', 'at', 'deleted_at', 'w', 'h')} for r in rows]


def empty_trash():
    rows = trash_list()
    for r in rows:
        for sub, rel in (('outputs', r.get('file')), ('outputs', r.get('raw_file')), ('thumbs', r.get('thumb'))):
            if rel:
                try:
                    os.remove(os.path.join(store.TRASH, sub, rel))
                except OSError:
                    pass
    ids = {r['id'] for r in rows}
    store.log_set(lambda r: r.get('id') in ids, {'purged': True})
    log(f'emptied trash: {len(ids)} image(s)')
    return len(ids)


PORTRAIT_DIRS = ('legacy/proto2/cast-fixed', 'legacy/proto2/decide2', 'art/production/LFL', 'art/island/export/sprites')


def portrait_choices(character='', private=False):
    out = []
    approved = os.path.join(store.REPO, 'art', 'approved')  # one folder per bible id
    subs = sorted(f'art/approved/{d}' for d in os.listdir(approved) if os.path.isdir(os.path.join(approved, d))) if os.path.isdir(approved) else []
    for d in subs + list(PORTRAIT_DIRS):
        full = os.path.join(store.REPO, d)
        if os.path.isdir(full):
            for f in sorted(os.listdir(full)):
                if f.lower().endswith(('.webp', '.png', '.jpg', '.jpeg')) and not f.startswith(('mask-',)) and '-raw' not in f and '-cmp' not in f:
                    out.append(dict(path=f'{d}/{f}', group=d))
    if os.path.isdir(store.PORTRAITS):
        for f in sorted(os.listdir(store.PORTRAITS)):
            out.insert(0, dict(path=f'island/private/imagegen/portraits/{f}', group='Uploaded'))
    # his starred renders of this character can be portraits too
    for r in store.log_read():
        if r.get('status') == 'done' and not r.get('deleted') and (r.get('star') or r.get('fav')) and r.get('source') != 'agent' and (private or not is_private_render(r)) and (not character or character in (r.get('characters') or [])):
            out.insert(0, dict(path=f"island/private/imagegen/outputs/{r['file']}", group='Your starred renders', thumb=r.get('thumb')))
    if character:
        out.sort(key=lambda x: (x['group'] not in ('Uploaded', 'Your starred renders'), character not in x['path'].lower()))
    return out


def save_upload(name, data_b64):
    import base64, re as _re
    raw = base64.b64decode(data_b64.split(',', 1)[-1])
    if len(raw) > 20 * 1024 * 1024:
        raise ValueError('image too large')
    ext = os.path.splitext(name)[1].lower()
    if ext not in ('.png', '.webp', '.jpg', '.jpeg'):
        raise ValueError('use a PNG, WebP or JPEG')
    base = _re.sub(r'[^a-z0-9-]+', '-', os.path.splitext(name)[0].lower()).strip('-')[:40] or 'portrait'
    os.makedirs(store.PORTRAITS, exist_ok=True)
    fn = f"{time.strftime('%y%m%d-%H%M%S')}-{base}{ext}"
    with open(os.path.join(store.PORTRAITS, fn), 'wb') as f:
        f.write(raw)
    return f'island/private/imagegen/portraits/{fn}'


# ---------------------------------------------------------------- private mode
# Private renders and private blocks show only in private mode: the cookie that /private sets on
# tools/review_server.py (8771); cookies ignore the port, so this server sees it too. What counts as private is in
# privacy.py (its terms come from the private file, never from this code).
PRIVATE_NAV = os.path.join(store.REPO, 'island', 'private', 'bible', 'nav.js')
is_private_render = privacy.is_private_render


_PRIV = {'stamp': None, 'names': frozenset(), 'ids': frozenset()}


def private_files():
    """(file names, render ids) of the private renders, cached until the log changes; used to refuse their files."""
    try:
        stamp = os.stat(store.LOG).st_mtime_ns
    except OSError:
        return frozenset(), frozenset()
    if _PRIV['stamp'] != stamp:
        names, ids = set(), set()
        for r in store.log_read():
            if is_private_render(r):
                ids.add(r.get('id'))
                names.update(x for x in (r.get('file'), r.get('raw_file'), r.get('thumb')) if x)
                names.update(os.path.splitext(x)[0] + '.webp' for x in (r.get('file'),) if x)
        _PRIV.update(stamp=stamp, names=frozenset(names), ids=frozenset(ids))
    return _PRIV['names'], _PRIV['ids']


# ---------------------------------------------------------------- history and tuning
AGENT_FIELDS = ('source', 'owner', 'round', 'extras', 'out_path', 'backfilled', 'mode', 'denoise', 'src_image', 'steps', 'cfg', 'sampler', 'scheduler')


def history(q, private=False):
    """q['who']: 'mine' (rendered in the dashboard), 'agents' (logged by tools/comfy.py, agentlog.py) or all (default)."""
    store.number_all()  # pictures logged by an agent process still running the older store code get their #n here
    who = q.get('who', 'all')
    rows = [r for r in store.log_read() if r.get('status') == 'done' and not r.get('deleted') and _exists(r)
            and (private or not is_private_render(r))
            and (who == 'all' or (r.get('source') == 'agent') == (who == 'agents'))]
    ch = q.get('character')
    pre = q.get('preset')  # "type:id"
    starred = q.get('star') == '1'
    runs = {}
    for r in rows:
        if ch and ch not in (r.get('characters') or []):
            continue
        if pre and not uses_preset(r, *pre.split(':', 1)):
            continue
        if starred and not (r.get('star') or r.get('fav')):
            continue
        runs.setdefault(r['run_id'], []).append(r)
    out = []
    for rid, rs in runs.items():
        f = rs[0]
        out.append(dict(run_id=rid, at=f['at'], characters=f.get('characters'), scene_text=f.get('scene_text'), model_file=f.get('model_file'), rating=f.get('rating'),
                        presets=f.get('presets'), positive=f.get('positive'), negative=f.get('negative'), overridden=f.get('overridden'),
                        compose=f.get('compose'), w=f.get('w'), h=f.get('h'),
                        ipa=f.get('ipa'), repaint=f.get('repaint'), **{k: f.get(k) for k in AGENT_FIELDS},
                        renders=[{k: r.get(k) for k in ('id', 'n', 'file', 'thumb', 'seed', 'star', 'fav', 'reject', 'reject_reason', 'note',
                                                         'positive', 'negative', 'w', 'h', 'model_file', 'at', 'ipa', 'repaint', 'raw_file') + AGENT_FIELDS} for r in rs]))
    out.sort(key=lambda x: x['at'], reverse=True)
    if q.get('before'):  # paging for the History view's infinite scroll: only runs older than the last one shown
        out = [x for x in out if x['at'] < q['before']]
    lim = int(q.get('limit', 60))
    return out[:lim]


def _refs(r):
    p = r.get('presets') or {}
    for key, typ in (('characters', 'character'), ('cameras', 'camera'), ('negatives', 'negative'), ('scenes', 'scene')):
        for x in p.get(key) or []:
            yield typ, x
    for key, typ in (('man', 'character'), ('style', 'style'), ('framing', 'framing'), ('model', 'model')):
        if p.get(key):
            yield typ, p[key]


def uses_preset(r, typ, pid):
    return any(t == typ and x.get('id') == pid for t, x in _refs(r))


def _exists(r):
    """False when the PNG was removed by hand outside the dashboard. A backfilled agent render has no copy, only a thumbnail."""
    if r.get('source') == 'agent' and not r.get('file'):
        return bool(r.get('thumb')) and os.path.exists(os.path.join(store.THUMBS, r['thumb']))
    return bool(r.get('file')) and os.path.exists(os.path.join(store.OUTPUTS, r['file']))


def agent_original(rid):
    """The path of an agent render's original picture (a round folder), for the full-size view. Jørgen's own folder is off limits."""
    for r in store.log_read():
        if r.get('id') == rid and r.get('source') == 'agent' and r.get('out_path'):
            p = os.path.realpath(os.path.join(store.REPO, r['out_path']))
            ok = os.path.splitext(p)[1].lower() in ('.webp', '.png', '.jpg', '.jpeg') and os.path.isfile(p)
            return p if ok and not p.startswith(store.OFF_LIMITS + os.sep) else None
    return None


def tuning(typ, pid, private=False):
    rows = [r for r in store.log_read() if r.get('status') == 'done' and (r.get('deleted') or _exists(r)) and (private or not is_private_render(r))]
    by_v = {}
    for r in rows:
        for t, x in _refs(r):
            if t == typ and x.get('id') == pid:
                g = by_v.setdefault(x.get('v'), dict(v=x.get('v'), renders=0, stars=0, favs=0, rejects=0, edited=0, deleted=0, items=[]))
                if r.get('deleted'):
                    g['deleted'] += 1
                    break
                g['renders'] += 1
                g['stars'] += bool(r.get('star') or r.get('fav'))
                g['favs'] += bool(r.get('fav'))
                g['rejects'] += bool(r.get('reject'))
                g['edited'] += bool(r.get('overridden'))
                g['items'].append({k: r.get(k) for k in ('id', 'n', 'thumb', 'file', 'seed', 'star', 'fav', 'reject', 'reject_reason', 'note', 'at',
                                                         'positive', 'negative', 'w', 'h', 'model_file')})
                break
    out = sorted(by_v.values(), key=lambda g: g['v'] or 0, reverse=True)
    for g in out:
        g['items'] = sorted(g['items'], key=lambda i: i['at'], reverse=True)[:24]
    return out


def model_files():
    try:
        return sorted(f for f in os.listdir(MODELS_DIR) if f.endswith('.safetensors') and not f.lower().startswith(NOT_ANIMA))
    except OSError:
        return []


# ---------------------------------------------------------------- HTTP
class H(BaseHTTPRequestHandler):
    server_version = 'imagegen/1'

    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype='application/json; charset=utf-8', cache=False):
        if not isinstance(body, (bytes, bytearray)):
            body = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'max-age=86400' if cache else 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def _private(self):
        """Private mode: a local request with the amakawa_mode=private cookie and the private files present."""
        return (re.search(r'(?:^|;\s*)amakawa_mode=private(?:;|$)', self.headers.get('Cookie', '')) is not None
                and os.path.isfile(PRIVATE_NAV) and os.environ.get('SUBPLOTS_PUBLIC_ONLY') != '1')

    def _file(self, base, rel, cache=True, check=False):
        if check and not self._private() and rel in private_files()[0]:
            return self._send(404, {'error': 'not found'})
        path = os.path.realpath(os.path.join(base, rel))
        if not path.startswith(os.path.realpath(base) + os.sep) or not os.path.isfile(path):
            return self._send(404, {'error': 'not found'})
        ctype = mimetypes.guess_type(path)[0] or 'application/octet-stream'
        with open(path, 'rb') as f:
            self._send(200, f.read(), ctype, cache)

    def _body(self):
        n = int(self.headers.get('Content-Length') or 0)
        return json.loads(self.rfile.read(n) or b'{}')

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        p, q = urllib.parse.unquote(u.path), dict(urllib.parse.parse_qsl(u.query))
        try:
            if p in ('/', '/index.html'):
                return self._file(WEB, 'index.html', cache=False)
            if p == '/favicon.ico':
                return self._send(204, b'', 'image/x-icon')
            if p.startswith('/web/'):
                return self._file(WEB, p[5:], cache=False)
            if p.startswith('/out/'):
                return self._file(store.OUTPUTS, p[5:], check=True)
            if p.startswith('/trashthumb/'):
                return self._file(os.path.join(store.TRASH, 'thumbs'), p[12:], check=True)
            if p.startswith('/priv/portraits/'):
                return self._file(store.PORTRAITS, p[16:])
            if p.startswith('/agentsrc/'):
                path = None if p[10:] in private_files()[1] and not self._private() else agent_original(p[10:])
                return self._file(os.path.dirname(path), os.path.basename(path)) if path else self._send(404, {'error': 'not found'})
            if p == '/api/trash':
                return self._send(200, trash_list(self._private()))
            if p == '/api/portraits':
                return self._send(200, portrait_choices(q.get('character', ''), self._private()))
            if p.startswith('/thumb/'):
                return self._file(store.THUMBS, p[7:], check=True)
            if p.startswith('/repo/'):
                rel = p[6:]
                if rel.startswith('island/private') or os.path.splitext(rel)[1].lower() not in ('.webp', '.png', '.jpg', '.jpeg'):
                    return self._send(403, {'error': 'not allowed'})
                return self._file(store.REPO, store.repo_rel(rel))
            if p == '/api/state':
                with JOBS_LOCK:
                    q_n = sum(j['status'] == 'queued' for j in JOBS)
                    r_n = sum(j['status'] == 'running' for j in JOBS)
                return self._send(200, dict(session=session.status(), queued=q_n, running=r_n))
            if p == '/api/jobs':
                since = float(q.get('since', 0))
                with JOBS_LOCK:
                    return self._send(200, [public_job(j) for j in JOBS[-64:] if j['created'] >= since])
            if p == '/api/presets':
                return self._send(200, store.all_presets(private=self._private()))
            if p.startswith('/api/preset/'):
                _, _, _, typ, pid = p.split('/')
                rec = store.load(typ, pid)
                return self._send(200, rec if rec and (self._private() or not rec['private']) else {})
            if p == '/api/history':
                return self._send(200, history(q, self._private()))
            if p.startswith('/api/tuning/'):
                _, _, _, typ, pid = p.split('/')
                return self._send(200, tuning(typ, pid, self._private()))
            if p == '/api/models/files':
                return self._send(200, model_files())
            return self._send(404, {'error': 'not found'})
        except Exception as e:
            log('GET error ' + traceback.format_exc())
            return self._send(500, {'error': str(e)})

    def do_POST(self):
        p = urllib.parse.urlparse(self.path).path
        try:
            b = self._body()
            if p == '/api/session/start':
                return self._send(200, session.start())
            if p == '/api/session/end':
                with JOBS_LOCK:
                    for j in JOBS:
                        if j['status'] == 'queued':
                            j['status'] = 'cancelled'
                        if j['status'] == 'running':
                            j['cancel'] = True
                threading.Thread(target=session.end, args=('Ended from the dashboard.',), daemon=True).start()
                return self._send(200, {'ok': True})
            if p == '/api/generate':
                if b.get('autostart') and session.s['state'] not in ('on', 'starting'):
                    r = session.start()
                    if not r.get('ok'):
                        return self._send(409, r)
                run_id, jobs = new_run(b)
                return self._send(200, dict(run_id=run_id, jobs=[public_job(j) for j in jobs]))
            if p == '/api/cancel':
                with JOBS_LOCK:
                    for j in JOBS:
                        if j['status'] == 'queued':
                            j['status'] = 'cancelled'
                        elif j['status'] == 'running':
                            j['cancel'] = True
                return self._send(200, {'ok': True})
            if p.startswith('/api/render/') and p.endswith('/delete'):
                return self._send(200, {'deleted': delete_renders(lambda r, rid=p.split('/')[3]: r.get('id') == rid)})
            if p.startswith('/api/render/') and p.endswith('/restore'):
                return self._send(200, {'ok': restore_render(p.split('/')[3])})
            if p.startswith('/api/run/') and p.endswith('/delete'):
                return self._send(200, {'deleted': delete_renders(lambda r, rn=p.split('/')[3]: r.get('run_id') == rn)})
            if p == '/api/trash/empty':
                return self._send(200, {'purged': empty_trash()})
            if p == '/api/portraits/upload':
                return self._send(200, {'path': save_upload(b.get('name', 'portrait.png'), b['data'])})
            if p.startswith('/api/render/'):
                rid = p.split('/')[3]
                r = store.log_update(rid, b)
                with JOBS_LOCK:
                    for j in JOBS:
                        if j['id'] == rid:
                            j.update({k: b[k] for k in store.RATE_FIELDS if k in b})
                return self._send(200 if r else 404, r or {'error': 'not found'})
            if p.startswith('/api/preset/'):
                parts = p.split('/')  # /api/preset/<type>/<id>[/action]
                typ, pid = parts[3], parts[4]
                action = parts[5] if len(parts) > 5 else 'save'
                rec = store.load(typ, pid) if action != 'create' else None
                if not self._private() and ((rec and rec['private']) or b.get('private') or action == 'private'):
                    return self._send(403, {'error': 'private blocks are only changed in private mode'})
                if action == 'private':
                    return self._send(200, store.set_private(typ, pid, b.get('private', True)))
                if action == 'save':
                    return self._send(200, store.save_version(typ, pid, b['data'], b.get('message', '')))
                if action == 'create':
                    base = store.slug(b.get('name') or pid)
                    new_id, k = base, 2
                    while store.load(typ, new_id):
                        new_id, k = f'{base}-{k}', k + 1
                    return self._send(200, store.create(typ, new_id, b['data'], b.get('message', 'created'), private=bool(b.get('private'))))
                if action == 'restore':
                    return self._send(200, store.restore(typ, pid, int(b['v'])))
                if action == 'note':
                    return self._send(200, store.set_note(typ, pid, b.get('text', '')))
                if action == 'archive':
                    return self._send(200, store.set_archived(typ, pid, b.get('archived', True)))
            return self._send(404, {'error': 'not found'})
        except Exception as e:
            log('POST error ' + traceback.format_exc())
            return self._send(400, {'error': str(e)})


def restart_exit(*_):
    """SIGHUP (run.sh --restart): exit but keep the GPU session; the next server picks it up (gpu.Session._recover)."""
    log('dashboard restarting: keeping the GPU session and ComfyUI')
    os._exit(0)


def shutdown(*_):
    if session.s['state'] in ('on', 'starting', 'lost', 'error') or gpu.owner_is_me():
        log('dashboard stopping: ending the GPU session')
        session.end('The dashboard was stopped.')
    os._exit(0)


def main():
    os.makedirs(store.ROOT, exist_ok=True)
    made = store.seed_if_empty()
    if made:
        log(f'seeded {made} presets')
    try:  # cast looks changed in art/cast-looks.json reach the presets as new versions (tools/cast_looks.py)
        sys.path.insert(0, os.path.dirname(HERE))
        import cast_looks
        synced = [cid for cid, what in cast_looks.sync_dashboard() if what != 'same']
        if synced:
            log('cast looks: new preset versions for ' + ', '.join(synced))
    except Exception as e:
        log(f'cast looks: not synced ({type(e).__name__}: {e})')
    gpu.Progress(CLIENT_ID, on_progress).start()
    threading.Thread(target=worker, daemon=True).start()
    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGHUP, restart_exit)
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), H)
    srv.daemon_threads = True
    log(f'Image gen dashboard: http://127.0.0.1:{PORT}/')
    srv.serve_forever()


if __name__ == '__main__':
    main()
