"""Import completed external tool renders into the ordinary numbered picture history.

No generator is invoked. Provider settings are evidence, never local-model defaults.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
from datetime import datetime, timezone

import store
import privacy

UNEXPOSED = ('model_version', 'seed', 'steps', 'cfg', 'sampler', 'scheduler', 'negative', 'loras', 'control', 'ipa')


def safe_path(path):
    p = Path(path).expanduser().absolute()
    forbidden = Path(store.OFF_LIMITS)
    if p.is_relative_to(forbidden) or p.name.endswith('.user.json'):
        raise ValueError('Protected files cannot be imported.')
    if any(component.is_symlink() for component in [p, *p.parents]):
        raise ValueError('Symlink sources cannot be imported. Use the original file path.')
    p = p.resolve()
    if p.is_relative_to(forbidden.resolve()) or p.name.endswith('.user.json'):
        raise ValueError('Protected files cannot be imported.')
    return p


def image(path):
    p = safe_path(path)
    if p.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
        raise ValueError('Use an original PNG, JPEG or WebP picture.')
    from PIL import Image
    data = p.read_bytes()
    with Image.open(io.BytesIO(data)) as im:
        im.verify()
    with Image.open(io.BytesIO(data)) as im:
        im.load()
        size = list(im.size)
    return p, {'path': str(p), 'sha256': hashlib.sha256(data).hexdigest(), 'width': size[0], 'height': size[1]}, data


def import_render(receipt):
    """Record one output. Identical import_id retries return the existing row.

    Required: import_id, engine, prompt, output, rating. Optional at records an evidenced time with timezone.
    Optional: ordered references, requested (actual tool arguments), observed
    (provider metadata), unavailable (unexposed controls), owner, round, characters.
    """
    r = json.loads(json.dumps(receipt))
    if not re.fullmatch(r'[A-Za-z0-9_.-]{1,160}', r.get('import_id', '')):
        raise ValueError('Supply a stable import_id for this tool output.')
    if not all(isinstance(r.get(k), str) and r[k].strip() for k in ('engine', 'prompt')):
        raise ValueError('Record the actual engine and prompt.')
    imported_at = datetime.now(timezone.utc).isoformat()
    stamp = r.get('at') or imported_at
    at = datetime.fromisoformat(stamp.replace('Z', '+00:00'))
    if at.tzinfo is None:
        raise ValueError('Generation time must include its timezone.')
    if r.get('rating') not in ('safe', 'sensitive', 'nsfw'):
        raise ValueError('Record the content rating.')
    if not isinstance(r.get('references', []), list) or not isinstance(r.get('requested', {}), dict) or not isinstance(r.get('observed', {}), dict):
        raise ValueError('References must be ordered, and requested/observed settings must be objects.')
    if not isinstance(r.get('unavailable', []), list) or any(not isinstance(x, str) for x in r.get('unavailable', [])):
        raise ValueError('Unavailable controls must be a list of names.')
    requested = r.get('requested', {})
    if 'prompt' in requested and requested['prompt'] != r['prompt']:
        raise ValueError('The saved prompt must match the actual tool request.')
    if 'referenced_image_paths' in requested and requested['referenced_image_paths'] != r.get('references', []):
        raise ValueError('References must match the order in the actual tool request.')
    output, proof, output_bytes = image(r['output'])
    refs = [image(p) for p in r.get('references', [])]
    provenance = dict(schema=1, kind='external', engine=r['engine'], import_id=r['import_id'],
                      requested=r.get('requested', {}), observed=r.get('observed', {}),
                      unavailable=r.get('unavailable', list(UNEXPOSED)), output=proof,
                      generated_at=r.get('at'), timestamp_source=r.get('timestamp_source', 'tool_receipt' if r.get('at') else 'not_recorded'),
                      references=[p for _, p, _ in refs], replay=False)
    identity = hashlib.sha256(json.dumps({'prompt': r['prompt'], 'at': r.get('at'), 'rating': r['rating'], 'private': bool(r.get('private')), 'owner': r.get('owner'), 'round': r.get('round'), 'characters': r.get('characters', []), 'provenance': provenance}, sort_keys=True).encode()).hexdigest()
    rid = 'external-' + hashlib.sha256(r['import_id'].encode()).hexdigest()[:32]
    row = dict(id=rid, run_id=rid, idx=1, at=stamp, imported_at=imported_at, status='done', source='agent', owner=r.get('owner', 'external tool'),
               round=r.get('round', ''), positive=r['prompt'], negative='', seed=None, model_file=None,
               steps=None, cfg=None, sampler=None, scheduler=None, w=proof['width'], h=proof['height'],
               rating=r['rating'], characters=r.get('characters', []), compose={}, presets={},
               provenance=provenance, import_identity=identity, star=False, fav=False, reject=False, reject_reason='', note='')
    def private_source(info):
        path = Path(info['path'])
        try:
            relative = path.relative_to(store.REPO).as_posix()
        except ValueError:
            relative = str(path)
        return privacy.is_private_render({'out_path': relative})
    row['private'] = bool(r.get('private')) or privacy.is_private_render(row) or any(private_source(p) for p in [proof, *provenance['references']])
    # Visibility metadata is durable before any image becomes HTTP-addressable.
    rel = f'{at.date()}/{rid}{output.suffix.lower()}'
    thumb = str(Path(rel).with_suffix('.webp'))
    for src, ref, _ in refs:
        ref['file'] = 'references/' + rid + '/' + ref['sha256'] + src.suffix.lower()
    row.update(file=rel, thumb=thumb, status='importing')
    with store._log_locked():
        prior = next((x for x in store.log_read() if x.get('id') == rid), None)
        if prior:
            if prior.get('import_identity') != identity:
                raise ValueError('This import_id already records different generation evidence.')
            if prior.get('status') not in ('importing', 'failed'):
                return prior
            row = prior
            rel, thumb = row['file'], row['thumb']
            store.log_set(rid, {'status': 'importing', 'error': None})
        else:
            row = store.log_append(row)
        copies = [(Path(store.OUTPUTS)/rel, output_bytes)] + [(Path(store.OUTPUTS)/ref['file'], data) for _, ref, data in refs]
        created = []
        thumb_path = Path(store.THUMBS)/thumb
        thumb_existed = thumb_path.exists()
        try:
            for dest, data in copies:
                if dest.exists():
                    if dest.read_bytes() != data:
                        raise ValueError('An imported original or reference copy has changed.')
                else:
                    created.append(dest)
                    store._atomic_write_bytes(str(dest), data)
            store.make_thumb(str(Path(store.OUTPUTS)/rel), rel)
            return store.log_set(rid, {'status': 'done', 'error': None})[0]
        except Exception as error:
            for dest in created:
                dest.unlink(missing_ok=True)
            if not thumb_existed:
                thumb_path.unlink(missing_ok=True)
            store.log_set(rid, {'status': 'failed', 'error': str(error)})
            raise



def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('receipt', help='JSON receipt for one completed tool output')
    args = parser.parse_args()
    print(json.dumps(import_render(json.loads(safe_path(args.receipt).read_text())), ensure_ascii=False))


if __name__ == '__main__':
    main()
