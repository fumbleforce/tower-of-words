#!/usr/bin/env python3
"""The bible's Review and Showcase on GitHub Pages, so Jørgen can answer from anywhere.

    python3 tools/bible/pages.py stage <site>    add the remote bible to a site folder (game3d/tools/deploy-pages.sh)
    python3 tools/bible/pages.py deny <site>     only the deny check: exit 1 if anything private is in <site>
    python3 tools/bible/pages.py media           write bible/pages-media.json, the media list tools/assets/sync.py pushes
    python3 tools/bible/pages.py push            media, then tools/assets/sync.py push; commit the list and the lock file
    python3 tools/bible/pages.py register        the commit hook's step (tools/check/showcase-media.mjs): see cmd_register

The site gets bible/ (index, app.js, live.js, work.js, app.css) in remote mode and every committed file under reviews/
and showcase/: the text of every item, with Jørgen's feedback. Pictures, audio, 3D models and live viewers go up only for
open Review items (status "open") and for the newest Showcase entries, as many as SHOWCASE_PICTURES, in the order the
bible shows them (bible/showcase-order.js). Any other item keeps its text, loses its pictures and gets pictures_local,
so its page says its pictures are on the local server. A picture that is not in the asset store stays off the site, and
its item gets the same note. Those files stay on disk, and the local review server still serves them. Nothing else of the bible goes up: the character, rules, art and prompt pages stay local, so no
reward-look prompt, reward rule or private page is ever on the public site.

Text comes from HEAD. Media come from this disk, each checked against HEAD's tools/assets/assets.lock.json, like the
game's assets; a file that is not in the lock file, is missing here or differs is left out with a warning (run
`python3 tools/bible/pages.py push` and commit). Big PNG and JPEG files go up as WebP, 1024 px at most (cached by
sha256 in the git folder), and the staged review.json and entry.json point at the WebP copy. Media on a private or
reward path are left out of the staged JSON, whatever the item says.

Answers: on the public site Send opens a prefilled GitHub issue (label review-feedback); `python3 tools/review.py pull`
imports them (reviews/README.md, "Answering from the public site").
"""
import datetime
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

from showcase_dates import showcase_dates, write_dates

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'lib'))
import cachedir  # noqa: E402  (tool state lives under ~/.cache/amakawa, never in .git)
REPO_BLOB = 'https://github.com/fumbleforce/tower-of-words/blob/main/'
REPO_TREE = 'https://github.com/fumbleforce/tower-of-words/tree/main/'
LIST = 'bible/pages-media.json'
BIBLE_FILES = ['bible/index.html', 'bible/app.js', 'bible/app.css', 'bible/live.js', 'bible/work.js', 'bible/showcase-order.js']
MEDIA_RE = re.compile(r'\.(webp|png|jpe?g|gif|avif|mp3|wav|ogg|opus|m4a|mp4|webm)$', re.I)
VIEWER_RE = re.compile(r'\.(glb|webp|json)$', re.I)  # review.json "viewer_files": staged as they are
CONVERT_RE = re.compile(r'\.(png|jpe?g|webp)$', re.I)
CONVERT_MIN = 60 * 1024  # smaller images go up as they are
# GitHub rejects a push over 2 GB and asks Pages sites to stay near 1 GB, and the full-size originals are 5 GB (R2 is not
# publicly readable). So the public bible shows images at most SITE_MAX px on the long side, as WebP.
SITE_MAX, SITE_QUALITY = 1024, 72
# Never on the public site: the private folder, any private/ folder, anything reward, his own manifest.
DENY_RE = re.compile(r'(^|/)island/private(/|$)|(^|/)private/|reward|manifest\.user\.json', re.I)
# Media also left out of a public page when the name says private (a settings tab screenshot of private mode).
DENY_MEDIA_RE = re.compile(r'private|reward|skimpy|nsfw', re.I)
# Pictures go up for open Review items and for this many of the newest Showcase entries.
SHOWCASE_PICTURES = 20
# What an item that is not published keeps: its text and data. Its pictures, models, audio and live viewers (html, js) go.
TEXT_RE = re.compile(r'\.(json|md|txt|log)$', re.I)

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


def read_item(base, folder, rid, name):
    """The item's JSON, or None when it cannot be read."""
    try:
        with open(os.path.join(base, folder, rid, name), encoding='utf-8') as f:
            return json.load(f)
    except ValueError:
        return None


# ------------------------------------------------------------------ which items publish pictures
def stamp(value):
    """A date or ISO 8601 time as milliseconds since 1970, read the way the bible reads it (Date.parse); 0 for none."""
    try:
        t = datetime.datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    except (TypeError, ValueError):
        return 0
    if t.tzinfo is None:
        t = t.replace(tzinfo=datetime.timezone.utc)
    return int(t.timestamp() * 1000)


def showcase_time(entry, rid, dates):
    """The time the bible sorts a Showcase entry by (bible/showcase-order.js): the later of its updated time and its
    commit time, else its date."""
    return max(stamp(entry.get('updated')), stamp(dates.get(rid))) or stamp(entry.get('date'))


def published(base, dates):
    """(folder, id) of the items whose pictures go to the public site: the open Review items, and the newest Showcase
    entries. dates is the bible's showcase-dates.json."""
    out, entries = set(), []
    for folder, rid, name in item_files(base):
        item = read_item(base, folder, rid, name)
        if item is None:
            continue
        if folder == 'reviews':
            if (item.get('status') or 'open') == 'open':
                out.add((folder, rid))
        else:
            entries.append((showcase_time(item, rid, dates), rid))
    entries.sort(key=lambda e: (-e[0], e[1]))
    out.update(('showcase', rid) for _, rid in entries[:SHOWCASE_PICTURES])
    return out


def strip_pictures(item):
    """Take every picture, audio clip and viewer file out of an item and keep its text. Returns whether it had any."""
    had = bool(media_fields(item) or item.get('viewer_files'))
    item.pop('media', None)
    item.pop('viewer_files', None)
    for o in item.get('options') or []:
        for k in ('image', 'audio', 'images'):
            o.pop(k, None)
    for s in [item] + list(item.get('sections') or []):
        s.pop('images', None)
    return had


def keep_pictures(item, staged):
    """Point a published item's pictures at the staged copies. The ones that did not go up are dropped, and this
    returns whether any did (they stay on the local server)."""
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
    return bool(drop)


def drop_unpublished(site, pub, kept):
    """Delete the files of the items that are not published, except their text and data, and any file a published item
    shows (kept). Returns what it deleted, as paths in the site."""
    gone = set()
    for folder, rid, _ in item_files(site):
        if (folder, rid) in pub:
            continue
        for dp, _dns, fns in os.walk(os.path.join(site, folder, rid)):
            for fn in fns:
                rel = os.path.relpath(os.path.join(dp, fn), site).replace(os.sep, '/')
                if rel in kept or TEXT_RE.search(fn):
                    continue
                os.remove(os.path.join(dp, fn))
                gone.add(rel)
    return gone


# ------------------------------------------------------------------ media list for tools/assets/sync.py
def referenced(base, pub):
    """Every media path the published items under base show, not denied: {path: [item, ...]}."""
    refs = {}
    for folder, rid, name in item_files(base):
        if (folder, rid) not in pub:
            continue
        item = read_item(base, folder, rid, name)
        if item is None:
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


def write_list(paths):
    """Write the media list (LIST) with these paths, sorted."""
    data = {'about': 'Images and audio the public bible shows: open Review items and the newest Showcase entries '
                     '(tools/bible/pages.py media writes this; tools/assets/sync.py pushes every file listed). Do not edit by hand.',
            'data': sorted(paths)}
    with open(os.path.join(ROOT, LIST), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=0)
        f.write('\n')


def cmd_media():
    pub = published(ROOT, showcase_dates(ROOT))
    refs = referenced(ROOT, pub)
    have = sorted(p for p in refs if os.path.isfile(os.path.join(ROOT, p)))
    missing = sorted(set(refs) - set(have))
    write_list(have)
    print(f'{LIST}: {len(have)} files' + (f'; {len(missing)} named by an item but not on this disk' if missing else ''))
    for p in missing[:10]:
        print(f'  not here: {p} ({", ".join(refs[p][:3])})')


def cmd_push():
    cmd_media()
    subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'assets', 'sync.py'), 'push'], cwd=ROOT, check=True)
    print(f'Now commit {LIST} and tools/assets/assets.lock.json.')


# ------------------------------------------------------------------ registered on commit (tools/check/showcase-media.mjs)
def main_checkout():
    """The main checkout: the folder that holds the shared .git. A worktree copies the pictures it lacks from there."""
    return os.path.dirname(git('rev-parse', '--path-format=absolute', '--git-common-dir').strip())


def touched_items():
    """The Showcase entries and Review items the staged commit adds, changes or removes, as 'showcase/<id>'. Only their
    entry.json or review.json counts: feedback and answers change no picture and no publication time."""
    out = set()
    for name in git('diff', '--cached', '--name-only', '-z').split('\0'):
        parts = name.split('/')
        if len(parts) == 3 and parts[0] in ('showcase', 'reviews') and parts[2] in ('entry.json', 'review.json'):
            out.add(f'{parts[0]}/{parts[1]}')
    return out


def commit_dates(touched):
    """The publication times as the commit leaves them: HEAD's, with each Showcase entry the commit changes at now (so
    a new entry is the newest, as it will be once committed)."""
    dates = showcase_dates(ROOT)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    for item in touched:
        if item.startswith('showcase/'):
            dates[item.split('/', 1)[1]] = now
    return dates


def plan_copies(refs, here, in_main, lock, touched):
    """What the hook does about the published pictures this disk lacks. refs: {path: [item, ...]}; here and in_main: the
    paths on this disk and in the main checkout; lock: the lock file's entries; touched: the items the commit changes.
    Returns (copy, absent): copy = paths to copy from the main checkout; absent = pictures of touched items that are in
    neither the lock file nor a checkout, so the entry would show without them."""
    copy = sorted(p for p in refs if p not in here and p in in_main)
    absent = sorted(p for p, items in refs.items()
                    if p not in here and p not in in_main and p not in lock and touched.intersection(items))
    return copy, absent


def plan_push(lock, shas):
    """The pictures to upload and lock: those on this disk that the lock file does not hold with this sha256.
    shas: {path: sha256} for the files on this disk."""
    return sorted(p for p, sha in shas.items() if p not in lock or lock[p]['sha256'] != sha)


def cmd_register():
    """The commit hook's step for a commit that adds or changes a Showcase entry or a Review item, or this file. The bible
    shows the pictures of the open Review items and the newest Showcase entries, as the commit will leave them. Here:
    copy the published pictures this disk lacks from the main checkout (a copy, so either checkout can change its own),
    push the ones the asset store does not hold (sync.py push --only), write the list and stage it with the lock file.
    Refused when a picture of an item the commit adds or changes is in no checkout and not in the lock file: the entry
    would show without it. Nothing is staged then."""
    import sync  # tools/assets/sync.py: the lock file, the sha cache and the R2 upload
    touched = touched_items()
    pub = published(ROOT, commit_dates(touched))
    refs = referenced(ROOT, pub)
    main = main_checkout()
    here = {p for p in refs if os.path.isfile(os.path.join(ROOT, p))}
    in_main = {p for p in refs if p not in here and os.path.isfile(os.path.join(main, p))}
    lock = sync.load_lock()
    copy, absent = plan_copies(refs, here, in_main, lock, touched)
    if absent:
        sys.exit(f'bible pictures: {len(absent)} picture(s) of the items this commit changes are in neither the asset store '
                 f'(tools/assets/assets.lock.json) nor a checkout, so the entry would show without them: '
                 + ', '.join(absent[:5]) + (' ...' if len(absent) > 5 else '')
                 + '. Put the captures in this checkout (game3d/shots/<job>/), then commit again.')
    for p in copy:
        dest = os.path.join(ROOT, p)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copyfile(os.path.join(main, p), dest)
    cache = sync.load_cache()
    have = sync.local_state(sorted(here | set(copy)), cache)
    sync.save_cache(cache)
    push = plan_push(lock, {p: v[1] for p, v in have.items()})
    write_list(list(have))
    if push:
        subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'assets', 'sync.py'), 'push', '--only', *push],
                       cwd=ROOT, check=True)
    subprocess.run(['git', 'add', '--', LIST, sync.LOCK_REL], cwd=ROOT, check=True)
    pushed = sum(have[p][0] for p in push)
    print(f'bible pictures: {len(have)} on this disk for {len(pub)} published items; copied {len(copy)} from the main checkout; '
          + (f'pushed {len(push)} new or changed ({pushed / 2**20:.1f} MB)' if push else 'nothing new to push')
          + f'; {LIST} and the lock file are staged')
    unlisted = sorted(p for p in refs if p not in here and p not in in_main and p not in lock)
    if unlisted:  # not this commit's items, so not refused: their pages show without these pictures until they exist
        print(f'bible pictures: {len(unlisted)} published picture(s) are in neither the lock file nor a checkout: '
              + ', '.join(unlisted[:5]) + (' ...' if len(unlisted) > 5 else ''))


# ------------------------------------------------------------------ staging
def cache_dir():
    return cachedir.cache_dir('pages-cache')


def webp_copy(src, sha, cache):
    """A WebP of an image at most SITE_MAX px, cached by the source's sha256 and those settings; None when it would not help."""
    out = os.path.join(cache, f'{sha}-{SITE_MAX}-{SITE_QUALITY}.webp')
    if os.path.exists(out):
        return out
    skip = out + '.skip'
    if os.path.exists(skip):
        return None
    from PIL import Image
    try:
        im = Image.open(src)
        if getattr(im, 'is_animated', False):
            raise ValueError('animated: kept as it is')
        im.thumbnail((SITE_MAX, SITE_MAX))
        if im.mode not in ('RGB', 'RGBA'):
            im = im.convert('RGBA' if 'A' in im.getbands() or im.mode == 'P' else 'RGB')
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=SITE_QUALITY, method=4)
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
    dates = json.load(open(os.path.join(site, 'bible', 'showcase-dates.json'), encoding='utf-8'))  # the bible's own order
    idx = os.path.join(site, 'bible', 'index.html')
    html = open(idx, encoding='utf-8').read()
    html = html.replace("<script>window.BIBLE_ROOT = '../';", "<script>window.BIBLE_REMOTE = true; window.BIBLE_ROOT = '../';", 1)
    if 'BIBLE_REMOTE' not in html:
        sys.exit('bible pages: bible/index.html no longer has the BIBLE_ROOT line to mark remote mode')
    open(idx, 'w', encoding='utf-8').write(html)

    # 2. the pictures of the published items, sha-checked against HEAD's lock file; images over 60 KB as WebP at most 1024 px
    pub = published(site, dates)
    refs = referenced(site, pub)
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

    # 3. the items that are not published keep their text: their pictures, models and live viewers are removed from the
    # site, except a file a published item shows
    gone = drop_unpublished(site, pub, set(staged.values()))

    # 4. point the staged items at what went up; drop media that did not; links outside the site go to GitHub
    committed = set(git('ls-files', '-z').split('\0'))
    committed_dirs = {d for f in committed for d in ancestors(f)}

    def on_github(p, line=None):
        """The file on GitHub, or the nearest committed folder above it (and False) when it isn't committed."""
        if p in committed:
            return REPO_BLOB + p + (f'#L{line}' if line else ''), True
        if p in committed_dirs:
            return REPO_TREE + p, True
        return REPO_TREE + next((d for d in ancestors(p) if d in committed_dirs), ''), False

    def relink(ln, p, line=None, local=False):
        ln['href'], ok = on_github(p, line)
        if not ok or local:
            ln['label'] = f"{ln.get('label', p)} (only on the local bible)"

    noted = []  # the items whose pictures stay on the local server
    for folder, rid, name in item_files(site):
        path = os.path.join(site, folder, rid, name)
        try:
            item = json.load(open(path, encoding='utf-8'))
        except ValueError:
            continue
        for o in item.get('options') or []:
            o.pop('downloads', None)  # download links point at local files the site never carries
        if (folder, rid) in pub:
            local = keep_pictures(item, staged)
        else:
            local = strip_pictures(item) or any(g.startswith(f'{folder}/{rid}/') for g in gone)
        if local:
            item['pictures_local'] = True
            noted.append(f'{folder}/{rid}')
        else:
            item.pop('pictures_local', None)
        for ln in item.get('links') or []:
            h = str(ln.get('href', ''))
            m = re.match(r'^(?:bible/)?#(doc|src)/([^:]+)(?::(\d+))?$', h)
            if m:  # a bible page of a file: the site has only reviews/ and showcase/, the rest is on GitHub
                p = m.group(2)
                if re.match(r'^(reviews|showcase)/', p) and p in committed and p not in gone:
                    ln['href'] = f'#{m.group(1)}/{p}'
                else:
                    relink(ln, p, m.group(3), local=p in gone)
            elif h.startswith('bible/#'):
                ln['href'] = h[len('bible/'):]  # #review/..., #showcase/...: on this site
            elif re.match(r'^(https?:|#)', h):
                pass
            elif (p := norm(h) or '') in staged:
                ln['href'] = staged[p]
            elif p and p not in gone and (os.path.isfile(os.path.join(site, p)) or os.path.isfile(os.path.join(site, p, 'index.html'))):
                pass  # on the site already (the game, the creator)
            else:
                relink(ln, p, local=p in gone)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(item, f, ensure_ascii=False, indent=1)

    # 5. folder lists (Pages lists no folders) and the remote data file: no characters, rules or prompts
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

    report(site, pub, staged, refs, left, noted, t0)


def report(site, pub, staged, refs, left, noted, t0):
    """Print what the public bible shows: the Review items, the Showcase entries with pictures, and what was left out."""
    reviews = [rid for folder, rid, _ in item_files(site) if folder == 'reviews']
    shows = [rid for folder, rid, _ in item_files(site) if folder == 'showcase']
    shown = [rid for rid in shows if ('showcase', rid) in pub]
    with_pictures = [rid for rid in shown if any(f'showcase/{rid}' in refs[p] for p in staged)]

    def size(kind):  # the staged pictures that published items of one folder show
        return sum(os.path.getsize(os.path.join(site, staged[p])) for p in staged if any(r.startswith(kind + '/') for r in refs[p]))

    print(f'bible: {len(reviews)} review items, {sum(1 for rid in reviews if ("reviews", rid) in pub)} open, '
          f'their pictures {size("reviews") / 1e6:.1f} MB')
    print(f'bible: {len(shows)} showcase entries: {len(shown)} published, {len(with_pictures)} of them with pictures '
          f'({size("showcase") / 1e6:.1f} MB), {len(shows) - len(shown)} text only; '
          f'{len(noted)} items say their pictures are on the local server')
    print(f'bible: {len(staged)} pictures and audio, {sum(1 for p, d in staged.items() if p != d)} as WebP, '
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
        if item.get('pictures_local') and (media_fields(item) or item.get('viewer_files')):
            bad.append(f'{folder}/{rid}/{name} is marked pictures_local but still shows pictures')
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
    elif a == ['register']:
        cmd_register()
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main(sys.argv[1:])
