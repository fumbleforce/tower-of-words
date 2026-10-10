"""Local editing API. Source adapters own formats; this module owns revisions and HTTP."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import posixpath
import re
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = Path(__file__).resolve().parent
ROOT = Path(os.environ.get('SUBPLOTS_ROOT', HERE.parent.parent)).resolve()
LOCK = threading.RLock()
MAX_BODY = 2 * 1024 * 1024
AUTHORING_CACHE = {}

def state_dir():
    override = os.environ.get('SUBPLOTS_STATE')
    if override:
        return Path(override)
    git = subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse', '--absolute-git-dir'], text=True).strip()
    return Path(git) / 'subplot-editor'

def atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix='.subplot-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        if path.exists():
            os.chmod(tmp, path.stat().st_mode & 0o777)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)

def source(body):
    r = subprocess.run(['node', str(HERE / 'source.mjs')], input=json.dumps(body), text=True,
                       capture_output=True, timeout=25, cwd=ROOT, env={**os.environ, 'SUBPLOTS_ROOT': str(ROOT)})
    try:
        data = json.loads(r.stdout)
    except ValueError:
        raise ValueError('The story reader failed. Check that Node and project dependencies are installed.') from None
    if r.returncode or data.get('error'):
        raise ValueError(data.get('error', 'The story reader failed'))
    return data

def slot(scene_id):
    return state_dir() / hashlib.sha256(scene_id.encode()).hexdigest()

def read_json(path, default):
    return json.loads(path.read_text()) if path.exists() else default

def local_provider(body):
    # Explicit local integration only. No directory discovery and no user-owned data access.
    command = os.environ.get('SUBPLOTS_PROVIDER')
    default_config = ROOT / 'island/private/rewards/tools/subplot-editor.json'
    if not command and default_config.is_file():
        command = json.dumps(['python3', str(HERE / 'local.py'), str(default_config)])
    if not command or os.environ.get('SUBPLOTS_PUBLIC_ONLY') == '1':
        raise ValueError('The local scene adapter is not configured. Public stories are available.')
    cmd = json.loads(command)
    if not isinstance(cmd, list) or not cmd or not all(isinstance(x, str) for x in cmd):
        raise ValueError('SUBPLOTS_PROVIDER must be a JSON command array')
    result = subprocess.run(cmd, input=json.dumps(body), capture_output=True, text=True, cwd=ROOT, timeout=300)
    data = json.loads(result.stdout)
    if result.returncode or data.get('error'):
        raise ValueError(data.get('error', 'Local scene adapter failed'))
    return data

def authoring_catalog():
    """Cache the static bible catalog until a public source or image changes."""
    files = [ROOT / p for p in (
        'docs/game/cast.md', 'docs/game/places.md', 'game3d/js/ui/portrait-data.js',
        'game3d/js/places/definitions.js', 'game3d/js/sim.js', 'game3d/js/lang.js', 'game3d/js/narrative/speakers.js',
        'game3d/js/tickets/words.js', 'game3d/data/mc/eric.json')]
    files += list((ROOT / 'game3d/story').rglob('*.js'))
    files += list((ROOT / 'bible/shots/places').glob('*.webp'))
    signature = tuple((str(p), p.stat().st_mtime_ns, p.stat().st_size)
                      for p in sorted(set(files)) if p.is_file())
    with LOCK:
        cached = AUTHORING_CACHE.get(str(ROOT))
        if cached and cached[0] == signature:
            return cached[1]
        result = subprocess.run(['node', str(HERE / 'authoring.mjs')], text=True,
                                capture_output=True, timeout=25, cwd=ROOT,
                                env={**os.environ, 'SUBPLOTS_ROOT': str(ROOT)})
        if result.returncode:
            raise ValueError('The authoring catalog could not read its public sources.')
        data = json.loads(result.stdout)
        AUTHORING_CACHE[str(ROOT)] = (signature, data)
        return data

def label(scene):
    """Say what goes where (Jørgen, 2026-10-10: "just labelling on what goes where"): the public game or the
    private, adult side, and the file the scene lives in."""
    public = scene.get('id', '').startswith('public:')
    scene['audience'] = 'public' if public else 'private'
    if public and not scene.get('where'):
        scene['where'] = scene.get('file') or scene['id'][7:].split('#')[0]
    return scene

def catalog_all():
    """Public and local scenes in one list, each labelled. A missing local adapter only drops the local half."""
    result = source({'action': 'catalog'})
    try:
        local = local_provider({'action': 'catalog'})
        result['scenes'] += local.get('scenes', [])
        result['errors'] += local.get('errors', [])
        result['local'] = True
    except (ValueError, OSError, subprocess.SubprocessError):
        result['local'] = False
    result['scenes'] = [label(s) for s in result['scenes']]
    return result

def picture_key(name):
    """A name reduced to what a scene and its rounds share: 'd1-copier-s02c.webp' and 'day1/copier-2' both give
    'copier', 'peeks/mio-bench-3' gives 'mio-bench'."""
    key = posixpath.basename(str(name or '')).lower().replace('_', '-')
    key = re.sub(r'\.(webp|png|jpe?g)$', '', key)
    key = re.sub(r'^d\d+-', '', key)
    for pattern in (r'-sk$', r'-s\d+[a-z]?$', r'-\d+$'):
        key = re.sub(pattern, '', key)
    return key if len(key) >= 4 else ''

def scene_runs(scene_id, runs, found):
    """The image generator's runs that belong to a scene, derived from what exists (no records are changed): made
    from the editor's composer for it, picked for it, from a round folder one of its live pictures came from, or from
    a round named after the scene or its pictures (copier-2 for d1-copier; mio-bench-1..3 for mio-bench-3)."""
    rounds = set(found.get('rounds') or [])
    keys = {picture_key(found.get('scene'))} | {picture_key(f) for f in found.get('files') or []} | {picture_key(r) for r in rounds}
    keys.discard('')
    picked = {v.get('id') for v in ((found.get('metadata') or {}).get('images') or {}).values() if isinstance(v, dict)}
    out = []
    for run in runs:
        renders = run.get('renders') or []
        mine = (run.get('compose') or {}).get('subplotId') == scene_id or any((r.get('compose') or {}).get('subplotId') == scene_id for r in renders)
        mine = mine or any(r.get('id') in picked for r in renders)
        mine = mine or (run.get('round') in rounds) or (run.get('round') and picture_key(run['round']) in keys)
        if mine:
            out.append(run)
    return out

HISTORY_CACHE = {}
def image_history():
    """Every run the image generator knows, cached for half a minute (a scene's library filters it)."""
    with LOCK:
        at, rows = HISTORY_CACHE.get('all', (0, None))
        if rows is not None and time.time() - at < 30:
            return rows
    try:
        with urllib.request.urlopen('http://127.0.0.1:8772/api/history?limit=1000000&who=all', timeout=30) as r:
            rows = json.loads(r.read(200 * 1024 * 1024))
    except (urllib.error.URLError, OSError):
        raise ValueError('Image generation is offline. Start tools/imagegen/run.sh, then retry.') from None
    with LOCK:
        HISTORY_CACHE['all'] = (time.time(), rows)
    return rows

def comments(body):
    """Comments on beats, kept by comments.mjs (its header says where). Private scenes' stay in island/private/."""
    r = subprocess.run(['node', str(HERE / 'comments.mjs'), '--json'], input=json.dumps(body), text=True, capture_output=True, timeout=20,
                       cwd=ROOT, env={**os.environ, 'SUBPLOTS_ROOT': str(ROOT), 'SUBPLOTS_STATE': str(state_dir())})
    data = json.loads(r.stdout or '{}')
    if r.returncode or data.get('error'):
        raise ValueError(data.get('error', 'The comments could not be read'))
    return data

STATUS_CACHE = {}
def scene_status():
    """Where every scene stands, for the scene list: a private scene's pictures, voice and normal-play entry (the local
    provider's status, from live.json, the voice manifests and the entry check), a public scene is part of the game; for
    both, an unsaved draft and the open comments. Cached for half a minute, dropped on save."""
    with LOCK:
        at, value = STATUS_CACHE.get('all', (0, None))
        if value is not None and time.time() - at < 30:
            return value
    out = {}
    try:
        out.update(local_provider({'action': 'status'}).get('status', {}))
    except (ValueError, OSError, subprocess.SubprocessError):
        pass
    for s in source({'action': 'catalog'})['scenes']:
        out[s['id']] = {'stage': 'game', 'label': 'Part of the public game', 'draft': (slot(s['id']) / 'draft.json').is_file()}
    for c in comments({'action': 'list'}).get('comments', []):
        if c.get('status') == 'open':
            row = out.setdefault(c['scene'], {'stage': '', 'label': ''})
            row['comments'] = row.get('comments', 0) + 1
    value = {'status': out}
    with LOCK:
        STATUS_CACHE['all'] = (time.time(), value)
    return value

def dispatch(action, body):
    if action in ('draft', 'save'):
        STATUS_CACHE.clear()
    if action == 'authoring':
        return authoring_catalog()
    if action == 'status':
        return scene_status()
    if action == 'comments':
        return comments({'action': 'list', 'ids': [x for x in body.get('ids', '').split(',') if x]})
    if action == 'comment':
        if body.get('action') not in ('add', 'reply', 'done', 'reopen'):
            raise ValueError('Unknown comment request')
        with LOCK:
            STATUS_CACHE.clear()
            return comments({**body, 'by': 'jorgen'})
    if action == 'pictures':
        scene_id = body.get('id', '')
        found = local_provider({'action': 'pictures', 'id': scene_id}) if scene_id and not scene_id.startswith('public:') else {}
        if scene_id.startswith('public:'):
            found = {'metadata': read_json(slot(scene_id) / 'metadata.json', {})}
        return {'runs': scene_runs(scene_id, image_history(), found), 'rounds': found.get('rounds', [])}
    scene_id = body.get('id', '')
    if not isinstance(scene_id, str):
        raise ValueError('Invalid scene id')
    if action == 'catalog' and body.get('scope') == 'all':
        return catalog_all()
    if body.get('scope') == 'local' or (scene_id and not scene_id.startswith('public:')):
        result = local_provider({**body, 'action': action})
        if action == 'catalog':
            result['scenes'] = [label(s) for s in result.get('scenes', [])]
        elif isinstance(result, dict) and result.get('id'):
            label(result)
        return result
    if action == 'catalog':
        result = source({'action': 'catalog'})
        result['scenes'] = [label(s) for s in result['scenes']]
        return result
    if action == 'read':
        result = source({'action': 'read', 'id': scene_id})
        result['metadata'] = read_json(slot(scene_id) / 'metadata.json', {})
        result['sourceRevision'] = result['revision']
        result['revision'] = hashlib.sha256((result['sourceRevision'] + json.dumps(result['metadata'], sort_keys=True)).encode()).hexdigest()
        result['draft'] = read_json(slot(scene_id) / 'draft.json', None)
        result['history'] = [p.name for p in sorted((slot(scene_id) / 'history').glob('*.json'), reverse=True)][:30]
        return label(result)
    if action == 'validate':
        current = dispatch('read', {'id': scene_id})
        if body.get('revision') != current['revision']:
            raise ValueError('CONFLICT: The scene changed. Reload before validating.')
        return source({**body, 'revision': current['sourceRevision'], 'action': 'validate'})
    if action == 'history':
        revision = body.get('version', '')
        if not revision or '/' in revision or '\\' in revision or not revision.endswith('.json'):
            raise ValueError('Invalid revision')
        return read_json(slot(scene_id) / 'history' / revision, None)
    if action not in ('draft', 'save'):
        raise ValueError('Unknown editor operation')
    # Serialise editor writers across processes; the source revision is checked inside this lock.
    state_dir().mkdir(parents=True, exist_ok=True)
    with LOCK, (state_dir() / 'write.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if action == 'draft':
            source({'action': 'read', 'id': scene_id})
            if body.get('discard'):
                (slot(scene_id) / 'draft.json').unlink(missing_ok=True)
                return {'ok': True, 'draft': False}
            atomic(slot(scene_id) / 'draft.json', json.dumps(body, ensure_ascii=False))
            return {'ok': True, 'draft': True}
        current = dispatch('read', {'id': scene_id})
        if body.get('revision') != current['revision']:
            raise ValueError('CONFLICT: The scene changed outside this editor. Reload before saving.')
        prepared = source({**body, 'revision': current['sourceRevision'], 'action': 'prepare'})
        file = Path(prepared['resolved'])
        old = file.read_text()
        if old != prepared['source']:
            raise ValueError('CONFLICT: The source changed while saving. Reload before saving.')
        old_scene = current
        name = f'{time.time_ns()}.json'
        atomic(slot(scene_id) / 'history' / name, json.dumps(old_scene, ensure_ascii=False))
        atomic(file, prepared['changed'])
        try:
            atomic(slot(scene_id) / 'metadata.json', json.dumps(body.get('metadata', {}), ensure_ascii=False))
        except OSError:
            atomic(file, old)
            raise
        (slot(scene_id) / 'draft.json').unlink(missing_ok=True)
        return dispatch('read', {'id': scene_id})

def image_proxy(handler, suffix, body=None):
    parsed = urllib.parse.urlsplit(suffix)
    allowed = {'/api/presets', '/api/jobs', '/api/state', '/api/generate', '/api/history', '/api/portraits'}
    if parsed.path not in allowed and not (body is None and parsed.path.startswith(('/thumb/', '/out/', '/priv/portraits/', '/repo/'))):
        raise ValueError('Unsupported image service operation')
    if body is not None and parsed.path != '/api/generate':
        raise ValueError('Unsupported image service write')
    decoded_path = urllib.parse.unquote(parsed.path)
    if '..' in decoded_path or '\\' in decoded_path or '%' in decoded_path or posixpath.normpath(decoded_path).startswith('/repo/island/private'):
        raise ValueError('Invalid image path')
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request('http://127.0.0.1:8772' + suffix, data=data,
                                 headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            content = response.read(25 * 1024 * 1024)
            handler.send_response(response.status)
            handler.send_header('Content-Type', response.headers.get('Content-Type', 'application/json'))
            handler.send_header('Cache-Control', 'no-store')
            handler.send_header('Content-Length', str(len(content)))
            handler.end_headers()
            handler.wfile.write(content)
    except urllib.error.HTTPError as e:
        handler._json(e.code, json.loads(e.read()))
    except urllib.error.URLError:
        handler._json(503, {'error': 'Image generation is offline. Start tools/imagegen/run.sh, then retry.'})

is_public = lambda scene_id: str(scene_id).startswith('public:')

def public_only(action, body):
    """Outside private mode: does this request touch public scenes only? A comment answered by its id is checked
    through the scene it belongs to."""
    if body.get('scope') == 'local' or (body.get('id') and not is_public(body['id'])):
        return False
    if action == 'comments':
        return all(is_public(x) for x in body.get('ids', '').split(',') if x)
    if action == 'comment' and body.get('comment'):
        owner = next((c['scene'] for c in comments({'action': 'list'}).get('comments', []) if c['id'] == body['comment']), '')
        return is_public(owner)
    return True

def public_view(action, data):
    """Outside private mode the answers that cover every scene keep the public ones only."""
    if action == 'status':
        return {'status': {k: v for k, v in data['status'].items() if is_public(k)}}
    if action == 'comments':
        return {'comments': [c for c in data['comments'] if is_public(c['scene'])]}
    return data

def handle(handler):
    """Return True when this request belongs to the subplot editor."""
    url = urllib.parse.urlsplit(handler.path)
    prefix = '/api/subplots/'
    if not url.path.startswith(prefix):
        return False
    try:
        host = urllib.parse.urlsplit('http://' + handler.headers.get('Host', '')).hostname
        if not handler._local() or host not in ('localhost', '127.0.0.1', '::1'):
            handler._json(403, {'error': 'The editor is available on this computer only.'})
            return True
        if handler.command == 'POST':
            origin = handler.headers.get('Origin')
            expected = 'http://' + handler.headers.get('Host', '')
            if origin and origin != expected:
                handler._json(403, {'error': 'Open the editor from the local project server.'})
                return True
            if 'application/json' not in handler.headers.get('Content-Type', ''):
                raise ValueError('Send application/json')
            length = int(handler.headers.get('Content-Length', 0))
            if not 0 < length <= MAX_BODY:
                raise ValueError('The edit is empty or too large')
            body = json.loads(handler.rfile.read(length))
            if not isinstance(body, dict):
                raise ValueError('Expected an object')
        else:
            body = dict(urllib.parse.parse_qsl(url.query))
        action = url.path[len(prefix):]
        if action.startswith('image/'):
            suffix = '/' + action[6:] + ('?' + url.query if url.query else '')
            image_proxy(handler, suffix, body if handler.command == 'POST' else None)
        else:
            if (handler.command == 'GET') != (action in ('catalog', 'read', 'history', 'authoring', 'pictures', 'comments', 'status')):
                raise ValueError('Unsupported request method')
            # Outside private mode (tools/review_server.py, /private) only public scenes are read or written
            mode = getattr(handler, '_private_mode', None)
            if callable(mode) and not mode():
                if not public_only(action, body):
                    handler._json(403, {'error': 'Private scenes open in private mode: http://127.0.0.1:8771/private'})
                    return True
                handler._json(200, public_view(action, dispatch(action, body)))
                return True
            handler._json(200, dispatch(action, body))
    except (ValueError, OSError, subprocess.SubprocessError) as e:
        handler._json(409 if str(e).startswith('CONFLICT:') else 400, {'error': str(e)})
    return True
