"""Resolve a selected render and create a versioned character with its own portrait copy."""
import json
from pathlib import Path
import re
import shutil
import urllib.parse
import urllib.request
import uuid

import store
import privacy


def selected_image(image_id, private=False):
    if not isinstance(image_id, str) or not re.fullmatch(r'[A-Za-z0-9_.-]+', image_id):
        raise ValueError('Choose a generated picture first.')
    row = next((r for r in store.log_read() if r.get('id') == image_id), None)
    if not row or row.get('status') != 'done' or row.get('deleted'):
        raise ValueError('This picture is no longer available. Choose another picture.')
    hidden = privacy.is_private_render(row)
    if hidden and not private:
        raise ValueError('This picture is available in private mode only.')
    if row.get('file'):
        base = Path(store.OUTPUTS).resolve()
        path = (base / row['file']).resolve()
        url = '/api/subplots/image/out/' + row['file']
    elif row.get('source') == 'agent' and row.get('out_path'):
        base = Path(store.REPO).resolve()
        path = (base / row['out_path']).resolve()
        url = '/api/subplots/image/agentsrc/' + image_id
    else:
        raise ValueError('The original picture is missing. Choose another picture.')
    if (not path.is_relative_to(base) or path.is_relative_to(Path(store.OFF_LIMITS).resolve())
            or path.suffix.lower() not in ('.png', '.webp', '.jpg', '.jpeg') or not path.is_file()):
        raise ValueError('The original picture is missing. Choose another picture.')
    return {**row, 'private': bool(hidden), 'url': url}, path


def create_character(body, private=False):
    image, path = selected_image(body.get('imageId'), private)
    data = body.get('data')
    if not isinstance(data, dict):
        raise ValueError('Enter the character details.')
    # Keep character fields separate from the composition and its scene direction.
    fields = ('name', 'gender', 'age', 'look', 'signature', 'build', 'rating_cap', 'outfit', 'short', 'negative', 'notes')
    data = {key: str(data.get(key, '')).strip() for key in fields}
    if not data['name'] or not data['look']:
        raise ValueError('Give the character a name and describe their appearance.')
    is_private = image['private'] or bool(body.get('private'))
    if is_private and not private:
        raise ValueError('Private characters are created in private mode only.')
    portrait = Path(store.PORTRAITS) / ('character-' + uuid.uuid4().hex + path.suffix.lower())
    portrait.parent.mkdir(parents=True, exist_ok=True)
    metadata = portrait.with_suffix(portrait.suffix + '.json')
    data['portrait'] = 'island/private/imagegen/portraits/' + portrait.name
    data['sourceImage'] = {'id': image['id'], 'seed': image.get('seed')}
    # Preset creation and filename allocation share the preset store's lock.
    with store._lock:
        base = store.slug(data['name'])
        preset_id, n = base, 2
        while store.load('character', preset_id):
            preset_id, n = f'{base}-{n}', n + 1
        try:
            store._atomic_write(str(metadata), json.dumps({'private': is_private, 'imageId': image['id']}))
            shutil.copyfile(path, portrait)
            return store.create('character', preset_id, data, 'Created from picture ' + image['id'], private=is_private)
        except Exception:
            portrait.unlink(missing_ok=True)
            metadata.unlink(missing_ok=True)
            raise


def portrait_visible(relative, private=False):
    base = Path(store.PORTRAITS).resolve()
    path = (base / relative).resolve()
    if not path.is_relative_to(base) or path.suffix.lower() not in ('.png', '.webp', '.jpg', '.jpeg'):
        return False
    metadata = path.with_suffix(path.suffix + '.json')
    if not metadata.is_file():
        return True
    return private or not json.loads(metadata.read_text()).get('private')


def draft_picture(reference, private=False):
    """Import only the scene editor's authenticated draft-picture endpoint for img2img."""
    parsed = urllib.parse.urlsplit(reference)
    query = urllib.parse.parse_qs(parsed.query)
    scene_id = query.get('id', [''])[0]
    asset = query.get('asset', [''])[0]
    match = re.fullmatch(r'studio:(public|private):[a-f0-9]{32}', scene_id)
    if (parsed.scheme or parsed.netloc or parsed.path != '/api/subplots/draft-picture' or not match
            or not re.fullmatch(r'[a-f0-9]{64}', asset) or set(query) != {'id', 'asset'}):
        raise ValueError('Invalid scene draft picture')
    if match[1] == 'private' and not private:
        raise ValueError('This scene draft opens in private mode only.')
    headers = {'Cookie': 'amakawa_mode=private'} if private else {}
    request = urllib.request.Request('http://127.0.0.1:8771' + reference, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            data = response.read(25 * 1024 * 1024 + 1)
    except OSError as error:
        raise ValueError('The saved scene picture could not be loaded. Check the scene editor is running.') from error
    if len(data) > 25 * 1024 * 1024:
        raise ValueError('The scene picture is too large.')
    import hashlib
    if hashlib.sha256(data).hexdigest() != asset:
        raise ValueError('The saved scene picture has changed. Reopen the scene.')
    suffix = '.png' if data.startswith(b'\x89PNG\r\n\x1a\n') else '.jpg' if data.startswith(b'\xff\xd8\xff') else '.webp' if data[:4] == b'RIFF' and data[8:12] == b'WEBP' else ''
    if not suffix:
        raise ValueError('The scene picture has an unsupported format.')
    name = 'scene-' + match[1] + '-' + asset + suffix
    path = Path(store.PORTRAITS) / name
    path.parent.mkdir(parents=True, exist_ok=True)
    # Mark visibility before writing any image bytes.
    store._atomic_write(str(path) + '.json', json.dumps({'private': match[1] == 'private', 'scene': scene_id}))
    path.write_bytes(data)
    return 'island/private/imagegen/portraits/' + name
