#!/usr/bin/env python3
"""The bible's Review and Showcase on GitHub Pages, so Jørgen can answer from anywhere.

    python3 tools/bible/pages.py stage <site>    add the remote bible to a site folder (game3d/tools/deploy-pages.sh)
    python3 tools/bible/pages.py deny <site>     only the deny check: exit 1 if anything private is in <site>
    python3 tools/bible/pages.py media           write bible/pages-media.json, the media list tools/assets/sync.py pushes
    python3 tools/bible/pages.py push            media, then tools/assets/sync.py push; commit the list and the lock file

The site gets bible/ (index, app.js, live.js, work.js, app.css) in remote mode, every committed file under reviews/
and showcase/, the images and audio those items show, and the files listed in an item's "viewer_files" (the models,
textures and clips a live 3D viewer committed in that item's folder loads; staged at their own paths, unconverted). Nothing else of the bible goes up: the character, rules,
art and prompt pages stay local, so no reward-look prompt, reward rule or private page is ever on the public site.

Text comes from HEAD. Media come from this disk, each checked against HEAD's tools/assets/assets.lock.json, like the
game's assets; a file that is not in the lock file, is missing here or differs is left out with a warning (run
`python3 tools/bible/pages.py push` and commit). Big PNG and JPEG files go up as WebP at full size (cached by
sha256 in the git folder), and the staged review.json and entry.json point at the WebP copy. Media on a private or
reward path are left out of the staged JSON, whatever the item says.

Answers: on the public site Send opens a prefilled GitHub issue (label review-feedback); `python3 tools/review.py pull`
imports them (reviews/README.md, "Answering from the public site").
"""
import io
import json
import os
import posixpath
import re
import shutil
import subprocess
import sys
import tarfile
import time

from showcase_dates import write_dates

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
REPO_BLOB = 'https://github.com/fumbleforce/tower-of-words/blob/main/'
REPO_TREE = 'https://github.com/fumbleforce/tower-of-words/tree/main/'
LIST = 'bible/pages-media.json'
BIBLE_FILES = ['bible/index.html', 'bible/app.js', 'bible/app.css', 'bible/live.js', 'bible/work.js', 'bible/showcase-order.js']
MEDIA_RE = re.compile(r'\.(webp|png|jpe?g|gif|avif|mp3|wav|ogg|opus|m4a|mp4|webm)$', re.I)
VIEWER_RE = re.compile(r'\.(glb|webp|json)$', re.I)  # review.json "viewer_files": staged as they are
CONVERT_RE = re.compile(r'\.(png|jpe?g)$', re.I)
CONVERT_MIN = 200 * 1024  # smaller PNG/JPEG files go up as they are
# Never on the public site: the private folder, any private/ folder, anything reward, his own manifest.
DENY_RE = re.compile(r'(^|/)island/private(/|$)|(^|/)private/|reward|manifest\.user\.json', re.I)
# Media also left out of a public page when the name says private (a settings tab screenshot of private mode).
DENY_MEDIA_RE = re.compile(r'private|reward|skimpy|nsfw', re.I)

sys.path.insert(0, os.path.join(ROOT, 'tools', 'assets'))


def git(*args, binary=False):
    r = subprocess.run(['git', *args], cwd=ROOT, capture_output=True, check=True)
    return r.stdout if binary else r.stdout.decode()


def ancestors(p):
    """'a/b/c.md' -> ['a/b', 'a']."""
    out = []
    while '/' in p:
        p = p.rsplit('/', 1)[0]
        out.append(p)
    return out


def denied(p):
    return bool(DENY_RE.search(p))


def norm(raw):
    """A path as written in review.json (repo-root relative, maybe with ../ or ?query) -> clean path, or None."""
    p = str(raw).split('#')[0].split('?')[0].strip()
    if not p or re.match(r'^[a-z]+:', p) or p.startswith('/'):
        return None
    p = posixpath.normpath(p)
    return None if p.startswith('..') or p == '.' else p


# ------------------------------------------------------------------ which media the items show
def media_fields(item):
    """(container, key, index) for every image or audio path in a review.json or entry.json. index is None for a
    plain field, else the position in a list of paths."""
    out = []
    for m in item.get('media') or []:
        for k in ('image', 'audio'):
            if isinstance(m.get(k), str):
                out.append((m, k, None))
    for o in item.get('options') or []:
        for k in ('image', 'audio'):
            if isinstance(o.get(k), str):
                out.append((o, k, None))
        for i, x in enumerate(o.get('images') or []):
            if isinstance(x, str):
                out.append((o, 'images', i))
    for im in list(item.get('images') or []) + [im for s in item.get('sections') or [] for im in s.get('images') or []]:
        if isinstance(im.get('image'), str):
            out.append((im, 'image', None))
    return out


def item_files(base):
    """[(folder, id, file name)] for the review items and showcase entries in a tree rooted at base."""
    out = []
    for folder, name in (('reviews', 'review.json'), ('showcase', 'entry.json')):
        d = os.path.join(base, folder)
        for rid in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            if os.path.isfile(os.path.join(d, rid, name)):
                out.append((folder, rid, name))
    return out


def referenced(base):
    """Every media path the items under base show, not denied: {path: [item, ...]}."""
    refs = {}
    for folder, rid, name in item_files(base):
        try:
            item = json.load(open(os.path.join(base, folder, rid, name), encoding='utf-8'))
        except ValueError:
            continue
        for c, k, i in media_fields(item):
            p = norm(c[k][i] if i is not None else c[k])
            if p and MEDIA_RE.search(p) and not denied(p) and not DENY_MEDIA_RE.search(p):
                refs.setdefault(p, []).append(f'{folder}/{rid}')
        for ln in item.get('links') or []:  # a link straight to a picture or a clip
            p = norm(ln.get('href', ''))
            if p and MEDIA_RE.search(p) and not denied(p) and not DENY_MEDIA_RE.search(p):
                refs.setdefault(p, []).append(f'{folder}/{rid}')
        # the files a live 3D viewer committed in the item's folder loads (models, textures, clips), at their paths
        for raw in item.get('viewer_files') or []:
            p = norm(raw)
            if p and VIEWER_RE.search(p) and not denied(p) and not DENY_MEDIA_RE.search(p):
                refs.setdefault(p, []).append(f'{folder}/{rid}')
    return refs


# ------------------------------------------------------------------ media list for tools/assets/sync.py
def cmd_media():
    refs = referenced(ROOT)
    have = sorted(p for p in refs if os.path.isfile(os.path.join(ROOT, p)))
    missing = sorted(set(refs) - set(have))
    data = {'about': 'Images and audio the public bible\'s Review and Showcase show (tools/bible/pages.py media writes '
                     'this; tools/assets/sync.py pushes every file listed). Do not edit by hand.',
            'data': have}
    with open(os.path.join(ROOT, LIST), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=0)
        f.write('\n')
    print(f'{LIST}: {len(have)} files' + (f'; {len(missing)} named by an item but not on this disk' if missing else ''))
    for p in missing[:10]:
        print(f'  not here: {p} ({", ".join(refs[p][:3])})')


def cmd_push():
    cmd_media()
    subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'assets', 'sync.py'), 'push'], cwd=ROOT, check=True)
    print(f'Now commit {LIST} and tools/assets/assets.lock.json.')


# ------------------------------------------------------------------ staging
def cache_dir():
    d = git('rev-parse', '--path-format=absolute', '--git-common-dir').strip()
    d = os.path.join(d, 'pages-cache')
    os.makedirs(d, exist_ok=True)
    return d


def webp_copy(src, sha, cache):
    """A full-size WebP of a PNG/JPEG, cached by the source's sha256; None when WebP would not help."""
    out = os.path.join(cache, sha + '.webp')
    if os.path.exists(out):
        return out
    skip = out + '.skip'
    if os.path.exists(skip):
        return None
    from PIL import Image
    try:
        im = Image.open(src)
        if max(im.size) > 16000:
            raise ValueError('too large for WebP')
        if im.mode not in ('RGB', 'RGBA'):
            im = im.convert('RGBA' if 'A' in im.getbands() or im.mode == 'P' else 'RGB')
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=88, method=4)
    except Exception:
        open(skip, 'w').close()
        return None
    if buf.tell() >= os.path.getsize(src) * 0.8:
        open(skip, 'w').close()
        return None
    with open(out + '.tmp', 'wb') as f:
        f.write(buf.getvalue())
    os.replace(out + '.tmp', out)
    return out


def cmd_stage(site):
    import sync  # tools/assets/sync.py: the sha cache shared with push and pull
    t0 = time.time()
    lock = json.loads(git('show', 'HEAD:tools/assets/assets.lock.json'))['files']
    # 1. text from HEAD: the bible's remote files and everything committed under reviews/ and showcase/
    tar = git('archive', '--format=tar', 'HEAD', '--', *BIBLE_FILES, 'reviews', 'showcase', binary=True)
    with tarfile.open(fileobj=io.BytesIO(tar)) as t:
        t.extractall(site, filter='data')
    write_dates(os.path.join(site, 'bible', 'showcase-dates.json'))
    idx = os.path.join(site, 'bible', 'index.html')
    html = open(idx, encoding='utf-8').read()
    html = html.replace("<script>window.BIBLE_ROOT = '../';", "<script>window.BIBLE_REMOTE = true; window.BIBLE_ROOT = '../';", 1)
    if 'BIBLE_REMOTE' not in html:
        sys.exit('bible pages: bible/index.html no longer has the BIBLE_ROOT line to mark remote mode')
    open(idx, 'w', encoding='utf-8').write(html)

    # 2. the media every item shows, sha-checked against HEAD's lock file; big PNG/JPEG as WebP
    refs = referenced(site)
    have = sync.local_state(sorted(p for p in refs if p in lock), cache := sync.load_cache())
    sync.save_cache(cache)
    wcache = cache_dir()
    staged, left = {}, {}  # staged: path -> path on the site
    for p in sorted(refs):
        if p not in lock:
            left[p] = 'not pushed'
            continue
        if p not in have:
            left[p] = 'missing here'
            continue
        if have[p][1] != lock[p]['sha256']:
            left[p] = 'differs from the lock file'
            continue
        src, dest = os.path.join(ROOT, p), p
        if os.path.exists(os.path.join(site, p)):  # the game's own asset, already on the site from the same lock file
            staged[p] = p
            continue
        if CONVERT_RE.search(p) and have[p][0] >= CONVERT_MIN:
            w = webp_copy(src, have[p][1], wcache)
            if w:
                src, dest = w, p + '.webp'
        os.makedirs(os.path.dirname(os.path.join(site, dest)), exist_ok=True)
        shutil.copyfile(src, os.path.join(site, dest))
        staged[p] = dest

    # 3. point the staged items at what went up; drop media that did not; links outside the site go to GitHub
    committed = set(git('ls-files', '-z').split('\0'))
    committed_dirs = {d for f in committed for d in ancestors(f)}

    def on_github(p, line=None):
        """The file on GitHub, or the nearest committed folder above it (and False) when it isn't committed."""
        if p in committed:
            return REPO_BLOB + p + (f'#L{line}' if line else ''), True
        if p in committed_dirs:
            return REPO_TREE + p, True
        return REPO_TREE + next((d for d in ancestors(p) if d in committed_dirs), ''), False

    def relink(ln, p, line=None):
        ln['href'], ok = on_github(p, line)
        if not ok:
            ln['label'] = f"{ln.get('label', p)} (only on the local bible)"

    for folder, rid, name in item_files(site):
        path = os.path.join(site, folder, rid, name)
        try:
            item = json.load(open(path, encoding='utf-8'))
        except ValueError:
            continue
        drop = []
        for c, k, i in media_fields(item):
            p = norm(c[k][i] if i is not None else c[k])
            if p in staged:
                if i is None:
                    c[k] = staged[p]
                else:
                    c[k][i] = staged[p]
            else:
                drop.append((c, k, i))
        for c, k, i in sorted(drop, key=lambda x: -(x[2] or 0)):
            if i is None:
                c.pop(k, None)
            else:
                c[k].pop(i)
        item['media'] = [m for m in item.get('media') or [] if m.get('image') or m.get('audio')]
        for s in [item] + list(item.get('sections') or []):
            if 'images' in s and all(isinstance(x, dict) for x in s['images']):
                s['images'] = [im for im in s['images'] if im.get('image')]
        for ln in item.get('links') or []:
            h = str(ln.get('href', ''))
            m = re.match(r'^(?:bible/)?#(doc|src)/([^:]+)(?::(\d+))?$', h)
            if m:  # a bible page of a file: the site has only reviews/ and showcase/, the rest is on GitHub
                p = m.group(2)
                if re.match(r'^(reviews|showcase)/', p) and p in committed:
                    ln['href'] = f'#{m.group(1)}/{p}'
                else:
                    relink(ln, p, m.group(3))
            elif h.startswith('bible/#'):
                ln['href'] = h[len('bible/'):]  # #review/..., #showcase/...: on this site
            elif re.match(r'^(https?:|#)', h):
                pass
            elif (p := norm(h) or '') in staged:
                ln['href'] = staged[p]
            elif p and (os.path.isfile(os.path.join(site, p)) or os.path.isfile(os.path.join(site, p, 'index.html'))):
                pass  # on the site already (the game, the creator)
            else:
                relink(ln, p)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(item, f, ensure_ascii=False, indent=1)

    # 4. folder lists (Pages lists no folders) and the remote data file: no characters, rules or prompts
    ids = {}
    for folder, rid, _ in item_files(site):
        ids.setdefault(folder, []).append(rid)
    for folder in ('reviews', 'showcase'):
        links = ''.join(f'<a href="{rid}/">{rid}/</a>\n' for rid in ids.get(folder, []))
        with open(os.path.join(site, folder, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(f'<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>{folder}</title>\n{links}')
    data = {'generated': time.strftime('%Y-%m-%d %H:%M'), 'remote': True,
            'snapshot': {f'{folder}/': [rid + '/' for rid in ids.get(folder, [])] for folder in ('reviews', 'showcase')}}
    with open(os.path.join(site, 'bible', 'data.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

    size = sum(os.path.getsize(os.path.join(site, d)) for d in staged.values())
    print(f'bible: {len(ids.get("reviews", []))} review items, {len(ids.get("showcase", []))} showcase entries, '
          f'{len(staged)} images and audio ({size / 1e6:.0f} MB, {sum(1 for p, d in staged.items() if p != d)} as WebP), '
          f'{time.time() - t0:.0f} s')
    if left:
        why = {}
        for p, w in left.items():
            why.setdefault(w, []).append(p)
        for w, ps in why.items():
            print(f'bible: WARNING {len(ps)} media {w}, left out: ' + ', '.join(ps[:5]) + (' ...' if len(ps) > 5 else ''))
        print('bible: fix with `python3 tools/bible/pages.py push`, commit bible/pages-media.json and the lock file, deploy again')


def deny(site):
    """Exit 1 if any file in the site is on a private or reward path, or a staged item still shows one."""
    bad = []
    for dp, dns, fns in os.walk(site):
        for n in dns + fns:
            rel = os.path.relpath(os.path.join(dp, n), site).replace(os.sep, '/')
            if denied(rel):
                bad.append(rel)
    for folder, rid, name in item_files(site):
        item = json.load(open(os.path.join(site, folder, rid, name), encoding='utf-8'))
        for c, k, i in media_fields(item):
            v = str(c[k][i] if i is not None else c[k])
            if denied(v) or DENY_MEDIA_RE.search(v):
                bad.append(f'{folder}/{rid}/{name} shows {v}')
    if bad:
        print('\n'.join(f'  {b}' for b in bad[:30]), file=sys.stderr)
        sys.exit(f'deploy: REFUSED: {len(bad)} private or reward paths in the site (tools/bible/pages.py deny)')
    print('deny check: nothing from island/private/, a private/ folder or a reward path in the site')


def main(a):
    if a[:1] == ['stage'] and len(a) == 2:
        cmd_stage(os.path.abspath(a[1]))
    elif a[:1] == ['deny'] and len(a) == 2:
        deny(os.path.abspath(a[1]))
    elif a == ['media']:
        cmd_media()
    elif a == ['push']:
        cmd_push()
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main(sys.argv[1:])
