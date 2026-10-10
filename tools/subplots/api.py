"""Local editing API. Source adapters own formats; this module owns revisions and HTTP."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
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
    if not command or os.environ.get('SUBPLOTS_PUBLIC_ONLY') == '1':
        raise ValueError('The local scene adapter is not configured. Public stories are available.')
    cmd = json.loads(command)
    if not isinstance(cmd, list) or not cmd or not all(isinstance(x, str) for x in cmd):
        raise ValueError('SUBPLOTS_PROVIDER must be a JSON command array')
    result = subprocess.run(cmd, input=json.dumps(body), capture_output=True, text=True, cwd=ROOT, timeout=30)
    data = json.loads(result.stdout)
    if result.returncode or data.get('error'):
        raise ValueError(data.get('error', 'Local scene adapter failed'))
    return data

def dispatch(action, body):
    scene_id = body.get('id', '')
    if body.get('scope') == 'local' or (scene_id and not scene_id.startswith('public:')):
        return local_provider({**body, 'action': action})
    if action == 'catalog':
        return source({'action': 'catalog'})
    if action == 'read':
        result = source({'action': 'read', 'id': scene_id})
        result['metadata'] = read_json(slot(scene_id) / 'metadata.json', {})
        result['sourceRevision'] = result['revision']
        result['revision'] = hashlib.sha256((result['sourceRevision'] + json.dumps(result['metadata'], sort_keys=True)).encode()).hexdigest()
        result['draft'] = read_json(slot(scene_id) / 'draft.json', None)
        result['history'] = [p.name for p in sorted((slot(scene_id) / 'history').glob('*.json'), reverse=True)][:30]
        return result
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
    allowed = {'/api/presets', '/api/jobs', '/api/state', '/api/generate', '/api/history'}
    if parsed.path not in allowed and not (body is None and parsed.path.startswith(('/thumb/', '/out/'))):
        raise ValueError('Unsupported image service operation')
    if body is not None and parsed.path != '/api/generate':
        raise ValueError('Unsupported image service write')
    if '..' in parsed.path or '\\' in parsed.path:
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
            if (handler.command == 'GET') != (action in ('catalog', 'read', 'history')):
                raise ValueError('Unsupported request method')
            handler._json(200, dispatch(action, body))
    except (ValueError, OSError, subprocess.SubprocessError) as e:
        handler._json(409 if str(e).startswith('CONFLICT:') else 400, {'error': str(e)})
    return True
