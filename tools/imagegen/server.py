"""Image gen dashboard: a small, project-specific front end for local ComfyUI (Anima-family models).

Run: tools/imagegen/run.sh  ->  http://127.0.0.1:8772/
Code is in git (tools/imagegen). Blocks are local configuration (store.py says where); outputs, the render log and session
state are in island/private/imagegen (git-ignored).
Workflows come from tools/comfy.py anima(); the GPU lock rules are in GUIDE.md and gpu.py."""
import json, mimetypes, os, random, re, signal, sys, threading, time, traceback, urllib.parse, urllib.request, uuid
from datetime import datetime
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
import comfy  # noqa: E402  (tools/comfy.py)
import store, gpu, consist, privacy, huefix, image_actions  # noqa: E402
import gpu_priority  # noqa: E402  (tools/gpu_priority.py)

PORT = int(os.environ.get('IMAGEGEN_PORT', 8772))
# Another port is a test copy: it never takes, ends or frees the GPU (the lock's owner name is the dashboard's, so a
# test copy stopping would end his real session; it did on 2026-10-11).
TEST_COPY = PORT != 8772
WEB = os.path.join(HERE, 'web')
MODELS_DIR = os.path.expanduser('~/ai/ComfyUI/models/diffusion_models')
LORAS_DIR = os.path.expanduser('~/ai/ComfyUI/models/loras')
CONTROL_DIR = os.path.expanduser('~/ai/ComfyUI/models/controlnet')
NOT_ANIMA_LORA = ('wan', 'yue', 'lightx2v')
MASKS = os.path.join(store.ROOT, 'masks')
NOT_ANIMA = ('wan', 'causal', 'pixal3d', 'trellis', 'dasiwa', 'put_')
# The words every picture avoids, whatever the composer or recipe sent. One list (web/always-negative.json), also read by
# the browser composer; ensure_negative adds any that are missing, so every render path gets them (#667).
with open(os.path.join(WEB, 'always-negative.json'), encoding='utf-8') as _f:
    ALWAYS_NEG = json.load(_f)
DASH_LOG = os.path.join(store.ROOT, 'dashboard.log')
CLIENT_ID = uuid.uuid4().hex


def log(msg):
    os.makedirs(store.ROOT, exist_ok=True)
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')} {msg}"
    with open(DASH_LOG, 'a', encoding='utf-8') as f:
        f.write(line + '\n')
    print(line, flush=True)


# A test copy keeps its own session file and never resumes the live one: it would start a GPU session for Jørgen.
session = gpu.Session(os.path.join(store.ROOT, 'session.json' if not TEST_COPY else f'session-test-{PORT}.json'), log, enabled=not TEST_COPY)

# ---------------------------------------------------------------- job queue
JOBS = []          # newest last; kept in memory for progress (the log has the permanent record)
JOBS_LOCK = threading.RLock()
BY_PROMPT = {}     # ComfyUI prompt_id -> job


def pending():
    """(owner, created) of every queued or running job; owner '' for Jørgen's own (gpu.Session's priority and queue)."""
    with JOBS_LOCK:
        return [(j.get('owner') or '', j.get('created')) for j in JOBS if j['status'] in ('queued', 'running')]


session.pending = pending


def on_progress(pid, value, mx):
    j = BY_PROMPT.get(pid)
    if j:
        j['progress'] = value / max(1, mx)


def ensure_negative(neg):
    n = neg.strip().rstrip(',')
    have = {t.strip().lower() for t in n.split(',')}
    for t in ALWAYS_NEG:
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


def start_image(wf, start):
    """img2img: the picture in start['image'] (scaled to the job's size) replaces the empty latent, and the sampler
    keeps start['denoise'] of the way from it (low = small changes). With start['mask'] (white = repaint) it is an
    inpaint: only the masked part is noised, and the rest of the start picture is pasted back over the result."""
    name = comfy.upload(consist.as_png(consist.resolve(start['image'])))
    w, h = wf['6']['inputs']['width'], wf['6']['inputs']['height']
    wf['S1'] = {'class_type': 'LoadImage', 'inputs': {'image': name}}
    wf['S2'] = {'class_type': 'ImageScale', 'inputs': {'image': ['S1', 0], 'upscale_method': 'lanczos', 'width': w, 'height': h, 'crop': 'center'}}
    wf['6'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['S2', 0], 'vae': ['3', 0]}}
    wf['7']['inputs']['denoise'] = start['denoise']
    if start.get('mask'):
        wf['M1'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(consist.as_png(consist.resolve(start['mask'])))}}
        wf['M2'] = {'class_type': 'ImageScale', 'inputs': {'image': ['M1', 0], 'upscale_method': 'bilinear', 'width': w, 'height': h, 'crop': 'center'}}
        wf['M3'] = {'class_type': 'ImageToMask', 'inputs': {'image': ['M2', 0], 'channel': 'red'}}
        wf['M4'] = {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['6', 0], 'mask': ['M3', 0]}}
        wf['7']['inputs']['latent_image'] = ['M4', 0]
        wf['M5'] = {'class_type': 'ImageCompositeMasked', 'inputs': {'destination': ['S2', 0], 'source': ['8', 0], 'x': 0, 'y': 0,
                                                                   'resize_source': False, 'mask': ['M3', 0]}}
        wf['9']['inputs']['images'] = ['M5', 0]
    return wf


def control_image(wf, control):
    """A guide picture through an Anima LLLite control (lineart, depth, scribble, any): its shapes steer the render."""
    wf['CP'] = {'class_type': 'ModelPatchLoader', 'inputs': {'name': control['file']}}
    wf['CI'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(consist.as_png(consist.resolve(control['image'])))}}
    wf['CA'] = {'class_type': 'AnimaLLLiteApply', 'inputs': {'model': wf['7']['inputs']['model'], 'model_patch': ['CP', 0], 'image': ['CI', 0],
                                                            'strength': control['strength'], 'start_percent': 0.0, 'end_percent': control['end']}}
    wf['7']['inputs']['model'] = ['CA', 0]
    return wf


def run_job(j):
    wf = comfy.anima(j['positive'], j['negative'], model=j['model_file'], w=j['w'], h=j['h'], steps=j['steps'], cfg=j['cfg'],
                     sampler=j['sampler'], scheduler=j['scheduler'], seed=j['seed'], loras=[(x['file'], x['weight']) for x in j.get('loras') or []])
    if j.get('start'):
        start_image(wf, j['start'])
    if j.get('control'):
        control_image(wf, j['control'])
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
    if j.get('huefix'):
        # the colour fix last; the unfixed render stays as raw_file
        from PIL import Image
        if not j.get('raw_file'):
            j['raw_file'] = rel[:-4] + '-raw.png'
            Image.open(out).save(os.path.join(store.OUTPUTS, j['raw_file']))
        img, report = huefix.fix(Image.open(out), j['huefix'])
        img.save(out)
        j['huefix_report'] = report
    j['file'] = rel
    j['thumb'] = make_thumb(out, rel)
    j['phase'] = 'done'
    j['elapsed'] = round(time.time() - t0, 1)


def log_entry(j):
    keep = ('id', 'n', 'run_id', 'idx', 'status', 'error', 'file', 'thumb', 'seed', 'model_file', 'w', 'h', 'steps', 'cfg', 'sampler',
            'scheduler', 'positive', 'negative', 'overridden', 'presets', 'rating', 'scene_text', 'characters', 'compose', 'elapsed',
            'ipa', 'repaint', 'raw_file', 'start', 'loras', 'control', 'huefix')
    e = {k: j.get(k) for k in keep}
    e.update({k: j[k] for k in ('owner', 'round') if k in j})  # only an agent's render has them
    e['at'] = j.get('at') or store.now()
    e.update(star=False, fav=False, reject=False, reject_reason='', note='')
    return e


def queue_order():
    """Queued jobs in the order they will run: Jørgen's own first (they have priority on the GPU), then in the order they came."""
    with JOBS_LOCK:
        return sorted((x for x in JOBS if x['status'] == 'queued'), key=lambda x: bool(x.get('owner')))


def next_job():
    queued = queue_order()
    return queued[0] if queued else None


def worker():
    while True:
        try:
            session.sync_priority()
            j = next_job()
            if j is not None and session.s['state'] == 'off' and not TEST_COPY:
                session.start(j.get('owner') or '')  # an agent's job waits its turn in the GPU queue
            if j is None or session.s['state'] != 'on':
                time.sleep(0.5)
                continue
            if not gpu.owner_is_me():  # GUIDE: check the owner before every job, not only at the start
                session.lost()
                continue
            first = session.ahead_of(j['created']) if j.get('owner') else []
            if first:
                # an agent's render is a render-rank job: a job that has waited longer, or ranks higher, goes first
                t = min(first, key=lambda t: gpu_priority.order_key(t, False))
                session.end(f"Let {t.get('owner')} have the GPU: it was waiting before {j['owner']}'s next render.")
                continue
            session.serve(j.get('owner') or '')
            j['status'], j['started'] = 'running', time.time()
            session.touch()
            try:
                run_job(j)
                status = 'done'
            except InterruptedError:
                status = 'cancelled'
            except Exception as e:
                status, j['error'] = 'error', str(e)[:600]
                log(f"job {j['id']} failed: {e}")
            j['progress'] = 1
            try:
                if status in ('done', 'error'):  # numbered before the queue shows it finished, so it lands in its place (#694)
                    j['at'] = datetime.now().astimezone().isoformat(timespec='microseconds')
                    j['n'] = store.log_append(log_entry({**j, 'status': status}))['n']
            finally:
                j['status'] = status
                session.touch()
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


def _picture(rel, private):
    """A picture a job may read: repo-relative, island/private/ ones only in private mode, never Jørgen's own folder."""
    rel = str(rel)
    if rel.startswith('/api/subplots/draft-picture?'):
        return image_actions.draft_picture(rel, private)
    portraits = 'island/private/imagegen/portraits/'
    if rel.startswith(portraits):
        name = rel[len(portraits):]
        if os.path.isfile(os.path.join(store.PORTRAITS, name) + '.json') and image_actions.portrait_visible(name, private):
            consist.resolve(rel)
            return rel
    if rel.startswith('island/private/') and not private:
        raise ValueError('that picture opens in private mode only')
    if consist.resolve(rel).startswith(store.OFF_LIMITS + os.sep):
        raise ValueError('not allowed')
    return rel


def save_mask(data_url, run_id):
    """A mask drawn in the composer (a PNG data URL, white = repaint) saved under masks/; returns its stored path."""
    import base64
    raw = base64.b64decode(str(data_url).split(',', 1)[-1])
    if len(raw) > 20 * 1024 * 1024 or not raw.startswith(b'\x89PNG'):
        raise ValueError('the mask must be a PNG')
    os.makedirs(MASKS, exist_ok=True)
    with open(os.path.join(MASKS, run_id + '.png'), 'wb') as f:
        f.write(raw)
    return f'island/private/imagegen/masks/{run_id}.png'


def _clean_start(x, private, run_id=''):
    """An img2img start: a picture and how far to move from it; with a mask, an inpaint of the masked part."""
    if not x or not x.get('image'):
        return None
    out = dict(image=_picture(x['image'], private), denoise=max(0.05, min(1.0, float(x.get('denoise', 0.35)))), method='img2img')
    mask = x.get('mask')
    if mask:
        out.update(mask=save_mask(mask, run_id) if str(mask).startswith('data:') else _picture(mask, private), method='inpaint')
    return out


def _clean_loras(xs):
    have = set(lora_files())
    out = []
    for x in xs or []:
        if x.get('file') not in have:
            raise ValueError(f"LoRA not found: {x.get('file')}")
        out.append(dict(file=x['file'], weight=max(-2.0, min(2.0, float(x.get('weight', 0.8))))))
    return out[:4]


def _clean_control(x, private):
    if not x or not x.get('image') or not x.get('file'):
        return None
    if x['file'] not in {c['file'] for c in control_files()}:
        raise ValueError(f"control model not found: {x['file']}")
    return dict(image=_picture(x['image'], private), file=x['file'], strength=max(0.0, min(2.0, float(x.get('strength', 0.7)))),
                end=max(0.05, min(1.0, float(x.get('end', 0.8)))))


def made_by(body):
    """The owner and round an agent gave a render (compose.mjs sends both). Jørgen's own UI sends neither: its rows have no owner."""
    owner = str(body.get('owner') or '').strip()[:80]
    return dict(owner=owner, round=str(body.get('round') or '').strip()[:300]) if owner else {}


def new_run(body, private=False):
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
    start = _clean_start(body.get('start'), private, run_id)
    if start and start.get('mask') and isinstance(body.get('compose'), dict) and isinstance(body['compose'].get('start'), dict):
        body['compose']['start'] = dict(body['compose']['start'], mask=start['mask'])  # the record keeps the path, not the drawing
    loras, control, fixes = _clean_loras(body.get('loras')), _clean_control(body.get('control'), private), huefix.clean(body.get('huefix'))
    who = made_by(body)
    jobs = []
    for i, s in enumerate(seeds):
        jobs.append(dict(
            id=f'{run_id}-{i + 1}', run_id=run_id, idx=i + 1, tag=tag, status='queued', progress=0, seed=s,
            positive=body['positive'].strip(), negative=ensure_negative(body['negative']), overridden=bool(body.get('overridden')),
            model_file=model_file, w=int(body['w']), h=int(body['h']), steps=int(body.get('steps', 30)), cfg=float(body.get('cfg', 5)),
            sampler=body.get('sampler', 'euler_ancestral'), scheduler=body.get('scheduler', 'normal'),
            presets=body.get('presets', {}), rating=body.get('rating'), scene_text=body.get('scene_text', ''),
            characters=chars, compose=body.get('compose', {}), created=time.time(),
            ipa=_clean_ipa(body.get('ipa')), repaint=_clean_repaint(body.get('repaint')), start=start,
            loras=loras, control=control, huefix=fixes, **who))
    with JOBS_LOCK:
        JOBS.extend(jobs)
        del JOBS[:-400]
    session.touch()
    log(f'queued {run_id}: {len(jobs)} x {model_file} {tag}')
    return run_id, jobs


def public_job(j):
    out = {k: j.get(k) for k in ('id', 'n', 'run_id', 'idx', 'status', 'progress', 'seed', 'file', 'thumb', 'error', 'w', 'h', 'elapsed',
                                  'positive', 'negative', 'overridden', 'compose', 'model_file', 'steps', 'cfg', 'sampler', 'scheduler', 'star', 'fav', 'reject', 'reject_reason', 'note',
                                  'presets', 'characters', 'rating', 'deleted', 'ipa', 'repaint', 'raw_file', 'phase', 'start', 'loras', 'control', 'huefix',
                                  'owner', 'round')}
    if j.get('created') is not None:
        out['created'] = j['created']
    if j.get('at'):
        out.update(at=j['at'], at_epoch=history_time(j['at']))
    return out


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
        if r.get('status') == 'done' and not r.get('deleted') and (r.get('star') or r.get('fav')) and not agent_row(r) and (private or not is_private_render(r)) and (not character or character in (r.get('characters') or [])):
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
                names.update(x['file'] for x in (r.get('provenance') or {}).get('references', []) if x.get('file'))
        _PRIV.update(stamp=stamp, names=frozenset(names), ids=frozenset(ids))
    return _PRIV['names'], _PRIV['ids']


# ---------------------------------------------------------------- history and tuning
AGENT_FIELDS = ('provenance', 'private', 'imported_at', 'source', 'owner', 'round', 'extras', 'out_path', 'backfilled', 'mode', 'denoise', 'src_image', 'steps', 'cfg', 'sampler', 'scheduler')


def history_time(at):
    """Old log dates use the server's local timezone; offset dates describe an absolute instant."""
    try:
        return datetime.fromisoformat(at).timestamp()
    except (TypeError, ValueError, OverflowError):
        return 0


def agent_row(r):
    """Made by an agent: an agent's own log row (source 'agent') or any row that names its owner (compose.mjs)."""
    return r.get('source') == 'agent' or bool(r.get('owner'))


def history(q, private=False):
    """q['who']: 'mine' (rendered in the dashboard), 'agents' (agent_row) or all (default)."""
    store.number_all()  # pictures logged by an agent process still running the older store code get their #n here
    who = q.get('who', 'all')
    rows = [r for r in store.log_read() if r.get('status') == 'done' and not r.get('deleted') and _exists(r)
            and (private or not is_private_render(r))
            and (who == 'all' or agent_row(r) == (who == 'agents'))]
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
        # The scene editor pages individual pictures. Other dashboard views still group batches.
        runs.setdefault(r['id'] if q.get('pictures') == '1' else r['run_id'], []).append(r)
    out = []
    for rs in runs.values():
        f = rs[0]
        newest = max(rs, key=lambda r: (r.get('n') or 0, history_time(r.get('at'))))
        out.append(dict(run_id=f['run_id'], at=newest['at'], at_epoch=history_time(newest['at']), last_n=newest.get('n') or 0,
                        characters=f.get('characters'), scene_text=f.get('scene_text'), model_file=f.get('model_file'), rating=f.get('rating'),
                        presets=f.get('presets'), positive=f.get('positive'), negative=f.get('negative'), overridden=f.get('overridden'),
                        compose=f.get('compose'), w=f.get('w'), h=f.get('h'),
                        ipa=f.get('ipa'), repaint=f.get('repaint'), start=f.get('start'), loras=f.get('loras'), control=f.get('control'), huefix=f.get('huefix'), **{k: f.get(k) for k in AGENT_FIELDS},
                        renders=[{**{k: r.get(k) for k in ('id', 'n', 'idx', 'file', 'thumb', 'seed', 'star', 'fav', 'reject', 'reject_reason', 'note',
                                                         'positive', 'negative', 'w', 'h', 'model_file', 'at', 'ipa', 'repaint', 'raw_file', 'start', 'loras', 'control', 'huefix', 'compose') + AGENT_FIELDS},
                                  'at_epoch': history_time(r.get('at'))} for r in rs]))
    # Newest first by #n, which the log gives each picture as it finishes, so every owner's renders share one order (#694)
    out.sort(key=lambda x: (x['last_n'], x['at_epoch'], x['run_id']), reverse=True)
    if q.get('before'):  # paging for the History view's infinite scroll: only runs older than the last one shown
        before = history_time(q['before'])
        if q.get('before_n') is not None:
            cursor = (int(q['before_n']), before, q.get('before_run', ''))
            out = [x for x in out if (x['last_n'], x['at_epoch'], x['run_id']) < cursor]
        else:
            out = [x for x in out if x['at_epoch'] < before]
    lim = int(q.get('limit', 60))
    return out[:lim]


def _refs(r):
    p = r.get('presets') or {}
    for key, typ in (('characters', 'character'), ('cameras', 'camera'), ('negatives', 'negative'), ('scenes', 'scene'), ('outfits', 'outfit')):
        for x in p.get(key) or []:
            yield typ, x
    for key, typ in (('man', 'character'), ('style', 'style'), ('framing', 'framing'), ('model', 'model'), ('pose', 'pose'), ('location', 'location'), ('light', 'light')):
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


def lora_files():
    try:
        return sorted(f for f in os.listdir(LORAS_DIR) if f.endswith('.safetensors') and not f.lower().startswith(NOT_ANIMA_LORA))
    except OSError:
        return []


def control_files():
    """The Anima LLLite controls on disk: [{file, kind}] (lineart, depth, scribble, any-test-like, inpainting)."""
    try:
        names = sorted(f for f in os.listdir(CONTROL_DIR) if f.startswith('anima-lllite-') and f.endswith('.safetensors'))
    except OSError:
        return []
    return [dict(file=f, kind=re.sub(r'-(v?\d+)$', '', f[len('anima-lllite-'):-len('.safetensors')])) for f in names]


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
        rel = os.path.normpath(rel)
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
        if p.startswith('/api/subplots/image/'):
            p = p[len('/api/subplots/image'):]
        try:
            if p in ('/', '/index.html'):
                return self._file(WEB, 'index.html', cache=False)
            if p in ('/legacy', '/legacy/'):
                return self._file(WEB, 'legacy.html', cache=False)
            # The standalone page imports the exact modules used by the scene editor.
            for prefix, folder in (('/tools/subplots/web/', os.path.join(HERE, '..', 'subplots', 'web')),
                                   ('/tools/imagegen/web/', WEB), ('/game3d/fonts/', os.path.join(HERE, '..', '..', 'game3d', 'fonts'))):
                if p.startswith(prefix) and os.path.splitext(p)[1] in ('.js', '.css', '.woff2', '.json'):
                    return self._file(folder, p[len(prefix):], cache=False)
            if p == '/favicon.ico':
                return self._send(204, b'', 'image/x-icon')
            if p.startswith('/web/'):
                return self._file(WEB, p[5:], cache=False)
            if p.startswith('/out/'):
                return self._file(store.OUTPUTS, p[5:], check=True)
            if p.startswith('/trashthumb/'):
                return self._file(os.path.join(store.TRASH, 'thumbs'), p[12:], check=True)
            if p.startswith('/priv/portraits/'):
                if not image_actions.portrait_visible(p[16:], self._private()):
                    return self._send(404, {'error': 'not found'})
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
                    pos = {j['id']: i for i, j in enumerate(queue_order(), 1)}  # the library shows waiting renders in run order
                    return self._send(200, [{**public_job(j), **({'queue_pos': pos[j['id']]} if j['id'] in pos else {})}
                                            for j in JOBS[-64:] if j['created'] >= since])
            if p == '/api/presets':
                return self._send(200, store.all_presets(private=self._private()))
            if p.startswith('/api/preset/'):
                _, _, _, typ, pid = p.split('/')
                rec = store.load(typ, pid)
                return self._send(200, rec if rec and (self._private() or not rec['private']) else {})
            if p == '/api/history':
                return self._send(200, history(q, self._private()))
            if p.startswith('/api/render/'):
                try:
                    record, _ = image_actions.selected_image(p[len('/api/render/'):], self._private())
                except ValueError as error:
                    return self._send(404, {'error': str(error)})
                return self._send(200, record)
            if p.startswith('/api/tuning/'):
                _, _, _, typ, pid = p.split('/')
                return self._send(200, tuning(typ, pid, self._private()))
            if p == '/api/mode':
                return self._send(200, {'private': self._private()})
            if p == '/api/loras':
                return self._send(200, lora_files())
            if p == '/api/controls':
                return self._send(200, control_files())
            if p == '/api/models/files':
                return self._send(200, model_files())
            return self._send(404, {'error': 'not found'})
        except Exception as e:
            log('GET error ' + traceback.format_exc())
            return self._send(500, {'error': str(e)})

    def do_POST(self):
        p = urllib.parse.urlparse(self.path).path
        if p.startswith('/api/subplots/image/'):
            p = p[len('/api/subplots/image'):]
        try:
            if p in ('/api/character-from-image', '/api/subplots/create-from-image'):
                host = self.headers.get('Host', '')
                origin = self.headers.get('Origin')
                if (urllib.parse.urlparse('http://' + host).hostname not in ('localhost', '127.0.0.1', '::1')
                        or (origin and origin != 'http://' + host)):
                    return self._send(403, {'error': 'Open Image gen on this computer to create from a picture.'})
                if 'application/json' not in self.headers.get('Content-Type', '') or not 0 < int(self.headers.get('Content-Length', 0)) <= 2 * 1024 * 1024:
                    return self._send(400, {'error': 'Send character or scene details as JSON.'})
            b = self._body()
            if p == '/api/character-from-image':
                return self._send(200, image_actions.create_character(b, self._private()))
            if p == '/api/subplots/create-from-image':
                return self._create_scene(b)
            if TEST_COPY and (p == '/api/session/start' or (p == '/api/generate' and b.get('autostart'))):
                return self._send(409, {'ok': False, 'error': 'a test copy of the dashboard does not use the GPU'})
            if p == '/api/session/start':  # an agent sends its owner; without one it is Jørgen's own start
                return self._send(200, session.start(made_by(b).get('owner', '')))
            if p == '/api/session/end':
                with JOBS_LOCK:
                    if b.get('if_idle') and any(j['status'] in ('queued', 'running') for j in JOBS):
                        # an agent ending its own session must not cancel anyone else's jobs
                        return self._send(200, {'ok': True, 'ended': False, 'reason': 'other jobs are still queued or running'})
                    for j in JOBS:
                        if j['status'] == 'queued':
                            j['status'] = 'cancelled'
                        if j['status'] == 'running':
                            j['cancel'] = True
                threading.Thread(target=session.end, args=('Ended from the dashboard.',), daemon=True).start()
                return self._send(200, {'ok': True})
            if p == '/api/generate':
                if b.get('autostart') and session.s['state'] not in ('on', 'starting'):
                    r = session.start(made_by(b).get('owner', ''))
                    if not r.get('ok'):
                        return self._send(409, r)
                run_id, jobs = new_run(b, self._private())
                return self._send(200, dict(run_id=run_id, jobs=[public_job(j) for j in jobs]))
            if p == '/api/cancel':
                with JOBS_LOCK:
                    only = set(b.get('ids') or [])  # ids given: only those jobs; none: everything, as the dashboard button does
                    for j in JOBS:
                        if only and j['id'] not in only:
                            continue
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

    def _create_scene(self, body):
        """Forward a selected image to the local scene authoring service."""
        url = 'http://127.0.0.1:8771/api/subplots/create-from-image'
        headers = {'Content-Type': 'application/json'}
        if self._private():
            headers['Cookie'] = 'amakawa_mode=private'
        req = urllib.request.Request(url, json.dumps(body).encode(), headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                return self._send(response.status, response.read(), 'application/json')
        except urllib.error.HTTPError as error:
            return self._send(error.code, error.read(), 'application/json')
        except urllib.error.URLError:
            return self._send(503, {'error': 'The scene editor is offline. Start the local project server, then retry.'})


def restart_exit(*_):
    """SIGHUP (run.sh --restart): exit but keep the GPU session; the next server picks it up (gpu.Session._recover)."""
    log('dashboard restarting: keeping the GPU session and ComfyUI')
    os._exit(0)


def shutdown(*_):
    if TEST_COPY:
        os._exit(0)
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
