"""Image-seeded authoring drafts. These files never become gameplay sources.

Only the image service resolves a render ID to its metadata and bytes. A draft owns a
copy of each selected picture, so source deletion cannot break its saved revisions.
"""
import copy
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import time
import urllib.parse
import uuid

ID = re.compile(r'studio:(public|private):([a-f0-9]{32})')
SLOT = re.compile(r'[A-Za-z0-9:_.-]{1,120}')
MAX_IMAGE = 25 * 1024 * 1024


def is_studio(value):
    return isinstance(value, str) and ID.fullmatch(value) is not None


def atomic(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    data = value if isinstance(value, bytes) else json.dumps(value, ensure_ascii=False).encode()
    fd, tmp = tempfile.mkstemp(prefix='.draft-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as out:
            out.write(data)
            out.flush()
            os.fsync(out.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def read_json(path, default=None):
    return json.loads(path.read_text()) if path.is_file() else default


def picture_type(data):
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'image/png'
    if data.startswith(b'\xff\xd8\xff'):
        return 'image/jpeg'
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'image/webp'
    raise ValueError('The selected render is not a supported picture.')


def picture_url(scene_id, asset):
    return '/api/subplots/draft-picture?' + urllib.parse.urlencode({'id': scene_id, 'asset': asset})


class Drafts:
    def __init__(self, state, lookup, download, private=False):
        self.root = Path(state) / 'studio'
        self.lookup = lookup
        self.download = download
        self.private = private

    def folder(self, scene_id):
        match = ID.fullmatch(scene_id)
        if not match:
            raise ValueError('Invalid scene draft id')
        if match[1] == 'private' and not self.private:
            raise PermissionError('Private scene drafts open in private mode.')
        return self.root / match[2]

    def raw(self, scene_id):
        doc = read_json(self.folder(scene_id) / 'scene.json')
        if not doc or doc.get('id') != scene_id or doc.get('audience') != ID.fullmatch(scene_id)[1]:
            raise ValueError('Scene draft not found')
        return doc

    def rows(self):
        out = []
        for file in sorted(self.root.glob('*/scene.json')):
            doc = read_json(file)
            if not doc or not is_studio(doc.get('id')) or file.parent.name != ID.fullmatch(doc['id'])[2]:
                continue
            if doc.get('audience') != ID.fullmatch(doc['id'])[1] or (doc['audience'] == 'private' and not self.private):
                continue
            out.append({k: doc[k] for k in ('id', 'audience', 'title', 'node', 'group', 'where', 'provider', 'studioDraft')})
            out[-1]['count'] = len(doc['steps'])
        return out

    def read(self, scene_id):
        doc = self.raw(scene_id)
        doc['revision'] = hashlib.sha256(json.dumps(doc, sort_keys=True).encode()).hexdigest()
        doc['history'] = [p.name for p in sorted((self.folder(scene_id) / 'history').glob('*.json'), reverse=True)][:30]
        doc['draft'] = read_json(self.folder(scene_id) / 'draft.json')
        if doc['draft']:
            doc['draft'].pop('sources', None)
        doc['images'] = [dict(id=key, file='', url=value['url'], start=value['url'], available=True)
                         for key, value in doc['metadata'].get('images', {}).items()]
        # Original jobs stay server-owned; picture-source exposes the selected shot only.
        doc.pop('sources', None)
        return doc

    def capture(self, scene_id, image_id):
        job = self.lookup(image_id)
        if not isinstance(job, dict) or job.get('id') != image_id or not isinstance(job.get('private'), bool) or job.get('deleted'):
            raise ValueError('The selected render is not available.')
        if job['private'] and (not self.private or ID.fullmatch(scene_id)[1] != 'private'):
            raise PermissionError('Private pictures require a private scene draft.')
        data = self.download(job)
        if not data or len(data) > MAX_IMAGE:
            raise ValueError('The selected picture is empty or too large.')
        mime = picture_type(data)
        name = hashlib.sha256(data).hexdigest()
        atomic(self.folder(scene_id) / 'pictures' / name, data)
        return {'job': job, 'asset': name, 'mime': mime}

    def chosen(self, scene_id, key, source):
        job = source['job']
        return {k: v for k, v in dict(slot=key, id=job['id'], n=job.get('n'), url=picture_url(scene_id, source['asset']),
                                    seed=job.get('seed'), positive=job.get('positive'), applied=True).items() if v is not None}

    def create(self, body):
        image_id = body.get('imageId')
        if not isinstance(image_id, str) or not re.fullmatch(r'[A-Za-z0-9_.-]+', image_id):
            raise ValueError('Choose a generated image first.')
        title = body.get('title')
        if not isinstance(title, str) or not title.strip() or len(title.strip()) > 160:
            raise ValueError('Give the scene a title of 1 to 160 characters.')
        job = self.lookup(image_id)
        if not isinstance(job, dict) or not isinstance(job.get('private'), bool):
            raise ValueError('The selected render is not available.')
        audience = 'private' if job['private'] else 'public'
        scene_id = f'studio:{audience}:{uuid.uuid4().hex}'
        source = self.capture(scene_id, image_id)
        key = 'image:0'
        doc = dict(id=scene_id, title=title.strip(), node=title.strip(), provider='studio', studioDraft=True,
                   audience=audience, group='drafts', where='Local scene draft', recipe=True,
                   capabilities={'picture': 'picture'}, routesEditable=False, entries=[], placement=None,
                   steps=[{'shot': {'fit': 'contain'}, 'imageSlot': key, 'narration': ''}],
                   metadata={'images': {key: self.chosen(scene_id, key, source)}, 'compositions': {}},
                   sources={image_id: source}, created=time.time_ns())
        atomic(self.folder(scene_id) / 'scene.json', doc)
        return {'id': scene_id}

    def prepared(self, body, current):
        steps = copy.deepcopy(body.get('steps'))
        if not isinstance(steps, list):
            raise ValueError('A scene draft needs a list of beats.')
        keys, count = set(), 0
        def walk(rows, depth=0):
            nonlocal count
            if depth > 20 or not isinstance(rows, list):
                raise ValueError('Invalid scene beat structure')
            for beat in rows:
                count += 1
                if count > 10000 or not isinstance(beat, (str, dict)):
                    raise ValueError('Invalid scene beat')
                if isinstance(beat, dict):
                    beat.pop('imageUrl', None)
                    if 'imageSlot' in beat:
                        key = beat['imageSlot']
                        if not isinstance(key, str) or not SLOT.fullmatch(key):
                            raise ValueError('Invalid picture slot')
                        keys.add(key)
                    for field in ('then', 'else', 'sequence'):
                        if field in beat:
                            walk(beat[field], depth + 1)
        walk(steps)
        metadata = copy.deepcopy(body.get('metadata', {}))
        if not isinstance(metadata, dict) or not isinstance(metadata.get('images', {}), dict):
            raise ValueError('Invalid scene metadata')
        metadata.pop('image', None)
        picked = metadata.pop('images', {})
        metadata['images'] = {}
        sources = copy.deepcopy(current['sources'])
        sources.update((read_json(self.folder(current['id']) / 'draft.json', {}) or {}).get('sources', {}))
        for key, value in picked.items():
            if key not in keys:
                continue
            image_id = value.get('id') if isinstance(value, dict) else None
            if not isinstance(image_id, str) or not re.fullmatch(r'[A-Za-z0-9_.-]+', image_id):
                raise ValueError('Choose a generated image for each picture.')
            source = sources.get(image_id)
            if source is None:
                source = sources[image_id] = self.capture(current['id'], image_id)
            metadata['images'][key] = self.chosen(current['id'], key, source)
        return {**current, 'steps': steps, 'metadata': metadata, 'sources': sources}

    def dispatch(self, action, body):
        if action == 'create-from-image':
            return self.create(body)
        scene_id = body.get('id', '')
        current = self.raw(scene_id)
        folder = self.folder(scene_id)
        if action == 'read':
            return self.read(scene_id)
        if action == 'history':
            version = body.get('version', '')
            if not isinstance(version, str) or not re.fullmatch(r'\d+\.json', version):
                raise ValueError('Invalid revision')
            doc = read_json(folder / 'history' / version)
            if doc:
                doc.pop('sources', None)
            return doc
        if action == 'picture-source':
            key = body.get('slot', '')
            picked = current['metadata']['images'].get(key, {})
            source = current['sources'].get(picked.get('id'))
            return {'job': source['job'] if source else None, 'how': 'the picture saved with this scene draft',
                    'start': {'image': picture_url(scene_id, source['asset'])} if source else None, 'copies': []}
        if action not in ('save', 'draft', 'validate'):
            raise ValueError('Unknown scene draft operation')
        if body.get('revision') != self.read(scene_id)['revision']:
            raise ValueError('CONFLICT: The scene draft changed. Reload before saving.')
        if action == 'draft' and body.get('discard'):
            (folder / 'draft.json').unlink(missing_ok=True)
            return {'ok': True, 'draft': False}
        prepared = self.prepared(body, current)
        if action == 'validate':
            return {'ok': True}
        if action == 'draft':
            # Autosave shares the same validation and revision guard as an explicit save.
            atomic(folder / 'draft.json', {k: prepared[k] for k in ('steps', 'metadata', 'sources')} | {'at': body.get('at', 0)})
            return {'ok': True, 'draft': True}
        name = f'{time.time_ns()}.json'
        atomic(folder / 'history' / name, current)
        try:
            atomic(folder / 'scene.json', prepared)
        except OSError:
            (folder / 'history' / name).unlink(missing_ok=True)
            raise
        (folder / 'draft.json').unlink(missing_ok=True)
        return self.read(scene_id)

    def picture(self, body):
        doc = self.raw(body.get('id', ''))
        picked = doc['metadata']['images'].get(body.get('slot', ''), {})
        sources = {**doc['sources'], **(read_json(self.folder(doc['id']) / 'draft.json', {}) or {}).get('sources', {})}
        source = next((s for s in sources.values() if s.get('asset') == body.get('asset')), None) if body.get('asset') else sources.get(picked.get('id'))
        if not source or not re.fullmatch(r'[a-f0-9]{64}', source.get('asset', '')):
            raise ValueError('Scene draft picture not found')
        return (self.folder(doc['id']) / 'pictures' / source['asset']).read_bytes(), source['mime']

    def comments(self, body):
        """Draft comments live beside their scene, including private drafts."""
        action = body.get('action', 'list')
        ids = body.get('ids', [])
        if action == 'list':
            rows = [self.raw(i) for i in ids] if ids else self.rows()
            return {'comments': [comment for row in rows
                                 for comment in read_json(self.folder(row['id']) / 'comments.json', [])]}
        now = datetime.now(timezone.utc).isoformat()
        if action == 'add':
            scene_id = body.get('id', '')
            self.raw(scene_id)
            text = str(body.get('text', '')).strip()
            if not text:
                raise ValueError('A comment needs some words')
            beat = body.get('beat') if isinstance(body.get('beat'), dict) else {}
            comment = {'id': 'studio-comment-' + uuid.uuid4().hex, 'scene': scene_id, 'title': str(body.get('title', '')),
                       'where': 'Local scene draft', 'text': text, 'by': 'jorgen', 'at': now, 'status': 'open', 'replies': [],
                       'beat': {'key': str(beat.get('key', '')), 'path': beat.get('path', []),
                                'text': str(beat.get('text', ''))[:600], 'kind': str(beat.get('kind', ''))}}
            path = self.folder(scene_id) / 'comments.json'
            rows = read_json(path, [])
            rows.append(comment)
            atomic(path, rows)
            return {'comment': comment}
        for row in self.rows():
            path = self.folder(row['id']) / 'comments.json'
            rows = read_json(path, [])
            comment = next((c for c in rows if c['id'] == body.get('comment')), None)
            if not comment:
                continue
            if action == 'reply':
                text = str(body.get('text', '')).strip()
                if not text:
                    raise ValueError('A reply needs some words')
                comment['replies'].append({'by': 'jorgen', 'text': text, 'at': now})
            elif action in ('done', 'reopen'):
                comment['status'] = 'done' if action == 'done' else 'open'
            else:
                raise ValueError('Unknown comment request')
            atomic(path, rows)
            return {'comment': comment}
        raise ValueError('Scene draft comment not found')
