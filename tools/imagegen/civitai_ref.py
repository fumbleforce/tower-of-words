#!/usr/bin/env python3
"""Save Civitai images Jørgen sends as private references: generation settings, resources, prompt and the picture.

    python3 tools/imagegen/civitai_ref.py <image url or id> [...] [--force] [--no-image] [--out DIR]

For each image it writes <out>/civitai-<id>.md (link, base model, size, settings, resources with weights, prompt,
negative) and <out>/civitai-<id>.webp (the picture, at most 1600 px on its long side). The default <out> is the
private references folder, island/private/rewards/docs/references/, which is git-ignored. Nothing it saves may go in a
public file, page, issue or commit. An image already saved is skipped unless --force is given.

How it reads Civitai:
- The image and its metadata: GET https://civitai.com/api/v1/images?imageId=<id>&nsfw=X&withMeta=true with the
  CIVITAI_API_KEY from the repo's .env as a Bearer header. The settings are under items[0].meta.meta.
- Each resource: GET https://civitai.com/api/v1/model-versions/<id> without the header (with it Civitai answers 403).
- An image with no metadata (meta is null, often a hand-edited or uploaded picture) gets a file marked "No meta"
  that still holds the link, the size and the picture, so the pose can be described from the picture itself.
- A video saves no picture (the md says so).

Steps when he sends more links (the pose library and the scene ideas, private mode):
1. Run this tool once with every link. It prints one line per image: id, base model, saved files, "no meta".
2. Look at each saved picture and read its prompt. Skip any image whose people are not clearly adults.
3. Pose library: for each distinct position, write a private 'pose' preset in the image dashboard
   (POST /api/preset/pose/new/create with {"name", "data", "private": true} and the amakawa_mode=private cookie;
   a position already in the library gets a new version through /api/preset/pose/<id>/save instead). Its data:
   name (the position, with "(hard)" or "(soft)"), tier ("hard" or "soft"), text in two lines (line 1 the
   Danbooru-style pose and position tags, line 2 the full positioning as plain staging prose: who is where, facing
   what, limbs, camera angle and height), and notes (the civitai-<id> references and the pose LoRAs they used, as
   references only). No character names, no LoRA trigger words, nothing from another IP. Merge duplicates.
4. Scene ideas: one or two lines per distinct situation in rewards/docs/spice-ideas.md under a dated heading,
   placed with our cast in the island's real places, on the gates of rewards/docs/encounter-progression.md.
5. Post a claim and a done in collab/private.md.
"""
import argparse, io, json, os, re, sys, urllib.error, urllib.parse, urllib.request

REPO = re.split(r'/\.claude/worktrees/', os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))[0]
OUT = os.path.join(REPO, 'island', 'private', 'rewards', 'docs', 'references')
API = 'https://civitai.com/api/v1'
UA = {'User-Agent': 'amakawa-civitai-ref/1'}
SETTINGS = (('Size', 'size'), ('sampler', 'sampler'), ('Schedule type', 'schedule'), ('steps', 'steps'),
            ('cfgScale', 'CFG'), ('clipSkip', 'clip skip'), ('seed', 'seed'), ('Denoising strength', 'denoise'),
            ('Hires upscale', 'hires upscale'), ('Hires upscaler', 'hires upscaler'), ('Hires steps', 'hires steps'),
            ('ADetailer model', 'ADetailer'))


def api_key():
    key = os.environ.get('CIVITAI_API_KEY', '')
    env = os.path.join(REPO, '.env')
    if not key and os.path.isfile(env):
        with open(env, encoding='utf-8') as f:
            for line in f:
                if line.strip().startswith('CIVITAI_API_KEY='):
                    key = line.split('=', 1)[1].strip().strip('"\'')
    return key


def get(url, auth=None, raw=False):
    headers = dict(UA)
    if auth:
        headers['Authorization'] = 'Bearer ' + auth
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60) as r:
        data = r.read()
    return data if raw else json.loads(data)


def parse_ref(arg):
    """(image id, the link as given) from a Civitai image url or a bare id."""
    m = re.search(r'/images/(\d+)', arg) or re.fullmatch(r'\s*(\d+)\s*', arg)
    if not m:
        raise ValueError(f'not a Civitai image link or id: {arg}')
    iid = m.group(1)
    link = arg.strip() if arg.strip().startswith('http') else f'https://civitai.com/images/{iid}'
    return iid, link.split('?')[0]


_versions = {}


def version(vid):
    """Name, type, base model and trigger words of a model version (cached for the run); None when it fails."""
    if vid in _versions:
        return _versions[vid]
    try:
        v = get(f'{API}/model-versions/{vid}')
        out = dict(model=(v.get('model') or {}).get('name') or '', type=(v.get('model') or {}).get('type') or '',
                   version=v.get('name') or '', base=v.get('baseModel') or '', model_id=v.get('modelId'),
                   words=v.get('trainedWords') or [])
    except (urllib.error.URLError, ValueError, TimeoutError):
        out = None
    _versions[vid] = out
    return out


def resources(meta, item):
    """[(kind, label, weight)] from civitaiResources, the older hash resources, and the image's version ids."""
    rows, seen = [], set()
    for r in meta.get('civitaiResources') or []:
        vid = r.get('modelVersionId')
        seen.add(vid)
        v = version(vid) if vid else None
        label = f"{v['model']} ({v['version']}, {v['base']}, version {vid})" if v else f"{r.get('modelVersionName') or '?'} (version {vid})"
        if v and v['words']:
            label += '; trigger words: ' + ', '.join(v['words'][:8])
        rows.append((r.get('type') or (v or {}).get('type', '?'), label, r.get('weight')))
    for r in meta.get('resources') or []:
        if r.get('name') or r.get('hash'):
            rows.append((r.get('type') or '?', f"{r.get('name') or '?'} (hash {r.get('hash') or '?'})", r.get('weight')))
    for vid in item.get('modelVersionIds') or []:
        if vid not in seen:
            v = version(vid)
            label = f"{v['model']} ({v['version']}, {v['base']}, version {vid})" if v else f'version {vid}'
            rows.append(((v or {}).get('type') or '?', label + ' (listed on the image, no weight)', None))
    return rows


def image_webp(url, path):
    """Download the picture at most 1600 px on its long side and save it as webp. Returns the size, or None."""
    from PIL import Image
    small = re.sub(r'/original=true/', '/width=1600/', url)
    data = get(small, raw=True)
    im = Image.open(io.BytesIO(data))
    im.load()
    im = im.convert('RGB')
    im.thumbnail((1600, 1600))
    tmp = path + '.tmp'
    im.save(tmp, 'WEBP', quality=88)
    os.replace(tmp, path)
    return im.size


def markdown(iid, link, item, meta, res, picture):
    lines = [f'# Civitai image {iid}', '', link, '']
    size = meta.get('Size') or f"{item.get('width')}x{item.get('height')}"
    facts = [f"Base {item.get('baseModel') or meta.get('baseModel') or 'unknown'}", f'{size}']
    facts += [f'{label} {meta[k]}' for k, label in SETTINGS if meta.get(k) not in (None, '') and k != 'Size']
    lines += [', '.join(str(x) for x in facts) + '.', '']
    lines += [f"Rating on Civitai: {item.get('nsfwLevel') or '?'}. Picture: {picture}.", '']
    if not meta:
        lines += ['No meta: Civitai gives no generation data for this image. Describe the pose from the picture.', '']
    if res:
        lines += ['## Resources', '']
        lines += [f'- {kind}: {label}' + (f', weight {w}' if w is not None else '') for kind, label, w in res]
        lines.append('')
    if meta.get('prompt'):
        lines += ['## Prompt', '', meta['prompt'].strip(), '']
    if meta.get('negativePrompt'):
        lines += ['## Negative', '', meta['negativePrompt'].strip(), '']
    return '\n'.join(lines)


def take(arg, key, out, force=False, picture=True):
    iid, link = parse_ref(arg)
    md = os.path.join(out, f'civitai-{iid}.md')
    if os.path.exists(md) and not force:
        return f'{iid}: already saved (use --force to fetch again)'
    q = urllib.parse.urlencode(dict(imageId=iid, nsfw='X', withMeta='true'))
    items = get(f'{API}/images?{q}', auth=key).get('items') or []
    if not items:
        return f'{iid}: Civitai returned no image (deleted or hidden)'
    item = items[0]
    meta = ((item.get('meta') or {}).get('meta')) or {}
    res = resources(meta, item) if (meta or item.get('modelVersionIds')) else []
    os.makedirs(out, exist_ok=True)
    note, saved = 'none saved', []
    if picture and item.get('type', 'image') == 'image' and item.get('url'):
        wp = os.path.join(out, f'civitai-{iid}.webp')
        try:
            w, h = image_webp(item['url'], wp)
            note = f'civitai-{iid}.webp ({w}x{h})'
            saved.append(os.path.basename(wp))
        except Exception as e:  # a bad download leaves the md without a picture
            note = f'download failed ({type(e).__name__})'
    elif item.get('type') == 'video':
        note = 'a video, not saved'
    with open(md, 'w', encoding='utf-8') as f:
        f.write(markdown(iid, link, item, meta, res, note))
    saved.insert(0, os.path.basename(md))
    base = item.get('baseModel') or meta.get('baseModel') or '?'
    return f"{iid}: {base}, {', '.join(saved)}" + ('' if meta else ', no meta')


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('refs', nargs='+', help='Civitai image links or ids')
    ap.add_argument('--out', default=OUT, help='folder for the files (default: the private references folder)')
    ap.add_argument('--force', action='store_true', help='fetch again even when the md exists')
    ap.add_argument('--no-image', action='store_true', help='skip the picture')
    a = ap.parse_args(argv)
    key = api_key()
    if not key:
        sys.exit('CIVITAI_API_KEY is not set (environment or .env)')
    refs = [r for arg in a.refs for r in re.split(r'[\s,]+', arg) if r]
    bad = 0
    for r in refs:
        try:
            print(take(r, key, a.out, a.force, not a.no_image))
        except (urllib.error.URLError, ValueError, TimeoutError) as e:
            bad += 1
            print(f'{r}: failed ({e})')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
